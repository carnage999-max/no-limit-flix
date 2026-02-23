import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Handle both Promise and direct params (for Next.js version compatibility)
        const resolvedParams = params instanceof Promise ? await params : params;
        const { id } = resolvedParams;

        if (!id) {
            console.error('Missing video ID in request');
            return NextResponse.json(
                { error: 'Video ID is required' },
                { status: 400 }
            );
        }

        const body = await request.json();
        const { title, description, releaseYear, tmdbId, thumbnailUrl } = body;

        if (!title) {
            return NextResponse.json(
                { error: 'Title is required' },
                { status: 400 }
            );
        }

        const video = await prisma.video.findUnique({
            where: { id },
        });

        if (!video) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        const updated = await prisma.video.update({
            where: { id },
            data: {
                title,
                description: description || undefined,
                releaseYear: releaseYear || undefined,
                tmdbId: tmdbId || undefined,
                thumbnailUrl: thumbnailUrl || undefined,
                updatedAt: new Date(),
            },
        });

        return NextResponse.json({ video: updated });
    } catch (error) {
        console.error('Error updating video:', error);
        return NextResponse.json(
            { error: 'Failed to update video' },
            { status: 500 }
        );
    }
}
