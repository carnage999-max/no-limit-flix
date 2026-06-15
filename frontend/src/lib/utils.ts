/**
 * Utility for the frontend to maximize playability and performance.
 */

import { resolveMediaUrl } from './media';

export const transformToCloudFront = (url: string | null) => {
    return resolveMediaUrl(url);
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
