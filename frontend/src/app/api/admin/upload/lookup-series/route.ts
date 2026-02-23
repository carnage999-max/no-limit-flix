import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
    try {
        const seriesTitle = request.nextUrl.searchParams.get('seriesTitle');

        if (!seriesTitle || seriesTitle.trim().length === 0) {
            return NextResponse.json(
                { error: 'Series title is required' },
                { status: 400 }
            );
        }

        // Find the first episode of this series to get metadata
        const video = await prisma.video.findFirst({
            where: {
                seriesTitle: {
                    equals: seriesTitle.trim(),
                    mode: 'insensitive',
                },
                type: 'series',
            },
            select: {
                tmdbId: true,
                description: true,
                releaseYear: true,
                genre: true,
                rating: true,
            },
        });

        if (!video) {
            return NextResponse.json(
                { message: 'No existing series found with this name', metadata: null },
                { status: 200 }
            );
        }

        return NextResponse.json({
            message: 'Series metadata found',
            metadata: {
                tmdbId: video.tmdbId,
                description: video.description,
                releaseYear: video.releaseYear,
                genre: video.genre,
                rating: video.rating,
            },
        });
    } catch (error) {
        console.error('Error fetching series metadata:', error);
        return NextResponse.json(
            { error: 'Failed to fetch series metadata' },
            { status: 500 }
        );
    }
}
