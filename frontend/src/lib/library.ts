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
        const hostedVideos = await (prisma.video as any).findMany({
            where: {
                tmdbId: { in: tmdbIds },
                status: 'completed',
            },
            select: {
                id: true,
                tmdbId: true,
                s3Url: true,
                duration: true,
                releaseYear: true
            },
        });

        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;

        const hostedMap: Record<string, { id: string; s3Url: string; duration: number | null; releaseYear: number | null }> = {};
        for (const v of hostedVideos) {
            if (v.tmdbId) {
                let publicUrl = v.s3Url;
                if (cloudFrontUrl) {
                    const cfBase = cloudFrontUrl.endsWith('/') ? cloudFrontUrl : `${cloudFrontUrl}/`;
                    const cfPrefix = cfBase.startsWith('http') ? cfBase : `https://${cfBase}`;
                    const s3Pattern = /https?:\/\/[^.]+\.s3[.-][^.]+\.amazonaws\.com\//i;
                    const s3PatternLegacy = /https?:\/\/[^.]+\.s3\.amazonaws\.com\//i;

                    if (s3Pattern.test(v.s3Url)) {
                        publicUrl = v.s3Url.replace(s3Pattern, cfPrefix);
                    } else if (s3PatternLegacy.test(v.s3Url)) {
                        publicUrl = v.s3Url.replace(s3PatternLegacy, cfPrefix);
                    }
                }

                hostedMap[v.tmdbId] = {
                    id: v.id,
                    s3Url: publicUrl,
                    duration: v.duration,
                    releaseYear: v.releaseYear
                };
            }
        }

        // 3. Enrich each pick
        return movies.map((movie) => {
            const tmdbId = movie.tmdb_id?.toString() || movie.id?.toString();
            if (tmdbId && hostedMap[tmdbId]) {
                const asset = hostedMap[tmdbId];
                return {
                    ...movie,
                    playable: true,
                    assetId: asset.id,
                    cloudfrontUrl: asset.s3Url,
                    runtime: asset.duration ? Math.floor(asset.duration / 60) : movie.runtime,
                    year: asset.releaseYear || movie.year,
                    permanence: 'Permanent Core'
                };
            }
            return { ...movie, playable: false };
        });
    } catch (error) {
        console.error('Error enriching movies with playable status:', error);
        return movies; // Fallback to original list on error
    }
}
