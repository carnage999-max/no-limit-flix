import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

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
