import { promises as fs } from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const IMAGE_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/jpg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);

const SAME_SITE_MEDIA_HOSTS = new Set(['nolimitflix.com', 'www.nolimitflix.com']);
const MAX_IMAGE_BYTES = Number(process.env.POSTER_BACKFILL_MAX_BYTES || 10 * 1024 * 1024);

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const includeLocked = args.has('--include-locked');
const repairArchiveBundlePosters = args.has('--repair-archive-bundle-posters');
const limitArg = process.argv.slice(2).find((arg) => arg.startsWith('--limit='));
const concurrencyArg = process.argv.slice(2).find((arg) => arg.startsWith('--concurrency='));
const limit = Math.max(Number(limitArg?.split('=')[1]) || 1000, 1);
const concurrency = Math.min(Math.max(Number(concurrencyArg?.split('=')[1]) || 4, 1), 12);
const archiveMetadataCache = new Map();

const getMediaRoot = () => process.env.MEDIA_ROOT?.trim() || '/app/media';

const getMediaBaseUrl = () => {
  const configured = (process.env.NEXT_PUBLIC_MEDIA_URL || process.env.MEDIA_BASE_URL || '/media').replace(/\/+$/, '');
  if (/^https?:\/\//i.test(configured)) {
    try {
      const url = new URL(configured);
      if (SAME_SITE_MEDIA_HOSTS.has(url.hostname) && url.pathname.startsWith('/media')) {
        return url.pathname.replace(/\/+$/, '') || '/media';
      }
    } catch {
      return configured;
    }
  }
  return configured || '/media';
};

const normalizeMediaPath = (value) => {
  const normalized = String(value || '')
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')
    .trim();

  const resolved = [];
  for (const segment of normalized.split('/').filter(Boolean)) {
    if (segment === '.') continue;
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }
  return resolved.join('/');
};

const safeFileName = (value, fallback = 'poster') => {
  const base = path.basename(String(value || fallback).trim()) || fallback;
  return base
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9._-]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || fallback;
};

const isLocalMediaUrl = (value) => {
  if (!value) return false;
  if (value.startsWith('/media/')) return true;

  try {
    const url = new URL(value);
    return SAME_SITE_MEDIA_HOSTS.has(url.hostname) && url.pathname.startsWith('/media/');
  } catch {
    return false;
  }
};

const extensionFromUrl = (value) => {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    const ext = pathname.match(/\.([a-z0-9]+)$/)?.[1];
    if (ext === 'jpeg') return 'jpg';
    if (['jpg', 'png', 'webp'].includes(ext)) return ext;
  } catch {
    // Use content type fallback.
  }
  return null;
};

const extensionForResponse = (url, contentType) => {
  const normalizedType = String(contentType || '').split(';')[0].trim().toLowerCase();
  return IMAGE_TYPES.get(normalizedType) || extensionFromUrl(url) || 'jpg';
};

const contentTypeBase = (contentType) => String(contentType || '').split(';')[0].trim().toLowerCase();
const isImageResponse = (response) => IMAGE_TYPES.has(contentTypeBase(response.headers.get('content-type')));
const isHtmlResponse = (response) => contentTypeBase(response.headers.get('content-type')) === 'text/html';

const decodeHtmlEntity = (value) =>
  String(value || '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const getHtmlAttribute = (tag, name) => {
  const match = tag.match(new RegExp(`${name}\\\\s*=\\\\s*([\"'])(.*?)\\\\1`, 'i'));
  return match ? decodeHtmlEntity(match[2]) : null;
};

const resolveHtmlImageUrl = (html, pageUrl) => {
  const metaTags = html.match(/<meta\\b[^>]*>/gi) || [];
  for (const tag of metaTags) {
    const key = getHtmlAttribute(tag, 'property') || getHtmlAttribute(tag, 'name');
    if (!key || !['og:image', 'og:image:url', 'twitter:image', 'twitter:image:src'].includes(key.toLowerCase())) {
      continue;
    }
    const content = getHtmlAttribute(tag, 'content');
    if (content) {
      return new URL(content, pageUrl).toString();
    }
  }

  const linkTags = html.match(/<link\\b[^>]*>/gi) || [];
  for (const tag of linkTags) {
    const rel = getHtmlAttribute(tag, 'rel');
    if (!rel || !rel.toLowerCase().split(/\\s+/).includes('image_src')) {
      continue;
    }
    const href = getHtmlAttribute(tag, 'href');
    if (href) {
      return new URL(href, pageUrl).toString();
    }
  }

  return null;
};

