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
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const includeLocked = args.has('--include-locked');
const repairArchiveBundlePosters = args.has('--repair-archive-bundle-posters');
const allowArchiveFrameFallback = args.has('--allow-archive-frame-fallback');
const limitArg = process.argv.slice(2).find((arg) => arg.startsWith('--limit='));
const concurrencyArg = process.argv.slice(2).find((arg) => arg.startsWith('--concurrency='));
const limit = Math.max(Number(limitArg?.split('=')[1]) || 1000, 1);
const concurrency = Math.min(Math.max(Number(concurrencyArg?.split('=')[1]) || 4, 1), 12);
const archiveMetadataCache = new Map();

const getTmdbApiKey = () => process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';
const getOmdbApiKey = () => process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '';

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

const parseYear = (value) => {
  if (!value) return null;
  const match = String(value).match(/(19|20)\d{2}/);
  return match ? Number(match[0]) : null;
};

const stripYear = (value) => String(value || '').replace(/\((19|20)\d{2}\)/g, '').replace(/\b(19|20)\d{2}\b/g, '');

const sanitizeSearchTitle = (value) => {
  if (!value) return '';
  let cleaned = String(value);
  cleaned = cleaned.replace(/\.[a-z0-9]+$/i, '');
  cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');
  cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
  cleaned = cleaned.replace(/\b(480|720|1080|2160)p\b/gi, ' ');
  cleaned = cleaned.replace(/\b(x264|x265|h264|h265|hevc|hdrip|webrip|web|dvdrip|bluray|brrip|hd|sd|uhd)\b/gi, ' ');
  cleaned = cleaned.replace(/[_-]+/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();
  return cleaned;
};

const normalizeTitle = (value) => {
  const cleaned = stripYear(value)
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
  return cleaned.replace(/^(the|a|an)\s+/i, '');
};

const yearsMatch = (a, b, tolerance = 1) => {
  if (!a || !b) return true;
  return Math.abs(a - b) <= tolerance;
};

const getCandidateYear = (item) => parseYear(item?.release_date || item?.first_air_date || item?.Year);

const scoreCandidate = (candidate, target, candidateYear, targetYear) => {
  if (!candidate || !target) return 0;
  let score = 0;
  if (candidate === target) score += 5;
  if (candidate.startsWith(target) || target.startsWith(candidate)) score += 3;
  if (candidate.includes(target) || target.includes(candidate)) score += 2;

  if (targetYear && candidateYear) {
    const delta = Math.abs(candidateYear - targetYear);
    if (delta === 0) score += 4;
    else if (delta === 1) score += 2;
    else if (delta <= 3) score += 1;
    else score -= 8;
  }

  return score;
};

const compareCandidates = (a, b, targetYear, preferOlder = false) => {
  if (b.score !== a.score) return b.score - a.score;

  const aYear = getCandidateYear(a.item);
  const bYear = getCandidateYear(b.item);

  if (targetYear) {
    const aDist = aYear ? Math.abs(aYear - targetYear) : Number.POSITIVE_INFINITY;
    const bDist = bYear ? Math.abs(bYear - targetYear) : Number.POSITIVE_INFINITY;
    if (aDist !== bDist) return aDist - bDist;
    if (aYear && bYear && aYear !== bYear) return aYear - bYear;
  } else if (preferOlder && aYear && bYear && aYear !== bYear) {
    return aYear - bYear;
  }

  return 0;
};

const fetchJson = async (url) => {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'NoLimitFlix-PosterBackfill/1.0' },
    signal: AbortSignal.timeout(10000),
  });
  if (!response.ok) return null;
  return response.json();
};

const resolveSearchTitle = (video) => {
  const title = sanitizeSearchTitle(video.title) || video.title;
  if (title) return title;

  const parts = parseArchiveIdentifier(video.archiveIdentifier);
  if (parts?.fileName) return sanitizeSearchTitle(parts.fileName);
  return '';
};

