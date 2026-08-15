import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { requireAdmin } from '@/lib/admin-auth';

const videoSelect = {
    id: true,
    title: true,
    description: true,
    type: true,
    seriesTitle: true,
    seasonNumber: true,
    episodeNumber: true,
    thumbnailUrl: true,
    releaseYear: true,
    tmdbId: true,
    genre: true,
    rating: true,
    sourceProvider: true,
    sourcePageUrl: true,
    sourceRights: true,
    sourceLicenseUrl: true,
} as const;

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildFlexibleRegex = (query: string) => {
    const tokens = query
        .trim()
        .split(/[^a-zA-Z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length > 0);

    if (tokens.length === 0) return escapeRegex(query.trim());
    return tokens.map(escapeRegex).join('.*');
};

export async function GET(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const q = request.nextUrl.searchParams.get('q')?.trim();

        if (!q || q.trim().length === 0) {
            return NextResponse.json(
                { error: 'Search query is required' },
                { status: 400 }
            );
        }

        // Search by ID first
        let video = await prisma.video.findUnique({
            where: { id: q },
            select: videoSelect,
        });

        // If not found by ID, search title, series title, Archive identifiers, and media/source paths.
        if (!video) {
            const regex = buildFlexibleRegex(q);
            const matches = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id
                FROM "Video"
                WHERE
                    title ~* ${regex}
                    OR COALESCE("seriesTitle", '') ~* ${regex}
                    OR COALESCE("archiveIdentifier", '') ~* ${regex}
                    OR COALESCE("sourcePageUrl", '') ~* ${regex}
                    OR COALESCE("sourceLicenseUrl", '') ~* ${regex}
                    OR COALESCE("s3KeyPlayback", '') ~* ${regex}
                    OR COALESCE("cloudfrontPath", '') ~* ${regex}
                    OR COALESCE("s3Url", '') ~* ${regex}
                ORDER BY
                    CASE
                        WHEN COALESCE("seriesTitle", '') ~* ${regex} THEN 0
                        WHEN title ~* ${regex} THEN 1
                        WHEN COALESCE("archiveIdentifier", '') ~* ${regex} THEN 2
                        ELSE 3
                    END ASC,
                    CASE WHEN type = 'series' THEN 0 ELSE 1 END ASC,
                    "seriesTitle" ASC NULLS LAST,
                    "seasonNumber" ASC NULLS LAST,
                    "episodeNumber" ASC NULLS LAST,
                    "updatedAt" DESC
                LIMIT 1
            `;

            const matchId = matches[0]?.id;
            if (!matchId) {
                return NextResponse.json(
                    { error: 'Video not found' },
                    { status: 404 }
                );
            }

            video = await prisma.video.findUnique({
                where: { id: matchId },
                select: videoSelect,
            });
        }

        if (video) {
            video.thumbnailUrl = resolveMediaUrl(video.thumbnailUrl);
        }

        return NextResponse.json({ video });
    } catch (error) {
        console.error('Error searching videos:', error);
        return NextResponse.json(
            { error: 'Failed to search videos' },
            { status: 500 }
        );
    }
}
