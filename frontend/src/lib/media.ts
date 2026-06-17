const DEFAULT_MEDIA_URL = 'https://nolimitflix.com/media';
const KNOWN_MEDIA_PREFIXES = ['videos/', 'thumbnails/', 'avatars/', 'issues/'];
const HOSTLESS_HOSTED_MEDIA_PATTERN = /^([^/]+\.(?:cloudfront\.net|s3(?:[.-][^.]+)?\.amazonaws\.com))(\/.+)$/i;
const MEDIA_PATH_PATTERN = /(?:^|\/)[^/]+\.(?:m3u8|mp4|mkv|mov|avi|webm|jpg|jpeg|png|webp|gif|svg|vtt|srt|mp3|aac|wav)$/i;

const S3_HOST_PATTERN = /^[^.]+\.s3([.-][^.]+)?\.amazonaws\.com$/i;
const LEGACY_S3_HOST_PATTERN = /^[^.]+\.s3\.amazonaws\.com$/i;
const CLOUDFRONT_HOST_PATTERN = /\.cloudfront\.net$/i;

const collapsePath = (value: string) =>
  value
    .replace(/\\/g, '/')
    .replace(/\/{2,}/g, '/')
    .replace(/^\/+/, '')
    .replace(/^\.\//, '')
    .trim();

const matchesKnownMediaPrefix = (value: string) =>
  KNOWN_MEDIA_PREFIXES.some((prefix) => value === prefix.slice(0, -1) || value.startsWith(prefix));

const looksLikeMediaPath = (value: string) =>
  matchesKnownMediaPrefix(value)
  || value.startsWith('ia/')
  || value.startsWith('download/')
  || value.startsWith('media/')
  || MEDIA_PATH_PATTERN.test(value);

export const getMediaBaseUrl = () => {
  const configured = process.env.NEXT_PUBLIC_MEDIA_URL?.trim() || DEFAULT_MEDIA_URL;
  return configured.replace(/\/+$/, '');
};

export const normalizeMediaPath = (value: string) => {
  const normalized = collapsePath(value);
  if (!normalized) return '';

  const safeSegments = normalized
    .split('/')
    .filter(Boolean)
    .filter((segment) => segment !== '.');

  const resolved: string[] = [];
  for (const segment of safeSegments) {
    if (segment === '..') {
      resolved.pop();
      continue;
    }
    resolved.push(segment);
  }

  return resolved.join('/');
};

export const buildMediaUrl = (value: string) => {
  const mediaPath = normalizeMediaPath(value);
  if (!mediaPath) return getMediaBaseUrl();
  return `${getMediaBaseUrl()}/${mediaPath}`;
};

const isKnownHostedMediaHost = (host: string) =>
  S3_HOST_PATTERN.test(host)
  || LEGACY_S3_HOST_PATTERN.test(host)
  || CLOUDFRONT_HOST_PATTERN.test(host);

export const extractHostedMediaPath = (value: string | null | undefined) => {
  if (!value) return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const hostlessHostedMatch = trimmed.match(HOSTLESS_HOSTED_MEDIA_PATTERN);
  if (hostlessHostedMatch?.[2]) {
    return normalizeMediaPath(hostlessHostedMatch[2]);
  }

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      const mediaBase = new URL(getMediaBaseUrl());

      if (url.host === mediaBase.host && url.pathname.startsWith(`${mediaBase.pathname.replace(/\/$/, '')}/`)) {
        return normalizeMediaPath(url.pathname.slice(`${mediaBase.pathname.replace(/\/$/, '')}/`.length));
      }

      if (isKnownHostedMediaHost(url.host)) {
        return normalizeMediaPath(url.pathname);
      }

      return null;
    } catch {
      return null;
    }
  }

  if (trimmed.startsWith('/media/')) {
    const mediaPath = normalizeMediaPath(trimmed.slice('/media/'.length));
    return matchesKnownMediaPrefix(mediaPath) ? mediaPath : null;
  }

  if (trimmed.startsWith('/')) {
    const mediaPath = normalizeMediaPath(trimmed);
    return matchesKnownMediaPrefix(mediaPath) ? mediaPath : null;
  }

  const mediaPath = normalizeMediaPath(trimmed);
  return looksLikeMediaPath(mediaPath) ? mediaPath : null;
};

export const resolveMediaUrl = (value: string | null | undefined) => {
  if (!value) return '';
  const hostedPath = extractHostedMediaPath(value);
  if (hostedPath) {
    return buildMediaUrl(hostedPath);
  }
  return value;
};
