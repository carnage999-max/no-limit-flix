import { NextRequest, NextResponse } from 'next/server';
import { getMovieDetails } from '@/lib/tmdb';
import prisma from '@/lib/db';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        // If non-numeric, treat as internal asset ID and return asset details.
        if (!/^\d+$/.test(id)) {
            const video = await prisma.video.findUnique({
                where: { id },
                select: {
                    id: true,
                    title: true,
                    description: true,
                    thumbnailUrl: true,
                    s3Url: true,
                    duration: true,
                    releaseYear: true,
                    resolution: true,
                    playbackType: true,
                    sourceType: true,
                    sourceProvider: true,
                    sourcePageUrl: true,
                    sourceRights: true,
                    sourceLicenseUrl: true,
                    format: true,
                    fileSize: true,
                }
            });

            if (!video) {
                return NextResponse.json(
                    { error: 'Title not found' },
                    { status: 404 }
                );
            }

            return NextResponse.json({
                id: video.id,
                title: video.title,
                description: video.description,
                poster: video.thumbnailUrl,
                year: video.releaseYear,
                runtime: video.duration ? Math.round(video.duration / 60) : null,
                assets: [
                    {
                        id: video.id,
                        playbackUrl: video.s3Url,
                        playbackType: video.playbackType,
                        sourceType: video.sourceType,
                        sourceProvider: video.sourceProvider,
                        sourcePageUrl: video.sourcePageUrl,
                        sourceRights: video.sourceRights,
                        sourceLicenseUrl: video.sourceLicenseUrl,
                        format: video.format,
                        fileSize: video.fileSize?.toString() || null,
                        duration: video.duration,
                        resolution: video.resolution,
                    }
                ]
            });
        }

        const movie = await getMovieDetails(id);

        if (!movie) {
            return NextResponse.json(
                { error: 'Movie not found' },
                { status: 404 }
            );
        }

        const assets = await prisma.video.findMany({
            where: {
                status: 'completed',
                OR: [
                    { tmdbId: id },
                    {
                        title: {
                            equals: movie.title,
                            mode: 'insensitive'
                        },
                        sourceProvider: 'internet_archive'
                    }
                ]
            },
            select: {
                id: true,
                title: true,
                s3Url: true,
                playbackType: true,
                sourceType: true,
                sourceProvider: true,
                sourcePageUrl: true,
                sourceRights: true,
                sourceLicenseUrl: true,
                format: true,
                fileSize: true,
                duration: true,
                resolution: true,
            }
        });

        return NextResponse.json({
            ...movie,
            assets: assets.map((asset) => ({
                id: asset.id,
                title: asset.title,
                playbackUrl: asset.s3Url,
                playbackType: asset.playbackType,
                sourceType: asset.sourceType,
                sourceProvider: asset.sourceProvider,
                sourcePageUrl: asset.sourcePageUrl,
                sourceRights: asset.sourceRights,
                sourceLicenseUrl: asset.sourceLicenseUrl,
                format: asset.format,
                fileSize: asset.fileSize?.toString() || null,
                duration: asset.duration,
                resolution: asset.resolution,
            }))
        });
    } catch (error: any) {
        console.error('Error fetching movie details:', error);
        return NextResponse.json(
            { error: 'Failed to fetch title details' },
            { status: 500 }
        );
    }
}
