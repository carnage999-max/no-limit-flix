import prisma from './db';
import { MoviePick } from '@/types';

/**
 * Checks a list of movies against our internal SQL database (matched by tmdbId)
 * and attaches assetId + cloudfrontUrl if we host the content.
 */
export async function enrichMoviesWithPlayable(movies: MoviePick[]): Promise<MoviePick[]> {
    if (movies.length === 0) return [];

    // 1. Collect all tmdb_ids
    const tmdbIds = movies
        .map((m) => m.tmdb_id || m.id) // Use tmdb_id if available, fallback to id (which is usually tmdbId for discovery)
        .filter(Boolean) as string[];

    if (tmdbIds.length === 0) return movies;

    try {
        // 2. Look up which of these titles we actually host
        // We cast prisma.video as any to bypass potential type mismatch if schemas are out of sync in memory
        const hostedVideos = await (prisma.video as any).findMany({
            where: {
                tmdbId: { in: tmdbIds },
                status: 'completed',
            },
            select: { id: true, tmdbId: true, s3Url: true },
        });

        const hostedMap: Record<string, { id: string; s3Url: string }> = {};
        for (const v of hostedVideos) {
            if (v.tmdbId) {
                hostedMap[v.tmdbId] = { id: v.id, s3Url: v.s3Url };
            }
        }

        // 3. Enrich each pick
        return movies.map((movie) => {
            const tmdbId = movie.tmdb_id || movie.id;
            if (tmdbId && hostedMap[tmdbId]) {
                const asset = hostedMap[tmdbId];
                return {
                    ...movie,
                    playable: true,
                    assetId: asset.id,
                    cloudfrontUrl: asset.s3Url,
                };
            }
            return { ...movie, playable: false };
        });
    } catch (error) {
        console.error('Error enriching movies with playable status:', error);
        return movies; // Fallback to original list on error
    }
}
