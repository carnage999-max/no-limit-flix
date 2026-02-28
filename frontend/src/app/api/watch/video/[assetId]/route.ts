import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { transformToCloudFront } from '@/lib/utils';
import { getSessionUser } from '@/lib/auth-server';

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

        if (!assetId) {
            return NextResponse.json(
                { error: 'Asset ID is required' },
                { status: 400 }
            );
        }

        const video = await prisma.video.findUnique({
            where: { id: assetId },
            select: {
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
            },
        });

        if (!video || video.status !== 'completed') {
            return NextResponse.json(
                { error: 'Video not found or not ready for playback' },
                { status: 404 }
            );
        }

        const transformedVideo = {
            ...video,
            s3Url: transformToCloudFront(video.s3Url),
            thumbnailUrl: transformToCloudFront(video.thumbnailUrl),
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
