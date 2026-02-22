import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { transformToCloudFront } from '@/lib/utils';

export async function GET(request: NextRequest) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const q = request.nextUrl.searchParams.get('q');

        if (!q || q.trim().length === 0) {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        // Search by ID first
        let video = await prisma.video.findUnique({
            where: { id: q },
            select: {
                id: true,
                title: true,
                description: true,
                type: true,
                thumbnailUrl: true,
                releaseYear: true,
                tmdbId: true,
            },
        });

        // If not found by ID, search by title
        if (!video) {
            const results = await prisma.video.findMany({
                where: {
                    title: {
                        contains: q,
                        mode: 'insensitive',
                    },
                },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    type: true,
                    thumbnailUrl: true,
                    releaseYear: true,
                    tmdbId: true,
                },
                take: 1,
            });

            if (results.length === 0) {
                return NextResponse.json(
                    { error: 'Video not found' },
                    { status: 404 }
                );
            }

            video = results[0];
        }

        // Transform URLs to CloudFront
        if (video) {
            video.thumbnailUrl = transformToCloudFront(video.thumbnailUrl);
        }

        return NextResponse.json({ video });
    } catch (error) {
        console.error('Error searching videos:', error);
        return NextResponse.json(
            { error: 'Failed to search videos' },
            { status: 500 }
        );
    }
}
