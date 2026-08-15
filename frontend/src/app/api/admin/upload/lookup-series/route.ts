import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const seriesTitle = request.nextUrl.searchParams.get('seriesTitle');

        if (!seriesTitle || seriesTitle.trim().length === 0) {
            return NextResponse.json(
                { error: 'Series title is required' },
                { status: 400 }
            );
        }

        const series = await prisma.series.findFirst({
            where: {
                title: {
                    equals: seriesTitle.trim(),
                    mode: 'insensitive',
                },
            },
            select: {
                tmdbId: true,
                description: true,
                releaseYear: true,
                genre: true,
                rating: true,
            },
        });

        if (series) {
            return NextResponse.json({
                message: 'Series metadata found',
                metadata: {
                    tmdbId: series.tmdbId,
                    description: series.description,
                    releaseYear: series.releaseYear,
                    genre: series.genre,
                    rating: series.rating,
                },
            });
        }

        // Fallback for rows imported before the parent Series table existed.
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
