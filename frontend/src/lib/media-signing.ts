import { createHash, timingSafeEqual } from 'crypto';
import { extractHostedMediaPath, getMediaBaseUrl, normalizeMediaPath } from './media.ts';

/**
 * Signed, expiring media URLs.
 *
 * nginx serves video from /media/s/<expires>/<signature>/<path> only after asking
 * /api/media-auth (auth_request) to verify the signature, so a copied URL stops working once it
 * expires and files cannot be fetched by guessing their path. See docs/media-signing.md.
 * Posters and other images stay public.
 *
 * HLS playlists are signed for their whole folder, because the player requests the .ts segments
 * relative to the playlist URL and they inherit the signed prefix. Every other video file is
 * signed individually, so one token never unlocks a neighbouring film in a shared folder.
 */

const VIDEO_PATH_PATTERN = /\.(m3u8|mp4|mkv|webm|mov)$/i;
const DEFAULT_TTL_SECONDS = 6 * 60 * 60;

export const getMediaUrlTtlSeconds = () => {
    const configured = Number(process.env.MEDIA_URL_TTL_SECONDS);
    return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : DEFAULT_TTL_SECONDS;
};

// extractHostedMediaPath only recognises a fixed list of media folders and skips ia/, which is
// where imported films live, so local /media/... URLs are unwrapped here first.
const toMediaPath = (url: string) => {
    const prefix = `${getMediaBaseUrl()}/`;
    if (url.startsWith(prefix)) return normalizeMediaPath(url.slice(prefix.length));
    return extractHostedMediaPath(url);
};

// Files that live inside an HLS folder share the folder's signature; everything else is per file.
const HLS_PART_PATTERN = /\.(m3u8|ts|m4s)$/i;

const signatureScope = (mediaPath: string) =>
    HLS_PART_PATTERN.test(mediaPath) ? mediaPath.slice(0, mediaPath.lastIndexOf('/')) : mediaPath;

export const computeMediaSignature = (expires: number, mediaPath: string, secret: string) =>
    createHash('md5')
        .update(`${expires}/${signatureScope(mediaPath)} ${secret}`)
        .digest('base64url');

/**
 * Returns a signed URL for a locally hosted video, or the input unchanged when signing is not
 * configured (no MEDIA_SIGNING_SECRET), the URL is an external link, or it is not a video.
 */
export const signMediaUrl = (url: string | null | undefined, nowMs = Date.now()) => {
    if (!url) return url ?? '';

    const secret = process.env.MEDIA_SIGNING_SECRET;
    if (!secret) return url;

    const mediaPath = toMediaPath(url);
    if (!mediaPath || !VIDEO_PATH_PATTERN.test(mediaPath) || mediaPath.startsWith('s/')) return url;

    const expires = Math.floor(nowMs / 1000) + getMediaUrlTtlSeconds();
    const signature = computeMediaSignature(expires, mediaPath, secret);
    return `${getMediaBaseUrl()}/s/${expires}/${signature}/${mediaPath}`;
};

const SIGNED_PATH_PATTERN = /^\/media\/s\/(\d+)\/([A-Za-z0-9_-]+)\/(.+)$/;

export type MediaRequestCheck = { ok: true } | { ok: false; reason: 'malformed' | 'expired' | 'bad-signature' };

/**
 * Verifies the original request URI nginx forwards from auth_request, e.g.
 * /media/s/1793058602/dkKenuAj-qgO_SYNlg-E9g/ia/demo/hls/film/segment-00001.ts
 */
export const verifyMediaRequest = (requestUri: string, secret: string, nowMs = Date.now()): MediaRequestCheck => {
    const pathname = requestUri.split('?')[0];
    let decoded: string;
    try {
        decoded = decodeURIComponent(pathname);
    } catch {
        return { ok: false, reason: 'malformed' };
    }

    const match = decoded.match(SIGNED_PATH_PATTERN);
    if (!match) return { ok: false, reason: 'malformed' };

    const expires = Number(match[1]);
    const mediaPath = match[3];
    if (mediaPath.split('/').includes('..')) return { ok: false, reason: 'malformed' };
    if (!Number.isFinite(expires) || expires * 1000 < nowMs) return { ok: false, reason: 'expired' };

    const expected = Buffer.from(computeMediaSignature(expires, mediaPath, secret));
    const provided = Buffer.from(match[2]);
    if (expected.length !== provided.length || !timingSafeEqual(expected, provided)) {
        return { ok: false, reason: 'bad-signature' };
    }
    return { ok: true };
};
