import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { getSessionUser } from '@/lib/auth-server';
import { isReviewSafeVideo } from '@/lib/review-safety';
import { getAssetReferenceCandidates, normalizeAssetReference } from '@/lib/watch-asset';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ assetId: string }> }
) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { assetId } = await params;
        const normalizedAssetId = normalizeAssetReference(assetId);

        if (!normalizedAssetId) {
            return NextResponse.json(
                { error: 'Asset ID is required' },
                { status: 400 }
            );
        }

        const select = {
            id: true,
            title: true,
            description: true,
            thumbnailUrl: true,
            s3Url: true,
            resolution: true,
            duration: true,
            tmdbId: true,
            status: true,
            sourceType: true,
            sourceProvider: true,
            sourcePageUrl: true,
            sourceRights: true,
            sourceLicenseUrl: true,
        } as const;

        let video = await prisma.video.findUnique({
            where: { id: normalizedAssetId },
            select,
        });

        if (!video) {
            const candidates = getAssetReferenceCandidates(normalizedAssetId);
            video = await prisma.video.findFirst({
                where: {
                    status: 'completed',
                    OR: [
                        { s3Url: { in: candidates } },
                        { cloudfrontPath: { in: candidates } },
                        { s3KeyPlayback: { in: candidates } },
                    ],
                },
                select,
            });
        }

        if (!video || video.status !== 'completed') {
            return NextResponse.json(
                { error: 'Video not found or not ready for playback' },
                { status: 404 }
            );
        }

        if (!isReviewSafeVideo(video)) {
            return NextResponse.json(
                { error: 'Video not available' },
                { status: 404 }
            );
        }

        const transformedVideo = {
            ...video,
            s3Url: resolveMediaUrl(video.s3Url),
            thumbnailUrl: resolveMediaUrl(video.thumbnailUrl),
        };

        return NextResponse.json({ video: transformedVideo });
    } catch (error) {
        console.error('Error fetching video:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video' },
            { status: 500 }
        );
    }
}