const findOmdbPoster = async (video) => {
  const apiKey = getOmdbApiKey();
  const title = resolveSearchTitle(video);
  if (!apiKey || !title) return null;

  const type = video.type === 'series' ? 'series' : 'movie';
  const year = video.releaseYear ?? parseYear(video.title) ?? parseYear(video.archiveIdentifier);
  const baseParams = new URLSearchParams({
    apikey: apiKey,
    t: title,
    type,
  });
  if (year) baseParams.set('y', String(year));

  let data = await fetchJson(`https://www.omdbapi.com/?${baseParams.toString()}`);
  if (data && data.Response !== 'False' && year) {
    const matchedYear = parseYear(data.Year);
    if (matchedYear && !yearsMatch(matchedYear, year)) data = null;
  }

  if (!data || data.Response === 'False') {
    const searchParams = new URLSearchParams({
      apikey: apiKey,
      s: title,
      type,
    });
    if (year) searchParams.set('y', String(year));

    const searchData = await fetchJson(`https://www.omdbapi.com/?${searchParams.toString()}`);
    const results = searchData?.Search || [];
    if (!results.length) return null;

    const target = normalizeTitle(title);
    const scored = results.map((item) => ({
      item,
      score: scoreCandidate(normalizeTitle(item?.Title), target, parseYear(item?.Year), year),
    }));
    scored.sort((a, b) => compareCandidates(a, b, year, type === 'movie' && !year));

    const best = scored.find((entry) => {
      if (entry.score < 2 || !entry.item?.imdbID) return false;
      const candidateYear = parseYear(entry.item?.Year);
      return !year || !candidateYear || yearsMatch(candidateYear, year);
    });
    if (!best?.item?.imdbID) return null;

    data = await fetchJson(`https://www.omdbapi.com/?${new URLSearchParams({
      apikey: apiKey,
      i: best.item.imdbID,
      plot: 'short',
    }).toString()}`);
  }

  if (!data || data.Response === 'False') return null;

  const imdbId = data.imdbID;
  if (imdbId) {
    return {
      posterUrl: `https://img.omdbapi.com/?i=${encodeURIComponent(imdbId)}&h=600&apikey=${encodeURIComponent(apiKey)}`,
      source: 'omdb',
    };
  }

  if (data.Poster && data.Poster !== 'N/A') {
    return { posterUrl: data.Poster, source: 'omdb' };
  }

  return null;
};

const findTmdbPoster = async (video, ignoreYear = false) => {
  const apiKey = getTmdbApiKey();
  const title = resolveSearchTitle(video);
  if (!apiKey || !title) return null;

  const type = video.type === 'series' ? 'series' : 'movie';
  const endpoint = type === 'series' ? 'tv' : 'movie';
  const year = video.releaseYear ?? parseYear(video.title) ?? parseYear(video.archiveIdentifier);
  const params = new URLSearchParams({
    api_key: apiKey,
    query: title,
  });
  if (year && !ignoreYear) {
    params.set(type === 'series' ? 'first_air_date_year' : 'year', String(year));
  }

  const data = await fetchJson(`${TMDB_BASE_URL}/search/${endpoint}?${params.toString()}`);
  const results = data?.results || [];
  if (!results.length) return null;

  const target = normalizeTitle(title);
  const scored = results.map((item) => {
    const candidateTitle = item?.title || item?.name || '';
    return {
      item,
      score: scoreCandidate(normalizeTitle(candidateTitle), target, getCandidateYear(item), year),
    };
  });
  scored.sort((a, b) => compareCandidates(a, b, year, type === 'movie' && !year));

  const best = scored.find((entry) => {
    if (entry.score < (year && !ignoreYear ? 3 : 2) || !entry.item?.poster_path) return false;
    const candidateYear = getCandidateYear(entry.item);
    return !year || !candidateYear || ignoreYear || yearsMatch(candidateYear, year);
  });

  if (!best?.item?.poster_path) return null;
  return {
    posterUrl: `${TMDB_IMAGE_BASE}${best.item.poster_path}`,
    source: 'tmdb',
  };
};

