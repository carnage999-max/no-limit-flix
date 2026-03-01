import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

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

        const cloudFrontUrl = process.env.NEXT_PUBLIC_CLOUDFRONT_URL;
        const cfBase = cloudFrontUrl ? (cloudFrontUrl.endsWith('/') ? cloudFrontUrl : `${cloudFrontUrl}/`) : null;

        const transformed = videos.map((video: any) => {
            let publicUrl = video.s3Url;
            let publicThumb = video.thumbnailUrl;
            const isExternal = video.sourceProvider === 'internet_archive' || video.sourceType === 'external_legal';

            if (cfBase && !isExternal) {
                const cfPrefix = cfBase.startsWith('http') ? cfBase : `https://${cfBase}`;
                const s3Pattern = /https?:\/\/[^.]+\.s3[.-][^.]+\.amazonaws\.com\//i;
                const s3PatternLegacy = /https?:\/\/[^.]+\.s3\.amazonaws\.com\//i;

                if (video.s3Url && s3Pattern.test(video.s3Url)) {
                    publicUrl = video.s3Url.replace(s3Pattern, cfPrefix);
                } else if (video.s3Url && s3PatternLegacy.test(video.s3Url)) {
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
                thumbnailUrl: publicThumb,
                fileSize: video.fileSize ? video.fileSize.toString() : null,
            };
        });

        return NextResponse.json({ results: transformed });
    } catch (error: any) {
        console.error('GET /api/library/search error:', error);
        return NextResponse.json({ error: 'Failed to search library' }, { status: 500 });
    }
}
