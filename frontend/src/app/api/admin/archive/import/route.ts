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

type ImportResultStatus = 'imported' | 'updated' | 'skipped' | 'failed' | 'ready';

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

const MIN_FEATURE_DURATION_SECONDS = 45 * 60;
const EXCLUDED_TITLE_KEYWORDS = [
    'trailer',
    'preview',
    'teaser',
    'promo',
    'commercial',
    'clip',
    'newsreel',
    'short',
    'sample'
];

const isExcludedTitle = (value?: string) => {
    if (!value) return false;
    const lower = value.toLowerCase();
    return EXCLUDED_TITLE_KEYWORDS.some((keyword) => lower.includes(keyword));
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

// Series helpers removed; only movie imports are supported.

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
        const contentType = 'movie';

        const preset = ARCHIVE_PRESETS.find((p) => p.id === presetId) || ARCHIVE_PRESETS[0];
        const seriesQuery = preset.query;

        const providedIdentifiers = Array.isArray(body?.identifiers) ? body.identifiers.filter(Boolean) : [];
        const providedItems = Array.isArray(body?.items)
            ? body.items
                .map((item: any) => ({
                    identifier: String(item?.identifier || '').trim(),
                    fileName: item?.fileName ? String(item.fileName) : null
                }))
                .filter((item: any) => item.identifier)
            : [];

        const identifiers = providedItems.length > 0
            ? providedItems.map((item: any) => item.identifier)
            : (providedIdentifiers.length > 0
                ? providedIdentifiers
                : await searchArchiveIdentifiers(seriesQuery, limit));

        const preferredFiles = new Map<string, string | null>();
        providedItems.forEach((item: any) => {
            preferredFiles.set(item.identifier, item.fileName);
        });
        const dryRun = Boolean(body?.dryRun);

        const workerUrl = process.env.INGEST_WORKER_URL;
        if (workerUrl && !dryRun) {
            const workerSecret = process.env.INGEST_WORKER_SECRET;
            if (!workerSecret) {
                return NextResponse.json({ error: 'Ingest worker secret not configured' }, { status: 500 });
            }

            const endpoint = workerUrl.replace(/\/$/, '');
            const workerRes = await fetch(`${endpoint}/import`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${workerSecret}`
                },
                body: JSON.stringify({
                    presetQuery: preset.query,
                    limit,
                    allowMkv,
                    items: identifiers.map((identifier) => ({
                        identifier,
                        fileName: preferredFiles.get(identifier) || null
                    }))
                })
            });

            const data = await workerRes.json();
            if (!workerRes.ok) {
                return NextResponse.json(
                    { error: data?.error || 'Worker import failed', details: data?.details },
                    { status: 502 }
                );
            }

            return NextResponse.json(data);
        }

        const results: ImportResult[] = [];

        for (const identifier of identifiers) {
            const result: ImportResult = {
                identifier,
                title: identifier,
                status: 'failed'
            };

            try {
                const { metadata, files } = await fetchArchiveMetadata(identifier);
                const preferredName = preferredFiles.get(identifier);
                let bestFile = preferredName
                    ? files.find((file) => file?.name === preferredName) || null
                    : null;

                if (bestFile && !pickBestPlayableFile([bestFile], allowMkv)) {
                    bestFile = null;
                }

                if (!bestFile) {
                    bestFile = pickBestPlayableFile(files, allowMkv);
                }

                if (!bestFile) {
                    result.status = 'skipped';
                    result.reason = 'No playable MP4/MKV file found';
                    results.push(result);
                    continue;
                }

                const playbackUrl = buildArchiveDownloadUrl(identifier, bestFile.name);
                const sourcePageUrl = `https://archive.org/details/${identifier}`;

                const title = stringifyMetadata(metadata?.title) || identifier;
                if (isExcludedTitle(title) || isExcludedTitle(bestFile.name)) {
                    result.status = 'skipped';
                    result.reason = 'Excluded by title keywords';
                    results.push(result);
                    continue;
                }
                const description = null;
                const releaseYear = parseYear(stringifyMetadata(metadata?.year) || stringifyMetadata(metadata?.date));
                const genre = normalizeGenre(metadata);
                const rating = normalizeRating(metadata);
                const duration = parseDurationSeconds(bestFile.length) || parseDurationSeconds(stringifyMetadata(metadata?.length));

                if (duration && duration < MIN_FEATURE_DURATION_SECONDS) {
                    result.status = 'skipped';
                    result.reason = `Duration ${Math.round(duration / 60)}m below minimum`;
                    results.push(result);
                    continue;
                }

                const fileSize = bestFile.size ? BigInt(bestFile.size) : null;
                const height = bestFile.height ? Number(bestFile.height) : null;
                const resolution = height ? `${height}p` : null;
                const mimeType = normalizeMimeType(bestFile);
                const episodeNumber = null;
                const seriesTitle = null;
                const seasonNumber = null;

                const s3KeyPlayback = `ia:${identifier}/${bestFile.name}`;

                if (!dryRun) {
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
                } else {
                    result.title = title;
                    result.fileName = bestFile.name;
                    result.playbackUrl = playbackUrl;
                    result.fileSize = fileSize ? fileSize.toString() : null;
                    result.duration = duration;
                    result.sourcePageUrl = sourcePageUrl;
                    result.status = 'ready';
                }

            } catch (error: any) {
                result.status = 'failed';
                result.reason = error?.message || 'Failed to import item';
            }

            results.push(result);
        }

        const summary = {
            requested: identifiers.length,
            imported: results.filter((r) => r.status === 'imported').length,
            updated: results.filter((r) => r.status === 'updated').length,
            skipped: results.filter((r) => r.status === 'skipped').length,
            failed: results.filter((r) => r.status === 'failed').length,
            ready: results.filter((r) => r.status === 'ready').length,
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
