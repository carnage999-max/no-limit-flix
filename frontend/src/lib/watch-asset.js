import { buildMediaUrl, extractHostedMediaPath } from './media.ts';

const HOSTLESS_HOSTED_MEDIA_PATTERN = /^([^/]+\.(?:cloudfront\.net|s3(?:[.-][^.]+)?\.amazonaws\.com))(\/.+)$/i;

const decodeAssetReference = (value) => {
    try {
        return decodeURIComponent(value);
    } catch {
        return value;
    }
};

const addCandidate = (candidates, value) => {
    if (!value) return;
    const trimmed = value.trim();
    if (!trimmed) return;
    candidates.add(trimmed);
};

export const normalizeAssetReference = (value) => decodeAssetReference(value).trim();

export const buildWatchHref = (assetId) => `/watch/${encodeURIComponent(normalizeAssetReference(assetId))}`;

export const getAssetReferenceCandidates = (assetId) => {
    const normalized = normalizeAssetReference(assetId);
    const candidates = new Set();

    addCandidate(candidates, normalized);

    const hostlessHostedMatch = normalized.match(HOSTLESS_HOSTED_MEDIA_PATTERN);
    if (hostlessHostedMatch) {
        addCandidate(candidates, `https://${normalized}`);
    }

    const mediaPath = extractHostedMediaPath(normalized)
        || (hostlessHostedMatch ? extractHostedMediaPath(`https://${normalized}`) : null);

    if (mediaPath) {
        addCandidate(candidates, mediaPath);
        addCandidate(candidates, `/${mediaPath}`);
        addCandidate(candidates, `/media/${mediaPath}`);
        addCandidate(candidates, buildMediaUrl(mediaPath));
    }

    return Array.from(candidates);
};