const archiveIdentifierBase = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  return raw.split(':')[0] || null;
};

const parseArchiveIdentifier = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const separatorIndex = raw.indexOf(':');
  if (separatorIndex === -1) {
    return { identifier: raw, fileName: null, isBundleItem: false };
  }
  return {
    identifier: raw.slice(0, separatorIndex),
    fileName: raw.slice(separatorIndex + 1),
    isBundleItem: true,
  };
};

const buildArchiveDownloadUrl = (identifier, fileName) => {
  let safeName = fileName;
  try {
    safeName = decodeURIComponent(fileName);
  } catch {
    safeName = fileName;
  }
  return `https://archive.org/download/${identifier}/${encodeURIComponent(safeName)}`;
};

const fetchArchiveMetadata = async (identifier) => {
  if (archiveMetadataCache.has(identifier)) return archiveMetadataCache.get(identifier);

  const promise = fetch(`https://archive.org/metadata/${encodeURIComponent(identifier)}`, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'NoLimitFlix-PosterBackfill/1.0',
    },
    signal: AbortSignal.timeout(15000),
  }).then(async (response) => {
    if (!response.ok) return null;
    return response.json();
  }).catch(() => null);

  archiveMetadataCache.set(identifier, promise);
  return promise;
};

const findThumbnailForArchiveFile = (files, identifier, fileName) => {
  if (!Array.isArray(files) || !fileName) return null;
  const base = String(fileName).replace(/\.[a-z0-9]+$/i, '').toLowerCase();
  if (!base) return null;

  const imageCandidates = files.filter((file) => {
    const name = String(file?.name || '').toLowerCase();
    if (!name) return false;
    if (!name.includes(base)) return false;
    return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png') || name.endsWith('.webp');
  });

  const best = imageCandidates[0];
  if (!best?.name) return null;
  return buildArchiveDownloadUrl(identifier, best.name);
};

const resolveArchiveFilePosterUrl = async (video) => {
  const parts = parseArchiveIdentifier(video.archiveIdentifier);
  if (!parts?.isBundleItem || !parts.identifier || !parts.fileName) return null;

  const metadata = await fetchArchiveMetadata(parts.identifier);
  return findThumbnailForArchiveFile(metadata?.files, parts.identifier, parts.fileName);
};

const isArchiveCollectionPosterUrl = (video, value) => {
  const parts = parseArchiveIdentifier(video.archiveIdentifier);
  if (!parts?.isBundleItem || !parts.identifier || !value) return false;

  try {
    const url = new URL(value);
    return url.hostname === 'archive.org'
      && url.pathname === `/services/img/${parts.identifier}`;
  } catch {
    return false;
  }
};

