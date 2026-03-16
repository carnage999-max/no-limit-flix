import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

type ReelRow = {
    id: string;
    title: string;
    description: string | null;
    fileName: string | null;
    thumbnailUrl: string | null;
    playbackType: string | null;
    cloudfrontPath: string;
    s3Url: string | null;
    duration: number | null;
    fileSize: bigint | number | string | null;
    hasAudio: boolean | null;
    status: string;
    sourceIdentifier: string;
    sourcePageUrl: string | null;
    createdAt: string | Date;
};

export async function GET(request: NextRequest) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
        const limit = Math.min(100, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || 20)));
        const status = request.nextUrl.searchParams.get('status')?.trim() || '';
        const skip = (page - 1) * limit;

        const rows = status
            ? await prisma.$queryRawUnsafe(
                `SELECT
                    "id",
                    "title",
                    "description",
                    "fileName",
                    "thumbnailUrl",
                    "playbackType",
                    "cloudfrontPath",
                    "s3Url",
                    "duration",
                    "fileSize",
                    "hasAudio",
                    "status",
                    "sourceIdentifier",
                    "sourcePageUrl",
                    "createdAt"
                 FROM "Reel"
                 WHERE "status" = $1
                 ORDER BY "createdAt" DESC
                 OFFSET $2
                 LIMIT $3`,
                status,
                skip,
                limit
            )
            : await prisma.$queryRawUnsafe(
                `SELECT
                    "id",
                    "title",
                    "description",
                    "fileName",
                    "thumbnailUrl",
                    "playbackType",
                    "cloudfrontPath",
                    "s3Url",
                    "duration",
                    "fileSize",
                    "hasAudio",
                    "status",
                    "sourceIdentifier",
                    "sourcePageUrl",
                    "createdAt"
                 FROM "Reel"
                 ORDER BY "createdAt" DESC
                 OFFSET $1
                 LIMIT $2`,
                skip,
                limit
            );

        const countRows: Array<{ total: number }> = status
            ? await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS total FROM "Reel" WHERE "status" = $1`, status)
            : await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS total FROM "Reel"`);

        const total = Number(countRows?.[0]?.total || 0);
        const items = (rows as ReelRow[]).map((row) => ({
            ...row,
            fileSize: row.fileSize ? String(row.fileSize) : null,
        }));

        return NextResponse.json({
            success: true,
            items,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
            },
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        console.error('Admin reels list error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reels list', details: message },
            { status: 500 }
        );
    }
}
