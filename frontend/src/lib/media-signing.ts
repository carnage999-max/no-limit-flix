import { createHash } from 'crypto';
import { extractHostedMediaPath, getMediaBaseUrl, normalizeMediaPath } from './media.ts';

/**
 * Signed, expiring media URLs.
 *
 * nginx serves video from /media/s/<expires>/<signature>/<path> only when the signature checks
 * out (see docs/media-signing.md), so a copied URL stops working once it expires and files cannot
 * be fetched by guessing their path. Posters and other images stay public.
 *
 * Playlists are signed for their whole folder, because the player requests the .ts segments
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

const signatureScope = (mediaPath: string) =>
    /\.m3u8$/i.test(mediaPath) ? mediaPath.slice(0, mediaPath.lastIndexOf('/')) : mediaPath;

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
