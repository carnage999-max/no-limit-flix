import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/library/tv
 * Returns all completed TV/series assets hosted on our infrastructure.
 * Episodes are grouped by seriesTitle for display in the mobile app.
 * Only content we host and control — no external streaming links.
 */
export async function GET() {
    try {
        const episodes = await (prisma.video as any).findMany({
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
                resolution: true,
                tmdbId: true,
                createdAt: true,
            },
        });

        // Group by seriesTitle so the mobile app can render a series list
        const seriesMap: Record<string, any> = {};
        for (const ep of episodes) {
            const key = ep.seriesTitle || ep.title;
            if (!seriesMap[key]) {
                seriesMap[key] = {
                    seriesTitle: key,
                    thumbnailUrl: ep.thumbnailUrl,
                    genre: ep.genre,
                    rating: ep.rating,
                    tmdbId: ep.tmdbId,
                    episodeCount: 0,
                    episodes: [],
                };
            }
            seriesMap[key].episodes.push(ep);
            seriesMap[key].episodeCount++;
            // Use the first episode's thumbnail as the series thumbnail if not set
            if (!seriesMap[key].thumbnailUrl && ep.thumbnailUrl) {
                seriesMap[key].thumbnailUrl = ep.thumbnailUrl;
            }
        }

        const series = Object.values(seriesMap);

        return NextResponse.json({ series });
    } catch (error: any) {
        console.error('GET /api/library/tv error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch TV library' },
            { status: 500 }
        );
    }
}
