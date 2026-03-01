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
            },
        });

        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const cfBase = cloudFrontUrl ? (cloudFrontUrl.endsWith('/') ? cloudFrontUrl : `${cloudFrontUrl}/`) : null;
        const s3Pattern = /https:\/\/[^.]+\.s3([.-][^.]+)?\.amazonaws\.com\//;
        const cfPrefix = cfBase ? (cfBase.startsWith('http') ? cfBase : `https://${cfBase}`) : null;

        // Group by seriesTitle so the mobile app can render a series list
        const seriesMap: Record<string, any> = {};
        for (const ep of episodes) {
            let publicUrl = ep.s3Url;
            let publicThumb = ep.thumbnailUrl;

            const isExternal = ep.sourceProvider === 'internet_archive' || ep.sourceType === 'external_legal';

            if (cfPrefix && !isExternal) {
                publicUrl = ep.s3Url.replace(s3Pattern, cfPrefix);
                if (ep.thumbnailUrl) {
                    publicThumb = ep.thumbnailUrl.replace(s3Pattern, cfPrefix);
                }
            }

            const transformedEp = {
                ...ep,
                s3Url: publicUrl,
                thumbnailUrl: publicThumb
            };

            const key = ep.seriesTitle || ep.title || 'Unknown Series';
            if (!seriesMap[key]) {
                seriesMap[key] = {
                    seriesTitle: key,
                    thumbnailUrl: transformedEp.thumbnailUrl,
                    genre: ep.genre,
                    rating: ep.rating,
                    averageRating: ep.averageRating,
                    ratingCount: ep.ratingCount,
                    tmdbId: ep.tmdbId,
                    description: transformedEp.description,
                    episodeCount: 0,
                    episodes: [],
                };
            }
            seriesMap[key].episodes.push(transformedEp);
            seriesMap[key].episodeCount++;

            if (!seriesMap[key].thumbnailUrl && transformedEp.thumbnailUrl) {
                seriesMap[key].thumbnailUrl = transformedEp.thumbnailUrl;
            }
            
            // Use the first episode's description as the series description if not already set
            if (!seriesMap[key].description && transformedEp.description) {
                seriesMap[key].description = transformedEp.description;
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
