import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { isReviewSafeVideo } from '@/lib/review-safety';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q')?.trim();
        const limit = Math.min(Number(searchParams.get('limit') || 20), 50);

        if (!query) {
            return NextResponse.json({ results: [] });
        }

        const videos = await (prisma.video as any).findMany({
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
        .filter((video: any) => isReviewSafeVideo(video))
        .map((video: any) => {
            return {
                ...video,
                s3Url: resolveMediaUrl(video.s3Url),
                thumbnailUrl: resolveMediaUrl(video.thumbnailUrl),
                fileSize: video.fileSize ? video.fileSize.toString() : null,
            };
        });

        return NextResponse.json({ results: transformed });
    } catch (error: any) {
        console.error('GET /api/library/search error:', error);
        return NextResponse.json({ error: 'Failed to search library' }, { status: 500 });
    }
}
