import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/db';
import { resolveMediaUrl } from '@/lib/media';
import { requireAdmin } from '@/lib/admin-auth';

const videoSelect = Prisma.validator<Prisma.VideoSelect>()({
    id: true,
    title: true,
    description: true,
    type: true,
    seriesId: true,
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
});

const seriesSelect = Prisma.validator<Prisma.SeriesSelect>()({
    id: true,
    title: true,
    description: true,
    thumbnailUrl: true,
    releaseYear: true,
    tmdbId: true,
    genre: true,
    rating: true,
    sourceProvider: true,
    sourcePageUrl: true,
    sourceRights: true,
    sourceLicenseUrl: true,
    _count: {
        select: { episodes: true },
    },
    episodes: {
        orderBy: [
            { seasonNumber: 'asc' },
            { episodeNumber: 'asc' },
            { title: 'asc' },
        ],
        take: 1,
        select: videoSelect,
    },
});

type AdminSearchSeries = Prisma.SeriesGetPayload<{ select: typeof seriesSelect }>;
type AdminSearchEpisode = Prisma.VideoGetPayload<{ select: typeof videoSelect }>;
type AdminSearchResult = Omit<AdminSearchEpisode, 'thumbnailUrl'> & {
    thumbnailUrl: string;
    editScope: 'series' | 'episode';
    episodeCount?: number;
};

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

const extractSearchTokens = (query: string) =>
    query
        .trim()
        .split(/[^a-zA-Z0-9]+/)
        .map((token) => token.trim())
        .filter((token) => token.length >= 3);

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
    const values = [query, ...extractSearchTokens(query)];
    const archiveIdentifier = parseArchiveIdentifier(query);
    if (archiveIdentifier) {
        values.push(archiveIdentifier, ...extractSearchTokens(archiveIdentifier));
    }

    return Array.from(new Set(values.map(buildFlexibleRegex).filter(Boolean)));
};

const normalizeVideo = <T extends { thumbnailUrl?: string | null }>(video: T) => ({
    ...video,
    thumbnailUrl: resolveMediaUrl(video.thumbnailUrl),
});

