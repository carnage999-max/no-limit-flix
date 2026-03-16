import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import prisma from '@/lib/db';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const FALLBACK_DESCRIPTION = 'Public domain short-form video.';

type ReelRow = {
    id: string;
    title: string;
    description: string | null;
    thumbnailUrl: string | null;
    playbackType: string | null;
    cloudfrontPath: string | null;
    s3Url: string | null;
    duration: number | null;
    fileSize: bigint | number | string | null;
    mimeType: string | null;
    width: number | null;
    height: number | null;
    resolution: string | null;
    hasAudio: boolean | null;
    status: string | null;
    sourceProvider: string | null;
    sourceIdentifier: string | null;
    sourcePageUrl: string | null;
    sourceLicenseUrl: string | null;
    sourceRights: string | null;
    createdAt: string | Date;
};

const safeEqual = (a: string, b: string) => {
    const left = Buffer.from(a);
    const right = Buffer.from(b);
    if (left.length !== right.length) return false;
    return crypto.timingSafeEqual(left, right);
};

const isAuthorized = (request: NextRequest) => {
    const expectedId = process.env.REELS_CLIENT_ID || '';
    const expectedSecret = process.env.REELS_CLIENT_SECRET || '';

    if (!expectedId || !expectedSecret) {
        return { ok: false as const, status: 503, error: 'Reels client credentials are not configured' };
    }

    const providedId = request.headers.get('x-reels-client-id')
        || request.headers.get('x-client-id')
        || '';
    const providedSecret = request.headers.get('x-reels-client-secret')
        || request.headers.get('x-client-secret')
        || '';

    if (!providedId || !providedSecret) {
        return { ok: false as const, status: 401, error: 'Missing reels client headers' };
    }

    if (!safeEqual(providedId, expectedId) || !safeEqual(providedSecret, expectedSecret)) {
        return { ok: false as const, status: 401, error: 'Invalid reels client headers' };
    }

    return { ok: true as const };
};

const buildPlaybackUrl = (row: ReelRow) => {
    if (row.s3Url) return row.s3Url;
    if (!row.cloudfrontPath) return '';
    if (/^https?:\/\//i.test(row.cloudfrontPath)) return row.cloudfrontPath;

    const base = (
        process.env.REELS_CLOUDFRONT_URL
        || process.env.NEXT_PUBLIC_CLOUDFRONT_URL
        || process.env.CLOUDFRONT_URL
        || ''
    ).replace(/^https?:\/\//i, '').replace(/\/$/, '');

    if (!base) return row.cloudfrontPath;
    const path = row.cloudfrontPath.startsWith('/') ? row.cloudfrontPath : `/${row.cloudfrontPath}`;
    return `https://${base}${path}`;
};

export async function GET(request: NextRequest) {
    try {
        const auth = isAuthorized(request);
        if (!auth.ok) {
            return NextResponse.json({ error: auth.error }, { status: auth.status });
        }

        const page = Math.max(1, Number(request.nextUrl.searchParams.get('page') || 1));
        const limit = Math.min(MAX_LIMIT, Math.max(1, Number(request.nextUrl.searchParams.get('limit') || DEFAULT_LIMIT)));
        const includeDisabled = request.nextUrl.searchParams.get('includeDisabled') === '1';
        const skip = (page - 1) * limit;

        const statusFilterSql = includeDisabled ? '' : 'WHERE "status" = $1';

        const rows = includeDisabled
            ? await prisma.$queryRawUnsafe(
                `SELECT
                    "id",
                    "title",
                    "description",
                    "thumbnailUrl",
                    "playbackType",
                    "cloudfrontPath",
                    "s3Url",
                    "duration",
                    "fileSize",
                    "mimeType",
                    "width",
                    "height",
                    "resolution",
                    "hasAudio",
                    "status",
                    "sourceProvider",
                    "sourceIdentifier",
                    "sourcePageUrl",
                    "sourceLicenseUrl",
                    "sourceRights",
                    "createdAt"
                 FROM "Reel"
                 ORDER BY "createdAt" DESC
                 OFFSET $1
                 LIMIT $2`,
                skip,
                limit
            )
            : await prisma.$queryRawUnsafe(
                `SELECT
                    "id",
                    "title",
                    "description",
                    "thumbnailUrl",
                    "playbackType",
                    "cloudfrontPath",
                    "s3Url",
                    "duration",
                    "fileSize",
                    "mimeType",
                    "width",
                    "height",
                    "resolution",
                    "hasAudio",
                    "status",
                    "sourceProvider",
                    "sourceIdentifier",
                    "sourcePageUrl",
                    "sourceLicenseUrl",
                    "sourceRights",
                    "createdAt"
                 FROM "Reel"
                 ${statusFilterSql}
                 ORDER BY "createdAt" DESC
                 OFFSET $2
                 LIMIT $3`,
                'completed',
                skip,
                limit
            );

        const countRows: Array<{ total: number }> = includeDisabled
            ? await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS total FROM "Reel"`)
            : await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS total FROM "Reel" WHERE "status" = $1`, 'completed');

        const total = Number(countRows?.[0]?.total || 0);
        const items = (rows as ReelRow[]).map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description || FALLBACK_DESCRIPTION,
            thumbnailUrl: row.thumbnailUrl,
            playbackType: row.playbackType || 'mp4',
            playbackUrl: buildPlaybackUrl(row),
            duration: row.duration,
            fileSize: row.fileSize ? String(row.fileSize) : null,
            mimeType: row.mimeType,
            width: row.width,
            height: row.height,
            resolution: row.resolution,
            hasAudio: row.hasAudio,
            status: row.status,
            attribution: {
                provider: row.sourceProvider || 'internet_archive',
                sourceIdentifier: row.sourceIdentifier,
                sourcePageUrl: row.sourcePageUrl,
                sourceLicenseUrl: row.sourceLicenseUrl,
                sourceRights: row.sourceRights,
            },
            createdAt: row.createdAt,
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
        console.error('Reels feed error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch reels feed', details: message },
            { status: 500 }
        );
    }
}
