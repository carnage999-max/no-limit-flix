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

const parseArchiveIdentifier = (query: string) => {
    const trimmed = query.trim();
    try {
        const url = new URL(trimmed);
        if (!url.hostname.includes('archive.org')) return null;
        const detailsMatch = url.pathname.match(/\/details\/([^/?#]+)/i);
        if (detailsMatch?.[1]) return decodeURIComponent(detailsMatch[1]);
        const downloadMatch = url.pathname.match(/\/download\/([^/?#]+)/i);
        if (downloadMatch?.[1]) return decodeURIComponent(downloadMatch[1]);
    } catch {
        // Not a URL; fall through to bare identifier handling.
    }

    const bare = trimmed.match(/(?:details\/|download\/)?([a-z0-9][a-z0-9._-]{2,})/i)?.[1];
    return bare || null;
};

const buildSearchRegexes = (query: string) => {
    const values = [query];
    const archiveIdentifier = parseArchiveIdentifier(query);
    if (archiveIdentifier) values.push(archiveIdentifier);

    return Array.from(new Set(values.map(buildFlexibleRegex).filter(Boolean)));
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
            const regexes = buildSearchRegexes(q);
            const matches = await prisma.$queryRaw<Array<{ id: string }>>`
                SELECT id
                FROM "Video"
                WHERE
                    EXISTS (
                        SELECT 1
                        FROM unnest(${regexes}::text[]) AS pattern
                        WHERE
                            title ~* pattern
                            OR COALESCE("seriesTitle", '') ~* pattern
                            OR COALESCE("archiveIdentifier", '') ~* pattern
                            OR COALESCE("sourcePageUrl", '') ~* pattern
                            OR COALESCE("sourceLicenseUrl", '') ~* pattern
                            OR COALESCE("s3KeyPlayback", '') ~* pattern
                            OR COALESCE("cloudfrontPath", '') ~* pattern
                            OR COALESCE("s3Url", '') ~* pattern
                    )
                ORDER BY
                    CASE
                        WHEN EXISTS (SELECT 1 FROM unnest(${regexes}::text[]) AS pattern WHERE COALESCE("seriesTitle", '') ~* pattern) THEN 0
                        WHEN EXISTS (SELECT 1 FROM unnest(${regexes}::text[]) AS pattern WHERE title ~* pattern) THEN 1
                        WHEN EXISTS (SELECT 1 FROM unnest(${regexes}::text[]) AS pattern WHERE COALESCE("archiveIdentifier", '') ~* pattern) THEN 2
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