const fetchPosterCandidate = async (url) => {
  const response = await fetch(url, {
    headers: {
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      'User-Agent': 'NoLimitFlix-PosterBackfill/1.0',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  return response;
};

const resolvePosterResponse = async (video, sourceUrl) => {
  const tried = new Set();
  let unsafeCollectionImage = null;

  const tryUrl = async (candidateUrl) => {
    if (!candidateUrl || tried.has(candidateUrl)) return null;
    tried.add(candidateUrl);

    const response = await fetchPosterCandidate(candidateUrl);
    if (isImageResponse(response)) {
      if (isArchiveCollectionPosterUrl(video, candidateUrl)) {
        unsafeCollectionImage = { response, sourceUrl: candidateUrl };
        return null;
      }
      return { response, sourceUrl: candidateUrl };
    }

    if (isHtmlResponse(response)) {
      const html = await response.text();
      const htmlImageUrl = resolveHtmlImageUrl(html, response.url || candidateUrl);
      if (htmlImageUrl && !tried.has(htmlImageUrl)) {
        return tryUrl(htmlImageUrl);
      }
    }

    return {
      response,
      sourceUrl: candidateUrl,
    };
  };

  const first = await tryUrl(sourceUrl);
  if (first && isImageResponse(first.response)) return first;

  const archiveFilePosterUrl = await resolveArchiveFilePosterUrl(video);
  const archiveFilePoster = await tryUrl(archiveFilePosterUrl);
  if (archiveFilePoster && isImageResponse(archiveFilePoster.response)) return archiveFilePoster;

  const archiveParts = parseArchiveIdentifier(video.archiveIdentifier);
  const archiveBase = archiveIdentifierBase(video.archiveIdentifier);
  if (archiveBase && !archiveParts?.isBundleItem) {
    const archiveImage = await tryUrl(`https://archive.org/services/img/${encodeURIComponent(archiveBase)}`);
    if (archiveImage && isImageResponse(archiveImage.response)) return archiveImage;
  }

  if (first) return first;
  if (unsafeCollectionImage) {
    throw new Error(`Refusing collection-level archive poster for bundle item: ${unsafeCollectionImage.sourceUrl}`);
  }
  throw new Error('No poster candidate URL found');
};

const writePoster = async (video, sourceUrl, response) => {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image is larger than ${MAX_IMAGE_BYTES} bytes`);
  }

  const contentType = response.headers.get('content-type') || '';
  const normalizedType = contentTypeBase(contentType);
  if (normalizedType && !IMAGE_TYPES.has(normalizedType)) {
    throw new Error(`Unexpected content type: ${contentType}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error(`Image is larger than ${MAX_IMAGE_BYTES} bytes`);
  }

  const extension = extensionForResponse(sourceUrl, contentType);
  const fileBase = safeFileName(video.title || video.id);
  const relativePath = normalizeMediaPath(`thumbnails/imported/${video.id}/${fileBase}.${extension}`);
  const mediaRoot = path.resolve(getMediaRoot());
  const absolutePath = path.resolve(mediaRoot, relativePath);

  if (absolutePath !== mediaRoot && !absolutePath.startsWith(`${mediaRoot}${path.sep}`)) {
    throw new Error('Resolved poster path escapes MEDIA_ROOT');
  }

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer);

  return `${getMediaBaseUrl()}/${relativePath}`;
};

const localizePosterFromSource = async (video, sourceUrl, action = 'video.thumbnail.backfill_localized', extraMetadata = {}) => {
  if (video.thumbnailLocked && !includeLocked) {
    return { status: 'skipped', reason: 'locked' };
  }

  if (dryRun) {
    return { status: 'dry-run', previousThumbnailUrl: video.thumbnailUrl, sourceUrl };
  }

  const previousThumbnailUrl = video.thumbnailUrl;
  const poster = await resolvePosterResponse(video, sourceUrl);
  const nextThumbnailUrl = await writePoster(video, poster.sourceUrl, poster.response);

  await prisma.video.update({
    where: { id: video.id },
    data: {
      thumbnailUrl: nextThumbnailUrl,
      thumbnailSource: 'backfill',
      thumbnailLocked: includeLocked ? video.thumbnailLocked : false,
      thumbnailUpdatedByUserId: null,
      thumbnailUpdatedAt: new Date(),
    },
  });

  await prisma.adminActionLog.create({
    data: {
      actorId: null,
      action,
      entityType: 'Video',
      entityId: video.id,
      videoId: video.id,
      metadata: {
        ...extraMetadata,
        previousThumbnailUrl,
        requestedSourceUrl: sourceUrl,
        nextThumbnailUrl,
        resolvedSourceUrl: poster.sourceUrl,
        sourceProvider: video.sourceProvider || null,
        archiveIdentifier: video.archiveIdentifier || null,
      },
    },
  });

  return { status: 'localized', previousThumbnailUrl, nextThumbnailUrl };
};

const localizePoster = async (video) => {
  const previousThumbnailUrl = video.thumbnailUrl;

  if (!previousThumbnailUrl || isLocalMediaUrl(previousThumbnailUrl)) {
    return { status: 'skipped', reason: 'already local' };
  }

  return localizePosterFromSource(video, previousThumbnailUrl);
};

const getStringMetadataValue = (metadata, key) => {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = metadata[key];
  return typeof value === 'string' ? value : null;
};

const fetchRepairCandidates = async () => {
  const logs = await prisma.adminActionLog.findMany({
    where: {
      action: 'video.thumbnail.backfill_localized',
      videoId: { not: null },
    },
    orderBy: { createdAt: 'desc' },
    take: limit * 8,
    select: {
      id: true,
      videoId: true,
      metadata: true,
      createdAt: true,
      video: {
        select: {
          id: true,
          title: true,
          thumbnailUrl: true,
          thumbnailLocked: true,
          sourceProvider: true,
          archiveIdentifier: true,
        },
      },
    },
  });

  const seen = new Set();
  const candidates = [];
  for (const log of logs) {
    if (!log.videoId || seen.has(log.videoId) || !log.video) continue;
    seen.add(log.videoId);

    const resolvedSourceUrl = getStringMetadataValue(log.metadata, 'resolvedSourceUrl');
    const nextThumbnailUrl = getStringMetadataValue(log.metadata, 'nextThumbnailUrl');
    const previousThumbnailUrl = getStringMetadataValue(log.metadata, 'previousThumbnailUrl');
    if (!resolvedSourceUrl || !previousThumbnailUrl) continue;
    if (!isArchiveCollectionPosterUrl(log.video, resolvedSourceUrl)) continue;
    if (nextThumbnailUrl && log.video.thumbnailUrl !== nextThumbnailUrl) continue;

    candidates.push({
      ...log.video,
      repairSourceUrl: previousThumbnailUrl,
      badResolvedSourceUrl: resolvedSourceUrl,
      badBackfillActionId: log.id,
      badBackfillCreatedAt: log.createdAt,
    });

    if (candidates.length >= limit) break;
  }

  return candidates;
};

const runPool = async (items, worker) => {
  let index = 0;
  const results = [];
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (index < items.length) {
      const current = items[index];
      index += 1;
      results.push(await worker(current));
    }
  });
  await Promise.all(workers);
  return results;
};