const findWikipediaPoster = async (video) => {
  const title = resolveSearchTitle(video);
  if (!title) return null;

  const type = video.type === 'series' ? 'tv series' : 'film';
  const year = video.releaseYear ?? parseYear(video.title) ?? parseYear(video.archiveIdentifier);
  const search = `${title} ${year || ''} ${type}`.trim();
  const searchData = await fetchJson(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    list: 'search',
    srsearch: search,
    srlimit: '5',
    format: 'json',
    origin: '*',
  }).toString()}`);
  const pageIds = (searchData?.query?.search || []).map((hit) => hit.pageid).filter(Boolean);
  if (!pageIds.length) return null;

  const imageData = await fetchJson(`https://en.wikipedia.org/w/api.php?${new URLSearchParams({
    action: 'query',
    prop: 'pageimages',
    piprop: 'thumbnail',
    pithumbsize: '500',
    format: 'json',
    pageids: pageIds.join(','),
    origin: '*',
  }).toString()}`);

  const pages = imageData?.query?.pages || {};
  for (const pageId of pageIds) {
    const source = pages[pageId]?.thumbnail?.source;
    if (source) return { posterUrl: source, source: 'wikipedia' };
  }
  return null;
};

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

const isArchiveGeneratedThumbnailUrl = (value) => {
  if (!value) return false;
  try {
    const url = new URL(value);
    if (!url.hostname.endsWith('archive.org')) return false;
    return url.pathname.includes('.thumbs') || url.pathname.startsWith('/services/img/');
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
  let lastFetchError = null;

  const tryUrl = async (candidateUrl, sourceType = 'external') => {
    if (!candidateUrl || tried.has(candidateUrl)) return null;
    tried.add(candidateUrl);

    let response;
    try {
      response = await fetchPosterCandidate(candidateUrl);
    } catch (error) {
      lastFetchError = error;
      return null;
    }

    if (isImageResponse(response)) {
      if (isArchiveCollectionPosterUrl(video, candidateUrl)) {
        unsafeCollectionImage = { response, sourceUrl: candidateUrl };
        return null;
      }
      return { response, sourceUrl: candidateUrl, sourceType };
    }

    if (isHtmlResponse(response)) {
      const html = await response.text();
      const htmlImageUrl = resolveHtmlImageUrl(html, response.url || candidateUrl);
      if (htmlImageUrl && !tried.has(htmlImageUrl)) {
        return tryUrl(htmlImageUrl, 'html');
      }
    }

    return {
      response,
      sourceUrl: candidateUrl,
      sourceType,
    };
  };

  const catalogPosters = [
    await findOmdbPoster(video),
    await findTmdbPoster(video, false),
    await findTmdbPoster(video, true),
    await findWikipediaPoster(video),
  ].filter(Boolean);

  for (const catalogPoster of catalogPosters) {
    const catalog = await tryUrl(catalogPoster.posterUrl, catalogPoster.source || 'catalog');
    if (catalog && isImageResponse(catalog.response)) return catalog;
  }

  if (sourceUrl && !isArchiveGeneratedThumbnailUrl(sourceUrl)) {
    const first = await tryUrl(sourceUrl, 'previous');
    if (first && isImageResponse(first.response)) return first;
  }

  if (!allowArchiveFrameFallback) {
    throw new Error(lastFetchError
      ? `No catalog poster fetched; archive frame fallback disabled (${lastFetchError.message})`
      : 'No catalog poster found; archive frame fallback disabled');
  }

  const first = await tryUrl(sourceUrl, 'archive');
  if (first && isImageResponse(first.response)) return first;

  const archiveFilePosterUrl = await resolveArchiveFilePosterUrl(video);
  const archiveFilePoster = await tryUrl(archiveFilePosterUrl, 'archive_file');
  if (archiveFilePoster && isImageResponse(archiveFilePoster.response)) return archiveFilePoster;

  const archiveParts = parseArchiveIdentifier(video.archiveIdentifier);
  const archiveBase = archiveIdentifierBase(video.archiveIdentifier);
  if (archiveBase && !archiveParts?.isBundleItem) {
    const archiveImage = await tryUrl(`https://archive.org/services/img/${encodeURIComponent(archiveBase)}`, 'archive_collection');
    if (archiveImage && isImageResponse(archiveImage.response)) return archiveImage;
  }

  if (first) return first;
  if (unsafeCollectionImage) {
    throw new Error(`Refusing collection-level archive poster for bundle item: ${unsafeCollectionImage.sourceUrl}`);
  }
  throw new Error(lastFetchError?.message || 'No poster candidate URL found');
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
    const poster = await resolvePosterResponse(video, sourceUrl);
    return {
      status: 'dry-run',
      previousThumbnailUrl: video.thumbnailUrl,
      sourceUrl,
      resolvedSourceUrl: poster.sourceUrl,
      resolvedSourceType: poster.sourceType || null,
    };
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
        resolvedSourceType: poster.sourceType || null,
        sourceProvider: video.sourceProvider || null,
        archiveIdentifier: video.archiveIdentifier || null,
      },
    },
  });

  return {
    status: 'localized',
    previousThumbnailUrl,
    nextThumbnailUrl,
    resolvedSourceUrl: poster.sourceUrl,
    resolvedSourceType: poster.sourceType || null,
  };
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
          type: true,
          releaseYear: true,
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
    if (!isArchiveCollectionPosterUrl(log.video, resolvedSourceUrl) && !isArchiveGeneratedThumbnailUrl(resolvedSourceUrl)) continue;
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
        type: true,
        releaseYear: true,
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
      const sourceDetail = result.resolvedSourceType ? ` - ${result.resolvedSourceType}: ${result.resolvedSourceUrl}` : '';
      console.log(`${result.status}: ${video.title} (${video.id})${result.reason ? ` - ${result.reason}` : sourceDetail}`);
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
