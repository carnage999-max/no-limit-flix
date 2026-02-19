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

        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const cfBase = cloudFrontUrl ? (cloudFrontUrl.endsWith('/') ? cloudFrontUrl : `${cloudFrontUrl}/`) : null;
        const s3Pattern = /https:\/\/[^.]+\.s3([.-][^.]+)?\.amazonaws\.com\//;

        const transformedVideos = videos.map((video: any) => {
            let publicUrl = video.s3Url;
            let publicThumb = video.thumbnailUrl;

            if (cfBase) {
                const cfPrefix = cfBase.startsWith('http') ? cfBase : `https://${cfBase}`;
                const s3Pattern = /https?:\/\/[^.]+\.s3[.-][^.]+\.amazonaws\.com\//i;
                const s3PatternLegacy = /https?:\/\/[^.]+\.s3\.amazonaws\.com\//i;

                if (s3Pattern.test(video.s3Url)) {
                    publicUrl = video.s3Url.replace(s3Pattern, cfPrefix);
                } else if (s3PatternLegacy.test(video.s3Url)) {
                    publicUrl = video.s3Url.replace(s3PatternLegacy, cfPrefix);
                }

                if (video.thumbnailUrl) {
                    if (s3Pattern.test(video.thumbnailUrl)) {
                        publicThumb = video.thumbnailUrl.replace(s3Pattern, cfPrefix);
                    } else if (s3PatternLegacy.test(video.thumbnailUrl)) {
                        publicThumb = video.thumbnailUrl.replace(s3PatternLegacy, cfPrefix);
                    }
                }
            }

            return {
                ...video,
                s3Url: publicUrl,
                thumbnailUrl: publicThumb
            };
        });

        return NextResponse.json({ movies: transformedVideos });
    } catch (error: any) {
        console.error('GET /api/library/movies error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch library' },
            { status: 500 }
        );
    }
}
