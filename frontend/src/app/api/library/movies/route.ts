import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * GET /api/library/movies
 * Returns all completed movie assets hosted on our infrastructure (CloudFront/S3).
 * Only titles with status='completed' and type='movie' are returned.
 * This is the internal library — only content we own and control.
 */
export async function GET() {
    try {
        const videos = await (prisma.video as any).findMany({
            where: {
                type: 'movie',
                status: 'completed',
            },
            orderBy: { createdAt: 'desc' },
            select: {
                id: true,
                title: true,
                description: true,
                thumbnailUrl: true,
                s3Url: true,          // CloudFront/S3 playback URL
                duration: true,
                releaseYear: true,
                genre: true,
                rating: true,
                resolution: true,
                tmdbId: true,         // optional link to global catalog
                createdAt: true,
            },
        });

        // Serialize safely (no BigInt fields selected above)
        return NextResponse.json({ movies: videos });
    } catch (error: any) {
        console.error('GET /api/library/movies error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch library' },
            { status: 500 }
        );
    }
}
