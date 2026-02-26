import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
    ARCHIVE_PRESETS,
    DEFAULT_ARCHIVE_PRESET_ID,
    buildArchiveDownloadUrl,
    fetchArchiveMetadata,
    pickBestPlayableFile,
    searchArchiveIdentifiers
} from '@/lib/internet-archive';

type ImportResultStatus = 'imported' | 'updated' | 'skipped' | 'failed';

interface ImportResult {
    identifier: string;
    title: string;
    fileName?: string;
    playbackUrl?: string;
    fileSize?: string | null;
    duration?: number | null;
    sourcePageUrl?: string;
    status: ImportResultStatus;
    reason?: string;
}

const parseYear = (value?: string) => {
    if (!value) return null;
    const match = value.match(/\d{4}/);
    return match ? Number(match[0]) : null;
};

const parseDurationSeconds = (value?: string) => {
    if (!value) return null;
    if (value.includes(':')) {
        const parts = value.split(':').map((part) => Number(part));
        if (parts.some((p) => Number.isNaN(p))) return null;
        const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1] || 0];
        return h * 3600 + m * 60 + s;
    }
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const stringifyMetadata = (value: any) => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
};

const pickFirstString = (value: any) => {
    if (!value) return null;
    if (Array.isArray(value)) {
        const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
        return first || null;
    }
    if (typeof value === 'string') return value;
    return null;
};

const normalizeGenre = (metadata: any) => {
    const raw = pickFirstString(metadata?.genre)
        || pickFirstString(metadata?.category)
        || pickFirstString(metadata?.subject)
        || pickFirstString(metadata?.tags);

    if (!raw) return 'Movie';
    const cleaned = raw.replace(/[_-]+/g, ' ').trim();
    if (!cleaned) return 'Movie';
    return cleaned;
};

const normalizeRating = (metadata: any) => {
    const raw = pickFirstString(metadata?.rating)
        || pickFirstString(metadata?.contentrating)
        || pickFirstString(metadata?.mpaa_rating)
        || pickFirstString(metadata?.maturity)
        || pickFirstString(metadata?.audience);

    return raw ? raw.trim() : 'NR';
};

const normalizeMimeType = (file: any) => {
    if (file?.mime) return String(file.mime);
    const name = (file?.name || '').toLowerCase();
    if (name.endsWith('.mp4')) return 'video/mp4';
    if (name.endsWith('.mkv')) return 'video/x-matroska';
    return null;
};

const normalizeSeriesTitle = (metadata: any, fallbackTitle: string) => {
    const raw = pickFirstString(metadata?.series)
        || pickFirstString(metadata?.show)
        || pickFirstString(metadata?.collection)
        || pickFirstString(metadata?.program)
        || null;

    if (!raw) return fallbackTitle;
    const cleaned = raw.replace(/[_-]+/g, ' ').trim();
    return cleaned || fallbackTitle;
};