const buildSeriesResult = (series: AdminSearchSeries): AdminSearchResult | null => {
    const representative = series.episodes[0];
    if (!representative) return null;

    return {
        ...normalizeVideo(representative),
        title: series.title,
        description: series.description,
        thumbnailUrl: resolveMediaUrl(series.thumbnailUrl || representative.thumbnailUrl),
        releaseYear: series.releaseYear,
        tmdbId: series.tmdbId,
        genre: series.genre,
        rating: series.rating,
        sourceProvider: series.sourceProvider,
        sourcePageUrl: series.sourcePageUrl,
        sourceRights: series.sourceRights,
        sourceLicenseUrl: series.sourceLicenseUrl,
        seriesId: series.id,
        seriesTitle: series.title,
        seasonNumber: null,
        episodeNumber: null,
        editScope: 'series',
        episodeCount: series._count.episodes,
    };
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
        const exactVideo = await prisma.video.findUnique({
            where: { id: q },
            select: videoSelect,
        });

        if (exactVideo) {
            const normalizedVideo = { ...normalizeVideo(exactVideo), editScope: 'episode' };
            return NextResponse.json({ video: normalizedVideo, videos: [normalizedVideo] });
        }

        const exactSeries = await prisma.series.findFirst({
            where: {
                OR: [
                    { id: q },
                    { title: { equals: q, mode: 'insensitive' } },
                ],
            },
            select: seriesSelect,
        });

        if (exactSeries) {
            const seriesResult = buildSeriesResult(exactSeries);
            if (seriesResult) {
                return NextResponse.json({ video: seriesResult, videos: [seriesResult] });
            }
        }

        // If not found by ID, search title, series title, Archive identifiers, and media/source paths.
        const regexes = buildSearchRegexes(q);
        const seriesMatches = await prisma.series.findMany({
            where: {
                OR: [
                    { title: { contains: q, mode: 'insensitive' } },
                    { description: { contains: q, mode: 'insensitive' } },
                    { sourcePageUrl: { contains: q, mode: 'insensitive' } },
                    { sourceLicenseUrl: { contains: q, mode: 'insensitive' } },
                ],
            },
            orderBy: [
                { title: 'asc' },
            ],
            take: 25,
            select: seriesSelect,
        });
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
                (
                    SELECT COUNT(*)
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
                ) DESC,
                CASE
                    WHEN EXISTS (
                        SELECT 1
                        FROM unnest(${regexes}::text[]) AS pattern
                        WHERE COALESCE("seriesTitle", '') ~* pattern
                    ) THEN 0
                    WHEN EXISTS (
                        SELECT 1
                        FROM unnest(${regexes}::text[]) AS pattern
                        WHERE title ~* pattern
                    ) THEN 1
                    WHEN EXISTS (
                        SELECT 1
                        FROM unnest(${regexes}::text[]) AS pattern
                        WHERE COALESCE("archiveIdentifier", '') ~* pattern
                    ) THEN 2
                    ELSE 3
                END ASC,
                CASE WHEN type = 'series' THEN 0 ELSE 1 END ASC,
                "seriesTitle" ASC NULLS LAST,
                "seasonNumber" ASC NULLS LAST,
                "episodeNumber" ASC NULLS LAST,
                "updatedAt" DESC
            LIMIT 100
        `;

        const matchIds = matches.map((match) => match.id);
        if (matchIds.length === 0 && seriesMatches.length === 0) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        const videos = await prisma.video.findMany({
            where: { id: { in: matchIds } },
            select: videoSelect,
        });
        const videosById = new Map(videos.map((video) => [video.id, video]));
        const orderedMatchedVideos = matchIds
            .map((id) => videosById.get(id))
            .filter((video): video is NonNullable<typeof video> => Boolean(video));

        if (orderedMatchedVideos.length === 0 && seriesMatches.length === 0) {
            return NextResponse.json(
                { error: 'Video not found' },
                { status: 404 }
            );
        }

        const directSeriesResults = seriesMatches
            .map(buildSeriesResult)
            .filter((video): video is NonNullable<typeof video> => Boolean(video));
        const matchedSeriesTitles = Array.from(new Set(
            orderedMatchedVideos
                .filter((video) => video.type === 'series' && !video.seriesId && video.seriesTitle)
                .map((video) => video.seriesTitle as string)
        ));
        const matchedSeriesIds = Array.from(new Set(
            orderedMatchedVideos
                .filter((video) => video.type === 'series' && video.seriesId)
                .map((video) => video.seriesId as string)
        ));

        const linkedSeries = matchedSeriesIds.length > 0
            ? await prisma.series.findMany({
                where: { id: { in: matchedSeriesIds } },
                select: seriesSelect,
            })
            : [];

        const legacySeriesEpisodes = matchedSeriesTitles.length > 0
            ? await prisma.video.findMany({
                where: {
                    type: 'series',
                    seriesTitle: { in: matchedSeriesTitles },
                },
                orderBy: [
                    { seriesTitle: 'asc' },
                    { seasonNumber: 'asc' },
                    { episodeNumber: 'asc' },
                ],
                select: videoSelect,
            })
            : [];

        const legacySeriesGroups = matchedSeriesTitles
            .map((seriesTitle) => {
                const episodes = legacySeriesEpisodes.filter((episode) => episode.seriesTitle === seriesTitle);
                const representative = episodes.find((episode) => episode.thumbnailUrl)
                    || episodes.find((episode) => episode.description)
                    || episodes[0];

                if (!representative) return null;

                const descriptionSource = episodes.find((episode) => episode.description) || representative;
                const posterSource = episodes.find((episode) => episode.thumbnailUrl) || representative;
                const releaseYearSource = episodes.find((episode) => episode.releaseYear) || representative;
                const genreSource = episodes.find((episode) => episode.genre) || representative;
                const ratingSource = episodes.find((episode) => episode.rating) || representative;
                const tmdbSource = episodes.find((episode) => episode.tmdbId) || representative;

                return {
                    ...normalizeVideo(representative),
                    title: seriesTitle,
                    seriesId: null,
                    description: descriptionSource.description,
                    thumbnailUrl: resolveMediaUrl(posterSource.thumbnailUrl),
                    releaseYear: releaseYearSource.releaseYear,
                    genre: genreSource.genre,
                    rating: ratingSource.rating,
                    tmdbId: tmdbSource.tmdbId,
                    seasonNumber: null,
                    episodeNumber: null,
                    editScope: 'series',
                    episodeCount: episodes.length,
                } satisfies AdminSearchResult;
            })
            .filter((video): video is NonNullable<typeof video> => Boolean(video));

        const linkedSeriesGroups = linkedSeries
            .map(buildSeriesResult)
            .filter((video): video is NonNullable<typeof video> => Boolean(video));
        const seriesResultMap = new Map<string, (typeof directSeriesResults)[number]>();
        [...directSeriesResults, ...linkedSeriesGroups, ...legacySeriesGroups].forEach((series) => {
            const key = series.seriesId || series.seriesTitle || series.title;
            if (key && !seriesResultMap.has(key)) {
                seriesResultMap.set(key, series);
            }
        });

const episodeResults = orderedMatchedVideos.map((video) => ({
            ...normalizeVideo(video),
            editScope: 'episode',
        } satisfies AdminSearchResult));
        const orderedVideos = [...seriesResultMap.values(), ...episodeResults].slice(0, 25);

        return NextResponse.json({ video: orderedVideos[0], videos: orderedVideos });
    } catch (error) {
        console.error('Error searching videos:', error);
        return NextResponse.json(
            { error: 'Failed to search videos' },
            { status: 500 }
        );
    }
}
