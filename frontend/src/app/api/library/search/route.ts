import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { isReviewSafeVideo } from '@/lib/review-safety';
import { attachRatingSummaries } from '@/lib/ratings';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim();
        const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        const series = await prisma.series.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { description: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { title: 'asc' },
            take: limit,
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
                episodes: {
                    orderBy: [
                        { seasonNumber: 'asc' },
                        { episodeNumber: 'asc' },
                    ],
                    take: 1,
                    select: { id: true },
                },
            },
        });

        const videos = await prisma.video.findMany({
            where: {
                status: 'completed',
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { seriesTitle: { contains: query, mode: 'insensitive' } },
                ],
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
            select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                s3Url: true,
                duration: true,
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
                archiveIdentifier: true,
                format: true,
                fileSize: true,
                seriesTitle: true,
                type: true,
                createdAt: true,
            },
        });

        const transformed = videos
        .filter((video) => isReviewSafeVideo(video))
        .map((video) => {
            return {
                ...video,
                s3Url: resolveMediaUrl(video.s3Url),
                thumbnailUrl: resolveMediaUrl(video.thumbnailUrl),
                fileSize: video.fileSize ? video.fileSize.toString() : null,
            };
        });

        const results = await attachRatingSummaries(transformed);
        const seriesResults = series
            .filter((item) => item.episodes.length > 0)
            .map((item) => ({
                id: item.episodes[0].id,
                title: item.title,
                seriesTitle: item.title,
                type: 'series',
                thumbnailUrl: resolveMediaUrl(item.thumbnailUrl),
                releaseYear: item.releaseYear,
                genre: item.genre,
                rating: item.rating,
                averageRating: item.averageRating,
                ratingCount: item.ratingCount,
                tmdbId: item.tmdbId,
                sourceProvider: item.sourceProvider,
                sourcePageUrl: item.sourcePageUrl,
                sourceRights: item.sourceRights,
                sourceLicenseUrl: item.sourceLicenseUrl,
                description: item.description,
            }));

        return NextResponse.json({ results: [...seriesResults, ...results].slice(0, limit) });
    } catch (error) {
        console.error('GET /api/library/search error:', error);
        return NextResponse.json({ error: 'Failed to search library' }, { status: 500 });
    }
}