const parseSeasonNumber = (metadata: any) => {
    const raw = pickFirstString(metadata?.season)
        || pickFirstString(metadata?.season_number)
        || pickFirstString(metadata?.series_season);

    if (!raw) return null;
    const match = raw.match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseEpisodeNumber = (metadata: any) => {
    const raw = pickFirstString(metadata?.episode)
        || pickFirstString(metadata?.episode_number)
        || pickFirstString(metadata?.episodeNumber)
        || pickFirstString(metadata?.track)
        || pickFirstString(metadata?.part)
        || pickFirstString(metadata?.number);

    if (!raw) return null;
    const match = raw.match(/\d+/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
};

export async function POST(request: NextRequest) {
    try {
        const adminPassword = process.env.ADMIN_PASSWORD;
        const session = request.cookies.get('admin_session')?.value;
        const authHeader = request.headers.get('authorization');

        if (!adminPassword || (authHeader !== adminPassword && session !== adminPassword)) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const presetId = body?.preset || DEFAULT_ARCHIVE_PRESET_ID;
        const limit = Math.min(Math.max(Number(body?.limit) || 1, 1), 50);
        const allowMkv = Boolean(body?.allowMkv);
        const requestedType = body?.contentType || body?.importType;
        const contentType = requestedType === 'series' ? 'series' : 'movie';
        const seriesTitleInput = contentType === 'series' ? String(body?.seriesTitle || '').trim() : '';
        const seasonNumberInput = contentType === 'series' ? Number(body?.seasonNumber) || 1 : null;
        const startEpisodeInput = contentType === 'series' ? Number(body?.startEpisodeNumber) || 1 : null;

        if (contentType === 'series' && !seriesTitleInput) {
            return NextResponse.json(
                { error: 'Series title is required for series imports' },
                { status: 400 }
            );
        }

        const preset = ARCHIVE_PRESETS.find((p) => p.id === presetId) || ARCHIVE_PRESETS[0];
        const safeSeriesTitle = seriesTitleInput.replace(/"/g, '\\"');
        const seriesQuery = seriesTitleInput
            ? `${preset.query} AND (title:("${safeSeriesTitle}") OR subject:("${safeSeriesTitle}") OR collection:("${safeSeriesTitle}") OR creator:("${safeSeriesTitle}"))`
            : preset.query;

        const identifiers = await searchArchiveIdentifiers(seriesQuery, limit);

        const results: ImportResult[] = [];

        for (const [index, identifier] of identifiers.entries()) {
            const result: ImportResult = {
                identifier,
                title: identifier,
                status: 'failed'
            };

            try {
                const { metadata, files } = await fetchArchiveMetadata(identifier);
                const bestFile = pickBestPlayableFile(files, allowMkv);

                if (!bestFile) {
                    result.status = 'skipped';
                    result.reason = 'No playable MP4/MKV file found';
                    results.push(result);
                    continue;
                }

                const playbackUrl = buildArchiveDownloadUrl(identifier, bestFile.name);
                const sourcePageUrl = `https://archive.org/details/${identifier}`;

                const title = stringifyMetadata(metadata?.title) || identifier;
                const description = null;
                const releaseYear = parseYear(stringifyMetadata(metadata?.year) || stringifyMetadata(metadata?.date));
                const genre = normalizeGenre(metadata);
                const rating = normalizeRating(metadata);
                const duration = parseDurationSeconds(bestFile.length) || parseDurationSeconds(stringifyMetadata(metadata?.length));
                const fileSize = bestFile.size ? BigInt(bestFile.size) : null;
                const height = bestFile.height ? Number(bestFile.height) : null;
                const resolution = height ? `${height}p` : null;
                const mimeType = normalizeMimeType(bestFile);
                const episodeNumber = contentType === 'series'
                    ? (parseEpisodeNumber(metadata) || (startEpisodeInput !== null ? startEpisodeInput + index : null))
                    : null;
                const seriesTitle = contentType === 'series'
                    ? (seriesTitleInput || normalizeSeriesTitle(metadata, title))
                    : null;
                const seasonNumber = contentType === 'series'
                    ? (parseSeasonNumber(metadata) || seasonNumberInput)
                    : null;

                const s3KeyPlayback = `ia:${identifier}/${bestFile.name}`;

                const existing = await prisma.video.findUnique({
                    where: { archiveIdentifier: identifier }
                });

                const upserted = await prisma.video.upsert({
                    where: { archiveIdentifier: identifier },
                    create: {
                        title,
                        description,
                        type: contentType,
                        playbackType: 'mp4',
                        s3KeyPlayback,
                        cloudfrontPath: playbackUrl,
                        s3KeySource: null,
                        s3Url: playbackUrl,
                        thumbnailUrl: `https://archive.org/services/img/${identifier}`,
                        status: 'completed',
                        releaseYear,
                        duration,
                        resolution,
                        genre,
                        rating,
                        seriesTitle,
                        seasonNumber,
                        episodeNumber,
                        fileSize,
                        mimeType,
                        format: bestFile.format || null,
                        sourceType: 'external_legal',
                        sourceProvider: 'internet_archive',
                        sourcePageUrl,
                        archiveIdentifier: identifier,
                        sourceRights: stringifyMetadata(metadata?.rights),
                        sourceLicenseUrl: stringifyMetadata(metadata?.licenseurl || metadata?.license),
                        sourceMetadata: metadata,
                    },
                    update: {
                        title,
                        description,
                        playbackType: 'mp4',
                        s3KeyPlayback,
                        cloudfrontPath: playbackUrl,
                        s3Url: playbackUrl,
                        thumbnailUrl: `https://archive.org/services/img/${identifier}`,
                        status: 'completed',
                        releaseYear,
                        duration,
                        resolution,
                        genre,
                        rating,
                        seriesTitle,
                        seasonNumber,
                        episodeNumber,
                        fileSize,
                        mimeType,
                        format: bestFile.format || null,
                        sourceType: 'external_legal',
                        sourceProvider: 'internet_archive',
                        sourcePageUrl,
                        sourceRights: stringifyMetadata(metadata?.rights),
                        sourceLicenseUrl: stringifyMetadata(metadata?.licenseurl || metadata?.license),
                        sourceMetadata: metadata,
                    }
                });

                result.title = upserted.title;
                result.fileName = bestFile.name;
                result.playbackUrl = playbackUrl;
                result.fileSize = fileSize ? fileSize.toString() : null;
                result.duration = duration;
                result.sourcePageUrl = sourcePageUrl;
                result.status = existing ? 'updated' : 'imported';
            } catch (error: any) {
                result.status = 'failed';
                result.reason = error?.message || 'Failed to import item';
            }

            results.push(result);
        }

        const summary = {
            requested: limit,
            imported: results.filter((r) => r.status === 'imported').length,
            updated: results.filter((r) => r.status === 'updated').length,
            skipped: results.filter((r) => r.status === 'skipped').length,
            failed: results.filter((r) => r.status === 'failed').length,
        };

        return NextResponse.json({
            success: true,
            preset,
            summary,
            results
        });
    } catch (error: any) {
        console.error('Archive import error:', error);
        return NextResponse.json(
            { error: 'Failed to import from Internet Archive', details: error.message },
            { status: 500 }
        );
    }
}
