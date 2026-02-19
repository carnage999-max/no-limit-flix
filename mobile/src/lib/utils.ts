import { Platform } from 'react-native';

/**
 * Standardizes S3/CloudFront URLs for the mobile app.
 * Handles regional S3 patterns, ensures HTTPS protocol, and encodes for iOS stability.
 */
export const transformToCloudFront = (url: string | null) => {
    if (!url) return '';

    // 1. Ensure the input URL has a protocol if it's already a CloudFront link
    let finalizedUrl = url;
    if (url.includes('cloudfront.net') && !url.startsWith('http')) {
        finalizedUrl = `https://${url}`;
    }

    // Use the environment variable for CloudFront base URL
    // In Expo, process.env is usually used for variables defined in .env or eas.json
    const cfUrl = process.env.EXPO_PUBLIC_CLOUDFRONT_URL;
    if (!cfUrl) return finalizedUrl;

    let cfPrefix = cfUrl;
    if (!cfPrefix.startsWith('http')) {
        cfPrefix = `https://${cfPrefix}`;
    }

    const cfBase = cfPrefix.endsWith('/') ? cfPrefix : `${cfPrefix}/`;

    // Broader regex to catch regional S3 URLs and both http/https
    const s3Pattern = /https?:\/\/[^.]+\.s3[.-][^.]+\.amazonaws.com\//i;
    const s3PatternLegacy = /https?:\/\/[^.]+\.s3\.amazonaws\.com\//i;

    if (s3Pattern.test(finalizedUrl)) {
        finalizedUrl = finalizedUrl.replace(s3Pattern, cfBase);
    } else if (s3PatternLegacy.test(finalizedUrl)) {
        finalizedUrl = finalizedUrl.replace(s3PatternLegacy, cfBase);
    }

    // 2. Final sanitization: ensure no double slashes in the path, while preserving protocol
    if (finalizedUrl.includes('://')) {
        const [protocol, rest] = finalizedUrl.split('://');
        finalizedUrl = `${protocol}://${rest.replace(/\/\/+/g, '/')}`;
    } else {
        finalizedUrl = finalizedUrl.replace(/\/\/+/g, '/');
    }

    // 3. URL Encoding for iOS stability (handles spaces and special characters)
    if (Platform.OS === 'ios') {
        try {
            // Only encode if not already encoded (prevent double encoding)
            if (finalizedUrl === decodeURI(finalizedUrl)) {
                return encodeURI(finalizedUrl);
            }
        } catch (e) {
            // ignore encoding errors
        }
    }

    return finalizedUrl;
};
