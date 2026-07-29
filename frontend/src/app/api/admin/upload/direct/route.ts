import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { writeMediaBuffer } from '@/lib/media-storage';

const ALLOWED_THUMBNAIL_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const cleanExtension = (value: string | undefined, fallback: string) => {
    const extension = (value || fallback).toLowerCase().replace(/[^a-z0-9]/g, '');
    return extension || fallback;
};

const extensionFromFileName = (fileName: string, fallback: string) => {
    const rawExtension = fileName.includes('.') ? fileName.split('.').pop() : undefined;
    return cleanExtension(rawExtension, fallback);
};

const optionalNumber = (value: FormDataEntryValue | null) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const optionalInt = (value: FormDataEntryValue | null) => {
    const parsed = optionalNumber(value);
    return parsed === null ? null : Math.trunc(parsed);
};

const optionalString = (value: FormDataEntryValue | null) => {
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed || null;
};

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const formData = await request.formData();
        const file = formData.get('file');
        const thumbnail = formData.get('thumbnail');
        const title = optionalString(formData.get('title'));

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Video file is required' }, { status: 400 });
        }

        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }

        if (thumbnail instanceof File && !ALLOWED_THUMBNAIL_TYPES.has(thumbnail.type)) {
            return NextResponse.json({ error: 'Thumbnail must be JPG, PNG, or WEBP' }, { status: 400 });
        }

        const videoId = crypto.randomUUID();
        const videoExtension = extensionFromFileName(file.name, 'mp4');
        const videoPath = path.posix.join('videos', `${videoId}.${videoExtension}`);
        const videoStored = await writeMediaBuffer(videoPath, Buffer.from(await file.arrayBuffer()));

        let thumbnailUrl: string | null = null;
        if (thumbnail instanceof File && thumbnail.size > 0) {
            const thumbExtension = cleanExtension(thumbnail.type.split('/')[1]?.replace('jpeg', 'jpg'), 'jpg');
            const thumbPath = path.posix.join('thumbnails', `${videoId}.${thumbExtension}`);
            const thumbStored = await writeMediaBuffer(thumbPath, Buffer.from(await thumbnail.arrayBuffer()));
            thumbnailUrl = thumbStored.publicUrl;
        }

        const assetType = optionalString(formData.get('type')) === 'series' ? 'series' : 'movie';
        const video = await prisma.video.create({
            data: {
                id: videoId,
                title,
                description: optionalString(formData.get('description')),
                type: assetType,
                seasonNumber: assetType === 'series' ? optionalInt(formData.get('seasonNumber')) : null,
                episodeNumber: assetType === 'series' ? optionalInt(formData.get('episodeNumber')) : null,
                seriesTitle: assetType === 'series' ? optionalString(formData.get('seriesTitle')) : null,
                tmdbId: optionalString(formData.get('tmdbId')),
                releaseYear: optionalInt(formData.get('releaseYear')),
                duration: optionalNumber(formData.get('duration')),
                resolution: optionalString(formData.get('resolution')),
                genre: optionalString(formData.get('genre')),
                rating: optionalString(formData.get('rating')),
                thumbnailUrl,
                status: 'completed',
                playbackType: 'mp4',
                s3KeyPlayback: videoStored.relativePath,
                cloudfrontPath: videoStored.relativePath,
                s3KeySource: null,
                s3Key: videoStored.relativePath,
                s3Url: videoStored.publicUrl,
                sourceType: 'internal',
                fileSize: BigInt(file.size),
                mimeType: file.type || 'video/mp4',
            },
        });

        return NextResponse.json({
            success: true,
            videoId: video.id,
            video: {
                ...video,
                fileSize: video.fileSize?.toString() || null,
            },
        }, { status: 201 });
    } catch (error) {
        console.error('Direct media upload error:', error);
        return NextResponse.json({ error: 'Failed to upload media' }, { status: 500 });
    }
}
