import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { writeMediaBuffer } from '@/lib/media-storage';

const MAX_THUMBNAIL_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const extensionFromFile = (file: File) => {
    const mimeExtension = file.type.split('/')[1]?.replace('jpeg', 'jpg');
    const nameExtension = file.name.includes('.') ? file.name.split('.').pop() : null;
    const extension = (mimeExtension || nameExtension || 'jpg').toLowerCase();
    return extension.replace(/[^a-z0-9]/g, '') || 'jpg';
};

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const formData = await request.formData();
        const file = formData.get('file');
        const videoId = String(formData.get('videoId') || '').trim();

        if (!videoId || !(file instanceof File)) {
            return NextResponse.json({ error: 'videoId and image file are required' }, { status: 400 });
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            return NextResponse.json({ error: 'Only JPG, PNG, and WEBP thumbnails are allowed' }, { status: 400 });
        }

        if (file.size > MAX_THUMBNAIL_BYTES) {
            return NextResponse.json({ error: 'Thumbnail must be 10MB or smaller' }, { status: 400 });
        }

        const video = await prisma.video.findUnique({
            where: { id: videoId },
            select: { id: true },
        });

        if (!video) {
            return NextResponse.json({ error: 'Video not found' }, { status: 404 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const extension = extensionFromFile(file);
        const mediaPath = path.posix.join('thumbnails', `${videoId}.${extension}`);
        const stored = await writeMediaBuffer(mediaPath, buffer);

        return NextResponse.json({
            thumbnailUrl: stored.publicUrl,
            mediaPath: stored.relativePath,
        });
    } catch (error) {
        console.error('Thumbnail upload error:', error);
        return NextResponse.json({ error: 'Failed to upload thumbnail' }, { status: 500 });
    }
}
