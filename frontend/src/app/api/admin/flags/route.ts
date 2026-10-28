import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { recordAdminAction } from '@/lib/admin-actions';

const MAX_REASON_LENGTH = 500;

// Open flags, newest first. The movie list uses this to mark flagged titles for admins.
export async function GET(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const flags = await prisma.videoFlag.findMany({
        where: { status: 'open' },
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            videoId: true,
            reason: true,
            createdAt: true,
            flaggedBy: { select: { username: true } },
            video: { select: { id: true, title: true, thumbnailUrl: true, type: true, releaseYear: true } },
        },
    });

    return NextResponse.json({ flags });
}

// Flags a movie as having suspected wrong metadata. Flagging twice keeps the first open flag.
export async function POST(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const body = await request.json().catch(() => ({}));
    const videoId = typeof body?.videoId === 'string' ? body.videoId.trim() : '';
    const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, MAX_REASON_LENGTH) : '';
    if (!videoId) {
        return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const video = await prisma.video.findUnique({ where: { id: videoId }, select: { id: true } });
    if (!video) {
        return NextResponse.json({ error: 'Movie not found' }, { status: 404 });
    }

    const existing = await prisma.videoFlag.findFirst({
        where: { videoId, status: 'open' },
        select: { id: true, videoId: true, reason: true, createdAt: true },
    });
    if (existing) {
        return NextResponse.json({ flag: existing, created: false });
    }

    const flag = await prisma.videoFlag.create({
        data: { videoId, flaggedById: auth.user?.id ?? null, reason: reason || null },
        select: { id: true, videoId: true, reason: true, createdAt: true },
    });

    await recordAdminAction({
        actorId: auth.user?.id,
        action: 'video.flag.create',
        entityType: 'Video',
        entityId: videoId,
        videoId,
        metadata: { flagId: flag.id, reason: reason || null },
    });

    return NextResponse.json({ flag, created: true }, { status: 201 });
}

// Clears the flag once the metadata has been checked or fixed. The row is kept as history.
export async function DELETE(request: NextRequest) {
    const auth = await requireAdmin(request);
    if (auth.response) return auth.response;

    const videoId = request.nextUrl.searchParams.get('videoId')?.trim();
    if (!videoId) {
        return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const result = await prisma.videoFlag.updateMany({
        where: { videoId, status: 'open' },
        data: { status: 'resolved', resolvedAt: new Date() },
    });

    if (result.count > 0) {
        await recordAdminAction({
            actorId: auth.user?.id,
            action: 'video.flag.resolve',
            entityType: 'Video',
            entityId: videoId,
            videoId,
            metadata: { resolved: result.count },
        });
    }

    return NextResponse.json({ resolved: result.count });
}