const main = async () => {
  const videos = repairArchiveBundlePosters
    ? await fetchRepairCandidates()
    : await prisma.video.findMany({
      where: {
        thumbnailUrl: { startsWith: 'http' },
        ...(includeLocked ? {} : { thumbnailLocked: false }),
      },
      select: {
        id: true,
        title: true,
        thumbnailUrl: true,
        thumbnailLocked: true,
        sourceProvider: true,
        archiveIdentifier: true,
      },
      orderBy: [{ updatedAt: 'asc' }, { createdAt: 'asc' }],
      take: limit,
    });

  const summary = {
    candidates: videos.length,
    localized: 0,
    skipped: 0,
    failed: 0,
    dryRun: 0,
  };

  await runPool(videos, async (video) => {
    try {
      const result = repairArchiveBundlePosters
        ? await localizePosterFromSource(
          video,
          video.repairSourceUrl,
          'video.thumbnail.backfill_repaired',
          {
            badResolvedSourceUrl: video.badResolvedSourceUrl,
            badBackfillActionId: video.badBackfillActionId,
            badBackfillCreatedAt: video.badBackfillCreatedAt?.toISOString?.() || null,
          },
        )
        : await localizePoster(video);
      summary[result.status === 'dry-run' ? 'dryRun' : result.status === 'localized' ? 'localized' : 'skipped'] += 1;
      console.log(`${result.status}: ${video.title} (${video.id})${result.reason ? ` - ${result.reason}` : ''}`);
    } catch (error) {
      summary.failed += 1;
      console.error(`failed: ${video.title} (${video.id}) - ${error.message}`);
    }
  });

  console.log(JSON.stringify(summary, null, 2));
};

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
