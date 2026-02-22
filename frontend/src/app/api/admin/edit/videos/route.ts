import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET() {
    try {
        const videos = await prisma.video.findMany({
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                thumbnailUrl: true,
                releaseYear: true,
                tmdbId: true,
                status: true,
            },
            orderBy: { createdAt: 'desc' },
            take: 100,
        });

        return NextResponse.json({ videos });
    } catch (error) {
        console.error('Error fetching videos:', error);
        return NextResponse.json(
            { error: 'Failed to fetch videos' },
            { status: 500 }
        );
    }
}
