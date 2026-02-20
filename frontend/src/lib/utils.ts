/**
 * Utility for the frontend to maximize playability and performance.
 */

export const transformToCloudFront = (url: string | null) => {
    if (!url) return '';

    let finalizedUrl = url;
    if (url.includes('cloudfront.net') && !url.startsWith('http')) {
        finalizedUrl = `https://${url}`;
    }

    const cfUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
    if (!cfUrl) return finalizedUrl;

    let cfPrefix = cfUrl;
    if (!cfPrefix.startsWith('http')) {
        cfPrefix = `https://${cfPrefix}`;
    }

    const cfBase = cfPrefix.endsWith('/') ? cfPrefix : `${cfPrefix}/`;

    // Regex to catch regional S3 URLs and both http/https
    const s3Pattern = /https?:\/\/[^.]+\.s3[.-][^.]+\.amazonaws.com\//i;
    const s3PatternLegacy = /https?:\/\/[^.]+\.s3\.amazonaws\.com\//i;

    if (s3Pattern.test(finalizedUrl)) {
        finalizedUrl = finalizedUrl.replace(s3Pattern, cfBase);
    } else if (s3PatternLegacy.test(finalizedUrl)) {
        finalizedUrl = finalizedUrl.replace(s3PatternLegacy, cfBase);
    }

    // Final sanitization: ensure no double slashes in the path, while preserving protocol
    if (finalizedUrl.includes('://')) {
        const [protocol, rest] = finalizedUrl.split('://');
        finalizedUrl = `${protocol}://${rest.replace(/\/\/+/g, '/')}`;
    } else {
        finalizedUrl = finalizedUrl.replace(/\/\/+/g, '/');
    }

    return finalizedUrl;
};

/**
 * Helper to generate an external player URL
 */
export const getExternalPlayerUrl = (type: 'vlc' | 'iina', streamUrl: string) => {
    // Both players generally handle raw URLs once launched
    if (type === 'vlc') return `vlc://${streamUrl}`;
    if (type === 'iina') return `iina://weblink?url=${streamUrl}`;
    return streamUrl;
};
