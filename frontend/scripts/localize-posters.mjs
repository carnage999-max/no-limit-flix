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
const limitArg = process.argv.slice(2).find((arg) => arg.startsWith('--limit='));
const concurrencyArg = process.argv.slice(2).find((arg) => arg.startsWith('--concurrency='));
const limit = Math.max(Number(limitArg?.split('=')[1]) || 1000, 1);
const concurrency = Math.min(Math.max(Number(concurrencyArg?.split('=')[1]) || 4, 1), 12);

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

const writePoster = async (video, sourceUrl, response) => {
  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    throw new Error(`Image is larger than ${MAX_IMAGE_BYTES} bytes`);
  }

  const contentType = response.headers.get('content-type') || '';
  const normalizedType = contentType.split(';')[0].trim().toLowerCase();
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

const localizePoster = async (video) => {
  const previousThumbnailUrl = video.thumbnailUrl;

  if (!previousThumbnailUrl || isLocalMediaUrl(previousThumbnailUrl)) {
    return { status: 'skipped', reason: 'already local' };
  }

  if (video.thumbnailLocked && !includeLocked) {
    return { status: 'skipped', reason: 'locked' };
  }

  if (dryRun) {
    return { status: 'dry-run', previousThumbnailUrl };
  }

  const response = await fetch(previousThumbnailUrl, {
    headers: {
      Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
      'User-Agent': 'NoLimitFlix-PosterBackfill/1.0',
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!response.ok) {
    throw new Error(`Fetch failed with status ${response.status}`);
  }

  const nextThumbnailUrl = await writePoster(video, previousThumbnailUrl, response);

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
      action: 'video.thumbnail.backfill_localized',
      entityType: 'Video',
      entityId: video.id,
      videoId: video.id,
      metadata: {
        previousThumbnailUrl,
        nextThumbnailUrl,
        sourceProvider: video.sourceProvider || null,
        archiveIdentifier: video.archiveIdentifier || null,
      },
    },
  });

  return { status: 'localized', previousThumbnailUrl, nextThumbnailUrl };
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
  const videos = await prisma.video.findMany({
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
      const result = await localizePoster(video);
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
