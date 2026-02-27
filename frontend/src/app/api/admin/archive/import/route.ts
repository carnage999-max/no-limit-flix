import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
    ARCHIVE_PRESETS,
    DEFAULT_ARCHIVE_PRESET_ID,
    buildArchiveDownloadUrl,
    fetchArchiveMetadata,
    pickBestPlayableFile,
    rankPlayableFiles,
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
const MIN_SERIES_DURATION_SECONDS = 5 * 60;
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

const deriveTitleFromFileName = (fileName: string) => {
    const base = fileName.replace(/\.[a-z0-9]+$/i, '');
    return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const isGenericBundleTitle = (value?: string) => {
    if (!value) return true;
    const normalized = value.toLowerCase().trim();
    return normalized === 'public domain movies'
        || normalized === 'publicdomainmovies'
        || normalized === 'publicmovies212';
};

const DEFAULT_POSTER_URL = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400';

const findThumbnailForFile = (files: any[], identifier: string, fileName: string) => {
    if (!fileName) return null;
    const base = fileName.replace(/\.[a-z0-9]+$/i, '').toLowerCase();
    const imageCandidates = files.filter((file) => {
        const name = (file?.name || '').toLowerCase();
        if (!name) return false;
        if (!name.includes(base)) return false;
        return name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
    });

    const best = imageCandidates[0];
    if (!best) return null;
    return buildArchiveDownloadUrl(identifier, best.name);
};

const buildArchiveIdentifier = (identifier: string, fileName: string | null, bundleIdentifier?: string) => {
    if (bundleIdentifier && identifier === bundleIdentifier && fileName) {
        return `${identifier}:${fileName}`;
    }
    return identifier;
};

const normalizeText = (value?: string) => {
    if (!value) return '';
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

const extractTokens = (value: string) => normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2);

const matchesSeriesTitle = (fileName: string, seriesTitle: string) => {
    const normalizedTitle = normalizeText(seriesTitle);
    if (!normalizedTitle) return false;
    const haystack = normalizeText(fileName);
    if (!haystack) return false;
    if (haystack.includes(normalizedTitle)) return true;
    const tokens = extractTokens(seriesTitle);
    if (tokens.length === 0) return false;
    return tokens.every((token) => haystack.includes(token));
};

const parseSeasonEpisode = (value?: string) => {
    if (!value) return { season: null, episode: null };
    const text = value.toLowerCase();
    let match = text.match(/s(\d{1,2})\s*e(\d{1,3})/);
    if (match) {
        return { season: Number(match[1]), episode: Number(match[2]) };
    }
    match = text.match(/(\d{1,2})x(\d{1,3})/);
    if (match) {
        return { season: Number(match[1]), episode: Number(match[2]) };
    }
    match = text.match(/season\s*(\d{1,2}).*episode\s*(\d{1,3})/);
    if (match) {
        return { season: Number(match[1]), episode: Number(match[2]) };
    }
    match = text.match(/episode\s*(\d{1,3})/);
    if (match) {
        return { season: null, episode: Number(match[1]) };
    }
    return { season: null, episode: null };
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
        const seriesQuery = preset.query;

        const providedIdentifiers = Array.isArray(body?.identifiers) ? body.identifiers.filter(Boolean) : [];
        const providedItems = Array.isArray(body?.items)
            ? body.items
                .map((item: any) => ({
                    identifier: String(item?.identifier || '').trim(),
                    fileName: item?.fileName ? String(item.fileName) : null,
                    seasonNumber: Number.isFinite(Number(item?.seasonNumber)) ? Number(item.seasonNumber) : null,
                    episodeNumber: Number.isFinite(Number(item?.episodeNumber)) ? Number(item.episodeNumber) : null
                }))
                .filter((item: any) => item.identifier)
            : [];

        const metadataCache = new Map<string, { metadata: any; files: any[] }>();

        const hydrateBundleItems = async () => {
            if (!preset.bundleIdentifier) return null;
            const bundleId = preset.bundleIdentifier;
            const bundle = await fetchArchiveMetadata(bundleId);
            metadataCache.set(bundleId, bundle);
            let rankedFiles = rankPlayableFiles(bundle.files, allowMkv);
            if (contentType === 'series') {
                rankedFiles = rankedFiles
                    .filter((file) => matchesSeriesTitle(file.name, seriesTitleInput))
                    .filter((file) => !isExcludedTitle(file.name));
                rankedFiles.sort((a, b) => {
                    const aParts = parseSeasonEpisode(a.name);
                    const bParts = parseSeasonEpisode(b.name);
                    if (aParts.episode !== null && bParts.episode !== null) {
                        return aParts.episode - bParts.episode;
                    }
                    return a.name.localeCompare(b.name);
                });
            }
            return rankedFiles.slice(0, limit).map((file) => {
                const parsed = parseSeasonEpisode(file.name);
                return {
                    identifier: bundleId,
                    fileName: file.name,
                    seasonNumber: parsed.season,
                    episodeNumber: parsed.episode
                };
            });
        };

        const bundleItems = providedItems.length === 0 && preset.bundleIdentifier
            ? await hydrateBundleItems()
            : null;

        if (contentType === 'series' && (!bundleItems || bundleItems.length === 0) && providedItems.length === 0) {
            return NextResponse.json(
                { error: 'No matching series items found in the bundle for that title.' },
                { status: 404 }
            );
        }

        const itemsToProcess = providedItems.length > 0
            ? providedItems
            : (bundleItems && bundleItems.length > 0
                ? bundleItems
                : (providedIdentifiers.length > 0
                    ? providedIdentifiers.map((identifier: string) => ({ identifier, fileName: null, seasonNumber: null, episodeNumber: null }))
                    : (await searchArchiveIdentifiers(seriesQuery, limit))
                        .map((identifier: string) => ({ identifier, fileName: null, seasonNumber: null, episodeNumber: null }))));
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
                    bundleIdentifier: preset.bundleIdentifier || null,
                    limit,
                    allowMkv,
                    importType: contentType,
                    seriesTitle: seriesTitleInput || null,
                    seasonNumber: seasonNumberInput,
                    startEpisodeNumber: startEpisodeInput,
                    async: true,
                    items: itemsToProcess.map((item: any) => ({
                        identifier: item.identifier,
                        fileName: item.fileName || null,
                        seasonNumber: item.seasonNumber ?? null,
                        episodeNumber: item.episodeNumber ?? null
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

        for (const [index, item] of itemsToProcess.entries()) {
            const identifier = item.identifier;
            const result: ImportResult = {
                identifier,
                title: identifier,
                status: 'failed'
            };

            try {
                let cached = metadataCache.get(identifier);
                if (!cached) {
                    cached = await fetchArchiveMetadata(identifier);
                    metadataCache.set(identifier, cached);
                }
                const { metadata, files } = cached;
                if (!item.fileName && metadata?.mediatype && String(metadata.mediatype).toLowerCase() !== 'movies') {
                    result.status = 'skipped';
                    result.reason = `Mediatype ${metadata.mediatype} not movies`;
                    results.push(result);
                    continue;
                }
                const preferredName = item.fileName;
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

                let title = stringifyMetadata(metadata?.title) || identifier;
                const isBundleItem = Boolean(preset.bundleIdentifier && identifier === preset.bundleIdentifier);
                const isBundleGeneric = isBundleItem && isGenericBundleTitle(title);
                if (isBundleGeneric && bestFile?.name) {
                    title = deriveTitleFromFileName(bestFile.name);
                }
                if (isExcludedTitle(title) || isExcludedTitle(bestFile.name)) {
                    result.status = 'skipped';
                    result.reason = 'Excluded by title keywords';
                    results.push(result);
                    continue;
                }
                const description = null;
                const releaseYear = parseYear(stringifyMetadata(metadata?.year) || stringifyMetadata(metadata?.date))
                    ?? (isBundleItem ? parseYear(bestFile.name) : null);
                const genre = isBundleGeneric ? null : normalizeGenre(metadata);
                const rating = normalizeRating(metadata);
                const duration = parseDurationSeconds(bestFile.length) || parseDurationSeconds(stringifyMetadata(metadata?.length));
                const minDuration = contentType === 'series' ? MIN_SERIES_DURATION_SECONDS : MIN_FEATURE_DURATION_SECONDS;

                if (duration && duration < minDuration) {
                    result.status = 'skipped';
                    result.reason = `Duration ${Math.round(duration / 60)}m below minimum`;
                    results.push(result);
                    continue;
                }

                const fileSize = bestFile.size ? BigInt(bestFile.size) : null;
                const height = bestFile.height ? Number(bestFile.height) : null;
                const resolution = height ? `${height}p` : null;
                const mimeType = normalizeMimeType(bestFile);
                const parsed = parseSeasonEpisode(bestFile.name);
                const episodeNumber = contentType === 'series'
                    ? (item.episodeNumber ?? parsed.episode ?? (startEpisodeInput !== null ? startEpisodeInput + index : null))
                    : null;
                const seriesTitle = contentType === 'series'
                    ? seriesTitleInput
                    : null;
                const seasonNumber = contentType === 'series'
                    ? (item.seasonNumber ?? parsed.season ?? seasonNumberInput)
                    : null;

                const thumbnailUrl = isBundleItem
                    ? (findThumbnailForFile(files, identifier, bestFile.name) || DEFAULT_POSTER_URL)
                    : `https://archive.org/services/img/${identifier}`;
                const archiveIdentifier = buildArchiveIdentifier(identifier, bestFile.name, preset.bundleIdentifier);
                const s3KeyPlayback = `ia:${identifier}/${bestFile.name}`;

                if (!dryRun) {
                    const existing = await prisma.video.findUnique({
                        where: { archiveIdentifier }
                    });

                    const upserted = await prisma.video.upsert({
                        where: { archiveIdentifier },
                        create: {
                            title,
                            description,
                            type: contentType,
                            playbackType: 'mp4',
                            s3KeyPlayback,
                            cloudfrontPath: playbackUrl,
                            s3KeySource: null,
                            s3Url: playbackUrl,
                            thumbnailUrl,
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
                            archiveIdentifier,
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
                            thumbnailUrl,
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
                            archiveIdentifier,
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
            requested: itemsToProcess.length,
            imported: results.filter((r) => r.status === 'imported').length,
            updated: results.filter((r) => r.status === 'updated').length,
            skipped: results.filter((r) => r.status === 'skipped').length,
            failed: results.filter((r) => r.status === 'failed').length,
            ready: results.filter((r) => r.status === 'ready').length,
            searchQuery: seriesQuery,
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
