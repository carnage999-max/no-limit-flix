import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-actions';

type JsonSerialized =
    | string
    | number
    | boolean
    | null
    | JsonSerialized[]
    | { [key: string]: JsonSerialized };

// Helper to convert BigInt to string for JSON serialization
function serializeData(data: unknown): JsonSerialized {
    if (data === null || data === undefined) return null;
    
    if (typeof data === 'bigint') {
        return data.toString();
    }
    
    if (data instanceof Date) {
        return data.toISOString();
    }
    
    if (Array.isArray(data)) {
        return data.map(serializeData);
    }
    
    if (typeof data === 'object') {
        const serialized: { [key: string]: JsonSerialized } = {};
        for (const [key, value] of Object.entries(data)) {
            serialized[key] = serializeData(value);
        }
        return serialized;
    }
    
    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
        return data;
    }

    return String(data);
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> | { id: string } }
) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

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
        const {
            title,
            description,
            type,
            seriesTitle,
            seasonNumber,
            episodeNumber,
            releaseYear,
            tmdbId,
            thumbnailUrl,
            genre,
            rating,
            sourceProvider,
            sourcePageUrl,
            sourceRights,
            sourceLicenseUrl,
        } = body;

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

        const nextThumbnailUrl = typeof thumbnailUrl === 'string' && thumbnailUrl.trim() ? thumbnailUrl.trim() : null;
        const previousThumbnailUrl = video.thumbnailUrl || null;
        const thumbnailChanged = nextThumbnailUrl !== previousThumbnailUrl;
        const nextType = type === 'series' ? 'series' : 'movie';
        const nextSeasonNumber = nextType === 'series' && seasonNumber !== null && seasonNumber !== undefined && `${seasonNumber}`.trim() !== ''
            ? Number(seasonNumber)
            : null;
        const nextEpisodeNumber = nextType === 'series' && episodeNumber !== null && episodeNumber !== undefined && `${episodeNumber}`.trim() !== ''
            ? Number(episodeNumber)
            : null;

        const updated = await prisma.video.update({
            where: { id },
            data: {
                title,
                description: typeof description === 'string' ? description : null,
                type: nextType,
                seriesTitle: nextType === 'series' && typeof seriesTitle === 'string' && seriesTitle.trim() ? seriesTitle.trim() : null,
                seasonNumber: Number.isFinite(nextSeasonNumber) ? nextSeasonNumber : null,
                episodeNumber: Number.isFinite(nextEpisodeNumber) ? nextEpisodeNumber : null,
                releaseYear: releaseYear ? Number(releaseYear) : null,
                tmdbId: typeof tmdbId === 'string' && tmdbId.trim() ? tmdbId.trim() : null,
                thumbnailUrl: nextThumbnailUrl,
                thumbnailSource: thumbnailChanged ? 'manual' : undefined,
                thumbnailLocked: thumbnailChanged ? true : undefined,
                thumbnailUpdatedByUserId: thumbnailChanged ? auth.user?.id || null : undefined,
                thumbnailUpdatedAt: thumbnailChanged ? new Date() : undefined,
                genre: typeof genre === 'string' && genre.trim() ? genre.trim() : null,
                rating: typeof rating === 'string' && rating.trim() ? rating.trim() : null,
                sourceProvider: typeof sourceProvider === 'string' && sourceProvider.trim() ? sourceProvider.trim() : null,
                sourcePageUrl: typeof sourcePageUrl === 'string' && sourcePageUrl.trim() ? sourcePageUrl.trim() : null,
                sourceRights: typeof sourceRights === 'string' && sourceRights.trim() ? sourceRights.trim() : null,
                sourceLicenseUrl: typeof sourceLicenseUrl === 'string' && sourceLicenseUrl.trim() ? sourceLicenseUrl.trim() : null,
                updatedAt: new Date(),
            },
        });

        if (thumbnailChanged) {
            await recordAdminAction({
                actorId: auth.user?.id,
                action: 'video.thumbnail.manual_update',
                entityType: 'Video',
                entityId: id,
                videoId: id,
                metadata: {
                    previousThumbnailUrl,
                    nextThumbnailUrl,
                },
            });
        }

        // Serialize the response to handle BigInt values
        const serialized = serializeData(updated);
        return NextResponse.json({ video: serialized });
    } catch (error) {
        console.error('Error updating video:', error);
        return NextResponse.json(
            { error: 'Failed to update video', details: (error as Error).message },
            { status: 500 }
        );
    }
}
