import { BASE_URL } from './api';

const KNOWN_MEDIA_PREFIXES = ['videos/', 'thumbnails/', 'avatars/', 'issues/', 'ia/'];
const HOSTLESS_HOSTED_MEDIA_PATTERN = /^([^/]+\.(?:cloudfront\.net|s3(?:[.-][^.]+)?\.amazonaws\.com))(\/.+)$/i;
const MEDIA_PATH_PATTERN = /(?:^|\/)[^/]+\.(?:m3u8|mp4|mkv|mov|avi|webm|jpg|jpeg|png|webp|gif|svg|vtt|srt|mp3|aac|wav)$/i;
const S3_HOST_PATTERN = /^[^.]+\.s3([.-][^.]+)?\.amazonaws\.com$/i;
const LEGACY_S3_HOST_PATTERN = /^[^.]+\.s3\.amazonaws\.com$/i;
const CLOUDFRONT_HOST_PATTERN = /\.cloudfront\.net$/i;

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '');

const buildAbsoluteApiUrl = (path: string) => {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${normalizeBaseUrl(BASE_URL)}${normalizedPath}`;
};

const collapsePath = (value: string) =>
    value
        .replace(/\\/g, '/')
        .replace(/\/{2,}/g, '/')
        .replace(/^\/+/, '')
        .replace(/^\.\//, '')
        .trim();

const normalizeMediaPath = (value: string) => {
    const normalized = collapsePath(value);
    if (!normalized) return '';

    const resolved: string[] = [];
    normalized
        .split('/')
        .filter(Boolean)
        .filter((segment) => segment !== '.')
        .forEach((segment) => {
            if (segment === '..') {
                resolved.pop();
                return;
            }
            resolved.push(segment);
        });

    return resolved.join('/');
};

const matchesKnownMediaPrefix = (value: string) =>
    KNOWN_MEDIA_PREFIXES.some((prefix) => value === prefix.slice(0, -1) || value.startsWith(prefix));

const looksLikeMediaPath = (value: string) =>
    matchesKnownMediaPrefix(value)
    || value.startsWith('download/')
    || value.startsWith('media/')
    || MEDIA_PATH_PATTERN.test(value);

const isKnownHostedMediaHost = (host: string) =>
    S3_HOST_PATTERN.test(host)
    || LEGACY_S3_HOST_PATTERN.test(host)
    || CLOUDFRONT_HOST_PATTERN.test(host);

const extractHostedMediaPath = (value: string | null | undefined) => {
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
            const apiBase = new URL(BASE_URL);
            const mediaPrefix = '/media/';

            if (url.host === apiBase.host && url.pathname.startsWith(mediaPrefix)) {
                return normalizeMediaPath(url.pathname.slice(mediaPrefix.length));
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
        return looksLikeMediaPath(mediaPath) ? mediaPath : null;
    }

    if (trimmed.startsWith('/')) {
        const mediaPath = normalizeMediaPath(trimmed);
        return looksLikeMediaPath(mediaPath) ? mediaPath : null;
    }

    const mediaPath = normalizeMediaPath(trimmed);
    return looksLikeMediaPath(mediaPath) ? mediaPath.replace(/^media\//i, '') : null;
};

const encodeForNative = (url: string) => {
    try {
        if (url === decodeURI(url)) {
            return encodeURI(url);
        }
    } catch {
        return url;
    }
    return url;
};

export const resolveMobileMediaUrl = (url: string | null | undefined) => {
    if (!url) return '';

    const hostedPath = extractHostedMediaPath(url);
    const resolvedUrl = hostedPath ? buildAbsoluteApiUrl(`/media/${hostedPath}`) : url.trim();
    return encodeForNative(resolvedUrl);
};

export const transformToCloudFront = resolveMobileMediaUrl;
