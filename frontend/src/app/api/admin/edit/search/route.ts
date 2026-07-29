import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

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
                genre: true,
                rating: true,
                sourceProvider: true,
                sourcePageUrl: true,
                sourceRights: true,
                sourceLicenseUrl: true,
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
                    genre: true,
                    rating: true,
                    sourceProvider: true,
                    sourcePageUrl: true,
                    sourceRights: true,
                    sourceLicenseUrl: true,
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

        if (video) {
            video.thumbnailUrl = resolveMediaUrl(video.thumbnailUrl);
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
