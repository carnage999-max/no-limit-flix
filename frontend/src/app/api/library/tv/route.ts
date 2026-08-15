import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { isReviewSafeVideo } from '@/lib/review-safety';
import { attachRatingSummaries } from '@/lib/ratings';
import type { RatingSummary } from '@/lib/ratings';

type SeriesGroup = {
    id: string;
    seriesTitle: string;
    thumbnailUrl: string | null;
    genre: string | null;
    rating: string | null;
    averageRating: number | null;
    ratingCount: number | null;
    ratingSummary: RatingSummary;
    hybridRating: number | null;
    tmdbId: string | null;
    description: string | null;
    releaseYear: number | null;
    episodeCount: number;
    episodes: unknown[];
};

const GENERIC_SERIES_TITLES = new Set([
    'action',
    'animation',
    'animated',
    'anime',
    'cartoon',
    'comedy',
    'documentary',
    'documentaries',
    'drama',
    'family',
    'fantasy',
    'horror',
    'movie',
    'movies',
    'series',
    'tv',
]);

const cleanTitle = (value: string | null | undefined) => {
    const title = typeof value === 'string' ? value.trim() : '';
    return title || null;
};

const looksLikeEpisodeFragment = (value: string | null | undefined) => {
    const title = cleanTitle(value);
    if (!title) return true;
    const normalized = title.toLowerCase();
    if (GENERIC_SERIES_TITLES.has(normalized)) return true;
    if (/^[\d\s,._:;#-]+$/.test(title)) return true;
    if (/^[,._:;#-]/.test(title)) return true;
    return false;
};

const stripYearSuffix = (value: string) =>
    value
        .replace(/\s*\((?:19|20)\d{2}\)\s*$/i, '')
        .replace(/\s+(?:19|20)\d{2}\s*$/i, '')
        .trim();

const canonicalSeriesKey = (title: string) =>
    stripYearSuffix(title)
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const chooseSeriesTitle = (parentTitle: string | null | undefined, seriesTitle: string | null | undefined, episodeTitle: string | null | undefined, genre: string | null | undefined) => {
    const candidates = [parentTitle, seriesTitle, genre, episodeTitle]
        .map(cleanTitle)
        .filter((title): title is string => Boolean(title));
    return candidates.find((title) => !looksLikeEpisodeFragment(title)) || candidates[0] || 'Unknown Series';
};

/**
 * GET /api/library/tv
 * Returns all completed TV/series assets hosted on our infrastructure.
 * Episodes are grouped by seriesTitle for display in the mobile app.
 * Only content we host and control — no external streaming links.
 */
export async function GET() {
    try {
        const episodes = await prisma.video.findMany({
            where: {
                type: 'series',
                status: 'completed',
            },
            orderBy: [
                { seriesTitle: 'asc' },
                { seasonNumber: 'asc' },
                { episodeNumber: 'asc' },
            ],
            select: {
                id: true,
                title: true,         // episode title
                seriesId: true,
                seriesTitle: true,   // parent series name for grouping
                description: true,
                thumbnailUrl: true,
                s3Url: true,         // CloudFront/S3 playback URL
                duration: true,
                seasonNumber: true,
                episodeNumber: true,
                releaseYear: true,
                genre: true,
                rating: true,
                averageRating: true,
                ratingCount: true,
                resolution: true,
                tmdbId: true,
                sourceType: true,
                sourceProvider: true,
                sourcePageUrl: true,
                sourceRights: true,
                sourceLicenseUrl: true,
                createdAt: true,
                series: {
                    select: {
                        id: true,
                        title: true,
                        description: true,
                        thumbnailUrl: true,
                        releaseYear: true,
                        genre: true,
                        rating: true,
                        averageRating: true,
                        ratingCount: true,
                        tmdbId: true,
                        sourceProvider: true,
                        sourcePageUrl: true,
                        sourceRights: true,
                        sourceLicenseUrl: true,
                    },
                },
            },
        });

        const safeEpisodes = episodes.filter((episode) => isReviewSafeVideo(episode));
        const reviewSafeEpisodes = await attachRatingSummaries(safeEpisodes);

        // Group by seriesTitle so the mobile app can render a series list
        const seriesMap: Record<string, SeriesGroup> = {};
        for (const ep of reviewSafeEpisodes) {
            const transformedEp = {
                ...ep,
                s3Url: resolveMediaUrl(ep.s3Url),
                thumbnailUrl: resolveMediaUrl(ep.thumbnailUrl)
            };

            const parent = ep.series;
            const displayTitle = chooseSeriesTitle(parent?.title, ep.seriesTitle, ep.title, parent?.genre || ep.genre);
            const key = canonicalSeriesKey(displayTitle) || displayTitle;
            if (!seriesMap[key]) {
                seriesMap[key] = {
                    id: parent?.id || key,
                    seriesTitle: displayTitle,
                    thumbnailUrl: resolveMediaUrl(parent?.thumbnailUrl) || transformedEp.thumbnailUrl,
                    genre: parent?.genre && canonicalSeriesKey(parent.genre) !== key ? parent.genre : ep.genre,
                    rating: parent?.rating || ep.rating,
                    averageRating: parent?.averageRating || ep.averageRating,
                    ratingCount: parent?.ratingCount || ep.ratingCount,
                    ratingSummary: ep.ratingSummary,
                    hybridRating: ep.hybridRating,
                    tmdbId: parent?.tmdbId || ep.tmdbId,
                    description: parent?.description || transformedEp.description,
                    releaseYear: parent?.releaseYear || ep.releaseYear,
                    episodeCount: 0,
                    episodes: [],
                };
            }
            seriesMap[key].episodes.push({
                ...transformedEp,
                seriesTitle: displayTitle,
            });
            seriesMap[key].episodeCount++;

            if (parent?.id && !seriesMap[key].id.startsWith('series_')) {
                seriesMap[key].id = parent.id;
            }

            if (!seriesMap[key].thumbnailUrl && transformedEp.thumbnailUrl) {
                seriesMap[key].thumbnailUrl = transformedEp.thumbnailUrl;
            }
            
            // Use the first episode's description as the series description if not already set
            if (!seriesMap[key].description && transformedEp.description) {
                seriesMap[key].description = transformedEp.description;
            }

            if (!seriesMap[key].releaseYear && ep.releaseYear) {
                seriesMap[key].releaseYear = ep.releaseYear;
            }

            if (looksLikeEpisodeFragment(seriesMap[key].seriesTitle) && !looksLikeEpisodeFragment(displayTitle)) {
                seriesMap[key].seriesTitle = displayTitle;
            }
        }

        const series = Object.values(seriesMap).sort((a, b) => a.seriesTitle.localeCompare(b.seriesTitle));

        return NextResponse.json({ series });
    } catch (error) {
        console.error('GET /api/library/tv error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch TV library' },
            { status: 500 }
        );
    }
}
