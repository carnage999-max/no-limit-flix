import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ assetId: string }> }
) {
    try {
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
            },
        });

        if (!video || video.status !== 'completed') {
            return NextResponse.json(
                { error: 'Video not found or not ready for playback' },
                { status: 404 }
            );
        }

        return NextResponse.json({ video });
    } catch (error) {
        console.error('Error fetching video:', error);
        return NextResponse.json(
            { error: 'Failed to fetch video' },
            { status: 500 }
        );
    }
}
