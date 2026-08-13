import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import path from 'path';
import prisma from '@/lib/db';
import { getSessionUser } from '@/lib/auth-server';
import { writeMediaBuffer } from '@/lib/media-storage';

const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

const extensionFromFile = (file: File) => {
    const mimeExtension = file.type.split('/')[1]?.replace('jpeg', 'jpg');
    const nameExtension = file.name.includes('.') ? file.name.split('.').pop() : null;
    const extension = (mimeExtension || nameExtension || 'jpg').toLowerCase();
    return extension.replace(/[^a-z0-9]/g, '') || 'jpg';
};

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getSessionUser(request);
        if (!sessionUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file');

        if (!(file instanceof File)) {
            return NextResponse.json({ error: 'Image file is required' }, { status: 400 });
        }

        if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
            return NextResponse.json({ error: 'Only JPG, PNG, and WEBP avatars are allowed' }, { status: 400 });
        }

        if (file.size > MAX_AVATAR_BYTES) {
            return NextResponse.json({ error: 'Avatar must be 10MB or smaller' }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const extension = extensionFromFile(file);
        const mediaPath = path.posix.join('avatars', sessionUser.id, `${crypto.randomUUID()}.${extension}`);
        const stored = await writeMediaBuffer(mediaPath, buffer);

        const updated = await prisma.user.update({
            where: { id: sessionUser.id },
            data: { avatar: stored.publicUrl },
            select: { avatar: true },
        });

        return NextResponse.json({
            avatarUrl: updated.avatar,
            mediaPath: stored.relativePath,
        });
    } catch (error) {
        console.error('Avatar upload error:', error);
        return NextResponse.json({ error: 'Failed to upload avatar' }, { status: 500 });
    }
}
