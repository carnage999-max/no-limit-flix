import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-actions';
import { ensureSeriesMetadata } from '@/lib/series-metadata';

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
            editScope,
            seriesId,
            originalSeriesTitle,
            title,
            description,
            type,
            playbackType,
            s3KeyPlayback,
            cloudfrontPath,
            s3Url,
            archiveIdentifier,
            duration,
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
        const nextPlaybackType = playbackType === 'hls' ? 'hls' : 'mp4';
        const nextS3KeyPlayback = typeof s3KeyPlayback === 'string' && s3KeyPlayback.trim()
            ? s3KeyPlayback.trim()
            : video.s3KeyPlayback;
        const nextCloudfrontPath = typeof cloudfrontPath === 'string' && cloudfrontPath.trim()
            ? cloudfrontPath.trim()
            : video.cloudfrontPath;
        const nextS3Url = typeof s3Url === 'string' && s3Url.trim()
            ? s3Url.trim()
            : null;
        const nextArchiveIdentifier = typeof archiveIdentifier === 'string' && archiveIdentifier.trim()
            ? archiveIdentifier.trim()
            : video.archiveIdentifier;
        const nextDuration = duration !== null && duration !== undefined && `${duration}`.trim() !== ''
            ? Number(duration)
            : null;
        const isSeriesEdit = editScope === 'series' && video.type === 'series';
        const nextSeasonNumber = nextType === 'series' && seasonNumber !== null && seasonNumber !== undefined && `${seasonNumber}`.trim() !== ''
            ? Number(seasonNumber)
            : null;
        const nextEpisodeNumber = nextType === 'series' && episodeNumber !== null && episodeNumber !== undefined && `${episodeNumber}`.trim() !== ''
            ? Number(episodeNumber)
            : null;

        if (isSeriesEdit) {
            const currentSeriesId = typeof seriesId === 'string' && seriesId.trim()
                ? seriesId.trim()
                : video.seriesId;
            const currentSeriesTitle = typeof originalSeriesTitle === 'string' && originalSeriesTitle.trim()
                ? originalSeriesTitle.trim()
                : video.seriesTitle;
            const nextSeriesTitle = typeof seriesTitle === 'string' && seriesTitle.trim()
                ? seriesTitle.trim()
                : String(title).trim();

            if ((!currentSeriesId && !currentSeriesTitle) || !nextSeriesTitle) {
                return NextResponse.json(
                    { error: 'Series title is required for series metadata edits' },
                    { status: 400 }
                );
            }

            const parentData = {
                title: nextSeriesTitle,
                description: typeof description === 'string' ? description : null,
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
            };

            const seriesRecord = currentSeriesId
                ? await prisma.series.update({
                    where: { id: currentSeriesId },
                    data: parentData,
                })
                : await prisma.series.upsert({
                    where: { title: currentSeriesTitle || nextSeriesTitle },
                    create: parentData,
                    update: parentData,
                });

            const seriesWhere = {
                type: 'series',
                OR: [
                    { seriesId: seriesRecord.id },
                    ...(currentSeriesTitle ? [{ seriesTitle: currentSeriesTitle }] : []),
                ],
            };

            const mirroredEpisodeData = {
                seriesId: seriesRecord.id,
                seriesTitle: nextSeriesTitle,
                description: parentData.description,
                releaseYear: parentData.releaseYear,
                tmdbId: parentData.tmdbId,
                genre: parentData.genre,
                rating: parentData.rating,
                sourceProvider: parentData.sourceProvider,
                sourcePageUrl: parentData.sourcePageUrl,
                sourceRights: parentData.sourceRights,
                sourceLicenseUrl: parentData.sourceLicenseUrl,
                updatedAt: new Date(),
            };

            const updateResult = await prisma.video.updateMany({
                where: seriesWhere,
                data: mirroredEpisodeData,
            });

            let thumbnailUpdateCount = 0;
            if (thumbnailChanged && nextThumbnailUrl) {
                const thumbnailResult = await prisma.video.updateMany({
                    where: {
                        ...seriesWhere,
                        thumbnailLocked: false,
                    },
                    data: {
                        thumbnailUrl: nextThumbnailUrl,
                        thumbnailSource: 'manual',
                        thumbnailUpdatedByUserId: auth.user?.id || null,
                        thumbnailUpdatedAt: new Date(),
                    },
                });
                thumbnailUpdateCount = thumbnailResult.count;
            }

            if (updateResult.count === 0) {
                return NextResponse.json(
                    { error: 'No episodes found for this series metadata update' },
                    { status: 404 }
                );
            }

            const updatedEpisodes = await prisma.video.findMany({
                where: {
                    type: 'series',
                    seriesId: seriesRecord.id,
                },
                orderBy: [
                    { seasonNumber: 'asc' },
                    { episodeNumber: 'asc' },
                ],
                take: 1,
            });

            await recordAdminAction({
                actorId: auth.user?.id,
                action: 'series.metadata.update',
                entityType: 'Series',
                entityId: seriesRecord.id,
                videoId: id,
                metadata: {
                    seriesId: seriesRecord.id,
                    previousSeriesTitle: currentSeriesTitle,
                    nextSeriesTitle,
                    updatedCount: updateResult.count,
                    thumbnailUpdateCount,
                    thumbnailChanged,
                    previousThumbnailUrl,
                    nextThumbnailUrl,
                },
            });

            const serialized = serializeData(updatedEpisodes[0] || {
                id,
                seriesTitle: nextSeriesTitle,
                updatedCount: updateResult.count,
            });
            return NextResponse.json({ video: serialized, updatedCount: updateResult.count });
        }

        const episodeSeries = nextType === 'series'
            ? await ensureSeriesMetadata({
                title: typeof seriesTitle === 'string' && seriesTitle.trim() ? seriesTitle.trim() : null,
            })
            : null;

        const updated = await prisma.video.update({
            where: { id },
            data: {
                title,
                description: typeof description === 'string' ? description : null,
                type: nextType,
                playbackType: nextPlaybackType,
                s3KeyPlayback: nextS3KeyPlayback,
                cloudfrontPath: nextCloudfrontPath,
                s3Url: nextS3Url,
                archiveIdentifier: nextArchiveIdentifier,
                seriesId: episodeSeries?.id || null,
                seriesTitle: nextType === 'series' && typeof seriesTitle === 'string' && seriesTitle.trim() ? seriesTitle.trim() : null,
                seasonNumber: Number.isFinite(nextSeasonNumber) ? nextSeasonNumber : null,
                episodeNumber: Number.isFinite(nextEpisodeNumber) ? nextEpisodeNumber : null,
                duration: Number.isFinite(nextDuration) ? nextDuration : null,
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

        await recordAdminAction({
            actorId: auth.user?.id,
            action: 'video.metadata.update',
            entityType: 'Video',
            entityId: id,
            videoId: id,
            metadata: {
                type: nextType,
                playbackType: nextPlaybackType,
                s3KeyPlaybackChanged: nextS3KeyPlayback !== video.s3KeyPlayback,
                cloudfrontPathChanged: nextCloudfrontPath !== video.cloudfrontPath,
                archiveIdentifierChanged: nextArchiveIdentifier !== video.archiveIdentifier,
                seasonNumber: Number.isFinite(nextSeasonNumber) ? nextSeasonNumber : null,
                episodeNumber: Number.isFinite(nextEpisodeNumber) ? nextEpisodeNumber : null,
            },
        });

        // Serialize the response to handle BigInt values
        const serialized = serializeData(updated);
        return NextResponse.json({ video: serialized });
    } catch (error) {
        console.error('Error updating video:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return NextResponse.json(
                { error: 'Another video already uses that playback key or Archive identifier' },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: 'Failed to update video', details: (error as Error).message },
            { status: 500 }
        );
    }
}
