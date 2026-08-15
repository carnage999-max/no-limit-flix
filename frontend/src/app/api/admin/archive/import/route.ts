/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { requireAdmin } from '@/lib/admin-auth';
import { writeMediaBuffer } from '@/lib/media-storage';
import { recordAdminAction } from '@/lib/admin-actions';
import { ensureSeriesMetadata } from '@/lib/series-metadata';

type ImportResultStatus = 'imported' | 'updated' | 'skipped' | 'failed' | 'ready';

type PosterMatch = {
    posterUrl: string;
    tmdbId: string | null;
    releaseYear?: number | null;
    source?: string;
};

interface ImportResult {
    identifier: string;
    title: string;
    fileName?: string;
    seriesTitle?: string | null;
    seasonNumber?: number | null;
    episodeNumber?: number | null;
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
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const IMDB_SUGGESTION_BASE = 'https://v3.sg.media-imdb.com/suggestion';
const SERIES_SEARCH_SCAN_LIMIT = 100;
const SERIES_DISCOVERY_QUERY = [
    'mediatype:(movies)',
    '(collection:(classic_tv) OR collection:(classic_television) OR subject:("classic tv") OR subject:("television series") OR title:(episode))',
    '-title:(trailer OR preview OR teaser OR promo OR commercial OR clip OR newsreel OR sample)'
].join(' AND ');
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

const toSeedNumber = (value: string) => {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
    }
    return Math.abs(hash);
};

const shuffleWithSeed = <T,>(items: T[], seed: number) => {
    const result = [...items];
    let state = seed || 1;
    const rand = () => {
        state ^= state << 13;
        state ^= state >> 17;
        state ^= state << 5;
        return Math.abs(state);
    };

    for (let i = result.length - 1; i > 0; i -= 1) {
        const j = rand() % (i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
};

const stringifyMetadata = (value: any) => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
};

const resolveArchiveSourceRights = (metadata: any) =>
    stringifyMetadata(metadata?.rights)
    || stringifyMetadata(metadata?.license)
    || 'Internet Archive source page';

const resolveArchiveSourceLicenseUrl = (metadata: any, sourcePageUrl: string) =>
    stringifyMetadata(metadata?.licenseurl)
    || stringifyMetadata(metadata?.license)
    || sourcePageUrl;

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

const parseAverageRating = (value?: string | null) => {
    if (!value || value === 'N/A') return null;
    const numeric = Number.parseFloat(String(value));
    return Number.isFinite(numeric) ? numeric : null;
};

const parseRatingCount = (value?: string | null) => {
    if (!value || value === 'N/A') return null;
    const cleaned = String(value).replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    const numeric = Number.parseInt(cleaned, 10);
    return Number.isFinite(numeric) ? numeric : null;
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
const POSTER_CONTENT_TYPES = new Map([
    ['image/jpeg', 'jpg'],
    ['image/jpg', 'jpg'],
    ['image/png', 'png'],
    ['image/webp', 'webp'],
]);

const sanitizePosterSegment = (value: string) =>
    value
        .replace(/[^a-z0-9._-]+/gi, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 140)
    || 'poster';

const extensionFromPosterResponse = (posterUrl: string, contentType: string | null) => {
    const normalizedType = String(contentType || '').split(';')[0].trim().toLowerCase();
    if (POSTER_CONTENT_TYPES.has(normalizedType)) {
        return POSTER_CONTENT_TYPES.get(normalizedType) || 'jpg';
    }

    try {
        const pathname = new URL(posterUrl).pathname.toLowerCase();
        const match = pathname.match(/\.([a-z0-9]+)$/);
        const extension = match?.[1];
        if (extension === 'jpeg') return 'jpg';
        if (extension && ['jpg', 'png', 'webp'].includes(extension)) return extension;
    } catch {
        // ignore malformed poster URL
    }

    return 'jpg';
};

const storeImportedPoster = async (posterUrl: string | null, archiveIdentifier: string, fileName: string | null) => {
    if (!posterUrl || !/^https?:\/\//i.test(posterUrl)) {
        return posterUrl;
    }

    try {
        const response = await fetch(posterUrl, {
            headers: {
                Accept: 'image/avif,image/webp,image/png,image/jpeg,image/*,*/*;q=0.8',
                'User-Agent': 'NoLimitFlix-Importer/1.0',
            },
            signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) return posterUrl;

        const contentType = response.headers.get('content-type');
        const normalizedType = String(contentType || '').split(';')[0].trim().toLowerCase();
        if (normalizedType && !POSTER_CONTENT_TYPES.has(normalizedType)) {
            return posterUrl;
        }

        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0 || buffer.length > 10 * 1024 * 1024) {
            return posterUrl;
        }

        const extension = extensionFromPosterResponse(posterUrl, contentType);
        const identifierSegment = sanitizePosterSegment(archiveIdentifier);
        const fileSegment = sanitizePosterSegment(fileName || 'poster').replace(/\.[^.]+$/, '');
        const stored = await writeMediaBuffer(`thumbnails/imported/${identifierSegment}/${fileSegment}.${extension}`, buffer);
        return stored.publicUrl;
    } catch (error) {
        console.warn('Failed to store imported poster locally:', error);
        return posterUrl;
    }
};

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

const buildArchiveIdentifier = (identifier: string, fileName: string | null, bundleIdentifier?: string, contentType?: 'movie' | 'series') => {
    if (fileName && (contentType === 'series' || (bundleIdentifier && identifier === bundleIdentifier))) {
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
    match = text.match(/\s-\s*(\d{1,3})(?:\D|$)/);
    if (match) {
        return { season: null, episode: Number(match[1]) };
    }
    match = text.match(/\bep(?:isode)?[\s._-]*(\d{1,3})\b/);
    if (match) {
        return { season: null, episode: Number(match[1]) };
    }
    match = text.match(/episode\s*(\d{1,3})/);
    if (match) {
        return { season: null, episode: Number(match[1]) };
    }
    return { season: null, episode: null };
};

const parseArchiveSourceIdentifier = (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
        const url = new URL(raw);
        const detailsMatch = url.pathname.match(/\/details\/([^/]+)/);
        if (detailsMatch?.[1]) return decodeURIComponent(detailsMatch[1]);
        const downloadMatch = url.pathname.match(/\/download\/([^/]+)/);
        if (downloadMatch?.[1]) return decodeURIComponent(downloadMatch[1]);
    } catch {
        // Treat plain text as the identifier.
    }
    return raw.replace(/^https?:\/\/archive\.org\/details\//i, '').split(/[/?#]/)[0] || null;
};

const parseArchiveSeriesSource = (value?: string | null): { identifier?: string; query?: string; sort?: string | null } | null => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    try {
        const url = new URL(raw);
        const detailsMatch = url.pathname.match(/\/details\/([^/]+)/);
        if (detailsMatch?.[1]) return { identifier: decodeURIComponent(detailsMatch[1]) };
        const downloadMatch = url.pathname.match(/\/download\/([^/]+)/);
        if (downloadMatch?.[1]) return { identifier: decodeURIComponent(downloadMatch[1]) };
        if (url.pathname === '/search' || url.pathname === '/advancedsearch.php') {
            const query = url.searchParams.get('query') || url.searchParams.get('q');
            if (query?.trim()) {
                return {
                    query: query.trim(),
                    sort: url.searchParams.get('sort') || url.searchParams.get('sort[]'),
                };
            }
        }
    } catch {
        // Treat plain input as an Archive query when it looks like one, else an identifier.
    }
    if (/[():"]/i.test(raw) || raw.includes('creator:') || raw.includes('collection:') || raw.includes('subject:')) {
        return { query: raw };
    }
    return { identifier: raw.replace(/^https?:\/\/archive\.org\/details\//i, '').split(/[/?#]/)[0] };
};

const naturalCompare = (a: string, b: string) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const cleanSeriesTitle = (value?: string | null) => {
    const cleaned = String(value || '')
        .replace(/\.[a-z0-9]+$/i, '')
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/\([^)]*(480|720|1080|2160)p[^)]*\)/gi, ' ')
        .replace(/\bseason\s*\d{1,2}\b/gi, '')
        .replace(/\bs\d{1,2}\b/gi, '')
        .replace(/\b(480|720|1080|2160)p\b/gi, ' ')
        .replace(/\s-\s*\d{1,3}\b/g, ' ')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return cleaned || null;
};

const stripEpisodeMarkers = (value?: string | null) =>
    String(value || '')
        .replace(/\.[a-z0-9]+$/i, ' ')
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/\([^)]*(480|720|1080|2160)p[^)]*\)/gi, ' ')
        .replace(/\bs\d{1,2}\s*e\d{1,3}\b/gi, ' ')
        .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
        .replace(/\bseason\s*\d{1,2}\s*episode\s*\d{1,3}\b/gi, ' ')
        .replace(/\bep(?:isode)?[\s._-]*\d{1,3}\b/gi, ' ')
        .replace(/\bpart\s*\d{1,3}\b/gi, ' ')
        .replace(/\s-\s*\d{1,3}\b/g, ' ')
        .replace(/\b(480|720|1080|2160)p\b/gi, ' ')
        .replace(/\b(19|20)\d{2}\b/g, ' ')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const inferSeriesTitleFromTitles = (titles: string[], fallback: string) => {
    const cleanedTitles = titles
        .map((title) => stripEpisodeMarkers(title))
        .filter(Boolean);
    if (cleanedTitles.length === 0) return cleanSeriesTitle(fallback) || fallback;

    const tokenized = cleanedTitles.map((title) => title.split(/\s+/));
    const shortest = tokenized.reduce((shortestTokens, tokens) => tokens.length < shortestTokens.length ? tokens : shortestTokens, tokenized[0]);
    const common: string[] = [];
    for (let index = 0; index < shortest.length; index += 1) {
        const token = shortest[index].toLowerCase();
        if (tokenized.every((tokens) => tokens[index]?.toLowerCase() === token)) {
            common.push(shortest[index]);
            continue;
        }
        break;
    }

    if (common.length >= 2) return cleanSeriesTitle(common.join(' ')) || fallback;
    return cleanSeriesTitle(cleanedTitles[0]) || cleanSeriesTitle(fallback) || fallback;
};

const inferSeriesTitle = (metadata: any, identifier: string, files: any[]) => {
    if (files.length > 1) {
        const inferredFromFiles = inferSeriesTitleFromTitles(files.map((file) => file?.name).filter(Boolean), identifier);
        if (inferredFromFiles) return inferredFromFiles;
    }

    const metadataTitle = cleanSeriesTitle(stringifyMetadata(metadata?.title));
    if (metadataTitle && !isGenericBundleTitle(metadataTitle)) return metadataTitle;

    const firstFile = files.find((file) => file?.name);
    if (firstFile?.name) {
        const base = deriveTitleFromFileName(firstFile.name)
            .replace(/\bs\d{1,2}\s*e\d{1,3}\b/gi, '')
            .replace(/\b\d{1,2}x\d{1,3}\b/gi, '')
            .replace(/\bepisode\s*\d{1,3}\b/gi, '')
            .replace(/\bep\s*\d{1,3}\b/gi, '');
        const cleaned = cleanSeriesTitle(base);
        if (cleaned) return cleaned;
    }

    return cleanSeriesTitle(identifier) || identifier;
};

const deriveEpisodeTitle = (fileName: string, seriesTitle: string, episodeNumber: number | null) => {
    let title = deriveTitleFromFileName(fileName);
    const escapedSeries = seriesTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    title = title.replace(new RegExp(escapedSeries, 'ig'), ' ');
    title = title
        .replace(/\[[^\]]*]/g, ' ')
        .replace(/\bs\d{1,2}\s*e\d{1,3}\b/gi, ' ')
        .replace(/\b\d{1,2}x\d{1,3}\b/gi, ' ')
        .replace(/\bseason\s*\d{1,2}\s*episode\s*\d{1,3}\b/gi, ' ')
        .replace(/\bep(?:isode)?\s*\d{1,3}\b/gi, ' ')
        .replace(/\s-\s*\d{1,3}\b/g, ' ')
        .replace(/\b(480|720|1080|2160)p\b/gi, ' ')
        .replace(/\b(x264|x265|h264|h265|hevc|hdrip|webrip|web|dvdrip|bluray|brrip|hd|sd|uhd)\b/gi, ' ')
        .replace(/[_-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    if (title) return title;
    return episodeNumber ? `Episode ${episodeNumber}` : deriveTitleFromFileName(fileName);
};

const isPlayableWithPreference = (file: any, allowMkv: boolean) =>
    rankPlayableFiles([file], allowMkv).length > 0;

const pickPreferredSeriesFile = (current: any, next: any, allowMkv: boolean) =>
    rankPlayableFiles([current, next], allowMkv)[0] || current;

const buildSeriesManifest = async ({
    sourceIdentifier,
    fallbackIdentifier,
    allowMkv,
    limit,
    page,
}: {
    sourceIdentifier: string | null;
    fallbackIdentifier?: string | null;
    allowMkv: boolean;
    limit: number;
    page: number;
}) => {
    const source = parseArchiveSeriesSource(sourceIdentifier);
    if (source?.query) {
        return buildSeriesSearchManifest({
            query: source.query,
            sort: source.sort,
            allowMkv,
            limit,
            page,
        });
    }

    const identifier = parseArchiveSourceIdentifier(sourceIdentifier) || parseArchiveSourceIdentifier(fallbackIdentifier);
    if (!identifier) {
        throw new Error('Enter an Internet Archive URL or identifier to analyze this series.');
    }

    const { metadata, files } = await fetchArchiveMetadata(identifier);
    const playableFiles = files
        .filter((file) => file?.name && isPlayableWithPreference(file, allowMkv))
        .filter((file) => !isExcludedTitle(file.name));

    if (playableFiles.length === 0) {
        throw new Error('No playable episode files found for this Archive source.');
    }

    const seriesTitle = inferSeriesTitle(metadata, identifier, playableFiles);
    const sortedFiles = [...playableFiles].sort((a, b) => {
        const aParts = parseSeasonEpisode(a.name);
        const bParts = parseSeasonEpisode(b.name);
        if (aParts.season !== null && bParts.season !== null && aParts.season !== bParts.season) {
            return aParts.season - bParts.season;
        }
        if (aParts.episode !== null && bParts.episode !== null && aParts.episode !== bParts.episode) {
            return aParts.episode - bParts.episode;
        }
        return naturalCompare(a.name, b.name);
    });

    const byEpisode = new Map<string, any>();
    sortedFiles.forEach((file, index) => {
        const parsed = parseSeasonEpisode(file.name);
        const seasonNumber = parsed.season ?? 1;
        const episodeNumber = parsed.episode ?? index + 1;
        const key = `${seasonNumber}:${episodeNumber}`;
        const existing = byEpisode.get(key);
        byEpisode.set(key, existing ? pickPreferredSeriesFile(existing, file, allowMkv) : file);
    });

    const manifestFiles = Array.from(byEpisode.values()).sort((a, b) => {
        const aParts = parseSeasonEpisode(a.name);
        const bParts = parseSeasonEpisode(b.name);
        const aSeason = aParts.season ?? 1;
        const bSeason = bParts.season ?? 1;
        const aEpisode = aParts.episode ?? sortedFiles.indexOf(a) + 1;
        const bEpisode = bParts.episode ?? sortedFiles.indexOf(b) + 1;
        if (aSeason !== bSeason) return aSeason - bSeason;
        if (aEpisode !== bEpisode) return aEpisode - bEpisode;
        return naturalCompare(a.name, b.name);
    });

    const start = (Math.max(page, 1) - 1) * limit;
    const pageFiles = manifestFiles.slice(start, start + limit);

    const results: ImportResult[] = pageFiles.map((file, index) => {
        const parsed = parseSeasonEpisode(file.name);
        const absoluteIndex = start + index;
        const seasonNumber = parsed.season ?? 1;
        const episodeNumber = parsed.episode ?? absoluteIndex + 1;
        const duration = parseDurationSeconds(file.length) || parseDurationSeconds(stringifyMetadata(metadata?.length) || undefined);
        const playbackUrl = buildArchiveDownloadUrl(identifier, file.name);
        const episodeTitle = deriveEpisodeTitle(file.name, seriesTitle, episodeNumber);
        const reason = parsed.episode === null ? 'Episode number inferred from file order' : undefined;

        return {
            identifier,
            title: episodeTitle,
            fileName: file.name,
            seriesTitle,
            seasonNumber,
            episodeNumber,
            playbackUrl,
            fileSize: file.size ? String(file.size) : null,
            duration,
            sourcePageUrl: `https://archive.org/details/${identifier}`,
            status: 'ready',
            reason,
        };
    });

    return {
        identifier,
        seriesTitle,
        totalAvailable: manifestFiles.length,
        results,
    };
};

const buildSeriesSearchManifest = async ({
    query,
    sort,
    allowMkv,
    limit,
    page,
}: {
    query: string;
    sort?: string | null;
    allowMkv: boolean;
    limit: number;
    page: number;
}) => {
    const identifiers = await searchArchiveIdentifiers(query, SERIES_SEARCH_SCAN_LIMIT, 1, sort);
    if (identifiers.length === 0) {
        throw new Error('No Archive results found for that series list.');
    }

    const candidates: Array<{
        identifier: string;
        title: string;
        file: any;
        metadata: any;
        duration: number | null;
    }> = [];
    const failures: string[] = [];

    for (const identifier of identifiers) {
        try {
            const { metadata, files } = await fetchArchiveMetadata(identifier);
            if (metadata?.mediatype && String(metadata.mediatype).toLowerCase() !== 'movies') {
                failures.push(`${identifier}: mediatype ${metadata.mediatype}`);
                continue;
            }

            const file = rankPlayableFiles(files, allowMkv)
                .filter((candidateFile) => !isExcludedTitle(candidateFile.name))[0] || null;
            if (!file) {
                failures.push(`${identifier}: no playable file`);
                continue;
            }

            const title = stringifyMetadata(metadata?.title) || deriveTitleFromFileName(file.name) || identifier;
            if (isExcludedTitle(title)) {
                failures.push(`${identifier}: excluded title`);
                continue;
            }

            const duration = parseDurationSeconds(file.length) || parseDurationSeconds(stringifyMetadata(metadata?.length) || undefined);
            if (duration && duration < MIN_SERIES_DURATION_SECONDS) {
                failures.push(`${identifier}: duration below minimum`);
                continue;
            }

            candidates.push({ identifier, title, file, metadata, duration });
        } catch (error: any) {
            failures.push(`${identifier}: ${error?.message || 'metadata failed'}`);
        }
    }

    if (candidates.length === 0) {
        throw new Error(failures.length > 0
            ? `No playable episodes found from that series list. ${failures.slice(0, 3).join('; ')}`
            : 'No playable episodes found from that series list.');
    }

    const seriesTitle = inferSeriesTitleFromTitles(
        candidates.map((candidate) => candidate.title),
        query,
    );

    const orderedCandidates = [...candidates].sort((a, b) => {
        const aParts = parseSeasonEpisode(`${a.title} ${a.file.name}`);
        const bParts = parseSeasonEpisode(`${b.title} ${b.file.name}`);
        const aSeason = aParts.season ?? 1;
        const bSeason = bParts.season ?? 1;
        const aEpisode = aParts.episode ?? Number.POSITIVE_INFINITY;
        const bEpisode = bParts.episode ?? Number.POSITIVE_INFINITY;
        if (aSeason !== bSeason) return aSeason - bSeason;
        if (aEpisode !== bEpisode) return aEpisode - bEpisode;
        return naturalCompare(a.title, b.title);
    });

    const start = (Math.max(page, 1) - 1) * limit;
    const pageCandidates = orderedCandidates.slice(start, start + limit);
    const results: ImportResult[] = pageCandidates.map((candidate, index) => {
        const parsed = parseSeasonEpisode(`${candidate.title} ${candidate.file.name}`);
        const seasonNumber = parsed.season ?? 1;
        const episodeNumber = parsed.episode ?? start + index + 1;
        const episodeTitle = deriveEpisodeTitle(candidate.title || candidate.file.name, seriesTitle, episodeNumber);

        return {
            identifier: candidate.identifier,
            title: episodeTitle,
            fileName: candidate.file.name,
            seriesTitle,
            seasonNumber,
            episodeNumber,
            playbackUrl: buildArchiveDownloadUrl(candidate.identifier, candidate.file.name),
            fileSize: candidate.file.size ? String(candidate.file.size) : null,
            duration: candidate.duration,
            sourcePageUrl: `https://archive.org/details/${candidate.identifier}`,
            status: 'ready',
            reason: parsed.episode === null ? 'Episode number inferred from search order' : undefined,
        };
    });

    return {
        identifier: query,
        searchQuery: query,
        seriesTitle,
        totalAvailable: orderedCandidates.length,
        results,
    };
};

const discoverSeriesManifest = async ({
    allowMkv,
    limit,
    page,
}: {
    allowMkv: boolean;
    limit: number;
    page: number;
}) => {
    const discoveryPageSize = 24;
    const searchPage = Math.max(page, 1);
    const identifiers = await searchArchiveIdentifiers(SERIES_DISCOVERY_QUERY, discoveryPageSize, searchPage);
    const failures: string[] = [];

    for (const identifier of identifiers) {
        try {
            const manifest = await buildSeriesManifest({
                sourceIdentifier: identifier,
                fallbackIdentifier: null,
                allowMkv,
                limit,
                page: 1,
            });

            if (manifest.totalAvailable < 2) {
                failures.push(`${identifier}: only ${manifest.totalAvailable} playable item`);
                continue;
            }

            return {
                ...manifest,
                searchQuery: SERIES_DISCOVERY_QUERY,
                discoveryPage: searchPage,
            };
        } catch (error: any) {
            failures.push(`${identifier}: ${error?.message || 'not usable'}`);
        }
    }

    throw new Error(failures.length > 0
        ? `No usable series found on discovery page ${searchPage}. ${failures.slice(0, 3).join('; ')}`
        : 'No series candidates found from Internet Archive discovery.');
};

const stripYearFromTitle = (value?: string) => {
    if (!value) return '';
    return value.replace(/\((19|20)\d{2}\)/g, '').replace(/\b(19|20)\d{2}\b/g, '');
};

const normalizeTitle = (value?: string) => {
    if (!value) return '';
    const cleaned = stripYearFromTitle(value)
        .toLowerCase()
        .replace(/&/g, 'and')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    return cleaned.replace(/^(the|a|an)\s+/i, '');
};

const sanitizeSearchTitle = (value?: string) => {
    if (!value) return '';
    let cleaned = String(value);
    cleaned = cleaned.replace(/\.[a-z0-9]+$/i, '');
    cleaned = cleaned.replace(/\[[^\]]*\]/g, ' ');
    cleaned = cleaned.replace(/\([^)]*\)/g, ' ');
    cleaned = cleaned.replace(/\b(480|720|1080|2160)p\b/gi, ' ');
    cleaned = cleaned.replace(/\b(x264|x265|h264|h265|hevc|hdrip|webrip|web|dvdrip|bluray|brrip|hd|sd|uhd)\b/gi, ' ');
    cleaned = cleaned.replace(/[_-]+/g, ' ');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    return cleaned;
};

const parseTmdbYear = (value?: string) => {
    if (!value) return null;
    const match = value.match(/(19|20)\d{2}/);
    return match ? Number(match[0]) : null;
};

const yearsMatch = (a: number | null, b: number | null, tolerance = 1) => {
    if (!a || !b) return true;
    return Math.abs(a - b) <= tolerance;
};

const resolveYearHint = (title: string | null | undefined, ...sources: Array<string | null | undefined>) => {
    for (const source of sources) {
        const year = parseYear(source || undefined);
        if (year) return year;
    }
    return parseYear(title || undefined);
};

const getCandidateYear = (item: any) => parseTmdbYear(item?.release_date || item?.first_air_date || item?.Year);

const scoreCandidate = (candidate: string, target: string, candidateYear: number | null, targetYear: number | null) => {
    if (!candidate || !target) return 0;
    let score = 0;
    if (candidate === target) score += 5;
    if (candidate.startsWith(target) || target.startsWith(candidate)) score += 3;
    if (candidate.includes(target) || target.includes(candidate)) score += 2;
    if (targetYear && candidateYear) {
        const delta = Math.abs(candidateYear - targetYear);
        if (delta === 0) score += 4;
        else if (delta === 1) score += 2;
        else if (delta <= 3) score += 1;
        else score -= 8;
    }
    return score;
};

const compareCandidates = (
    a: { item: any; score: number },
    b: { item: any; score: number },
    targetYear: number | null,
    preferOlder = false
) => {
    if (b.score !== a.score) return b.score - a.score;

    const aYear = getCandidateYear(a.item);
    const bYear = getCandidateYear(b.item);

    if (targetYear) {
        const aDist = aYear ? Math.abs(aYear - targetYear) : Number.POSITIVE_INFINITY;
        const bDist = bYear ? Math.abs(bYear - targetYear) : Number.POSITIVE_INFINITY;
        if (aDist !== bDist) return aDist - bDist;
        if (aYear && bYear && aYear !== bYear) return aYear - bYear;
    } else if (preferOlder && aYear && bYear && aYear !== bYear) {
        return aYear - bYear;
    }

    return 0;
};

const pickBestScoredCandidate = (
    scored: Array<{ item: any; score: number }>,
    options: { year: number | null; minScore: number }
) => {
    for (const entry of scored) {
        if (entry.score < options.minScore) continue;
        if (!entry.item?.poster_path) continue;
        const candidateYear = getCandidateYear(entry.item);
        if (options.year && candidateYear && !yearsMatch(candidateYear, options.year)) continue;
        return entry;
    }
    return null;
};

const pickBestOmdbSearchCandidate = (
    scored: Array<{ item: any; score: number }>,
    options: { year: number | null; minScore: number }
) => {
    for (const entry of scored) {
        if (entry.score < options.minScore) continue;
        if (!entry.item?.imdbID) continue;
        const candidateYear = parseYear(entry.item?.Year);
        if (options.year && candidateYear && !yearsMatch(candidateYear, options.year)) continue;
        return entry;
    }
    return null;
};

const getTmdbKey = () => process.env.TMDB_API_KEY || process.env.NEXT_PUBLIC_TMDB_API_KEY || '';

const fetchJson = async (url: string) => {
    try {
        const response = await fetch(url, {
            headers: { Accept: 'application/json' },
            signal: AbortSignal.timeout(8000),
            next: { revalidate: 3600 }
        });
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
};

const fetchTmdb = async (endpoint: string, params: Record<string, string>) => {
    const apiKey = getTmdbKey();
    if (!apiKey) return null;
    const queryParams = new URLSearchParams({
        api_key: apiKey,
        ...params
    });
    return fetchJson(`${TMDB_BASE_URL}${endpoint}?${queryParams.toString()}`);
};

const findCatalogPoster = async (
    title: string | null,
    year: number | null,
    type: 'movie' | 'series',
    options: { minScore?: number; ignoreYear?: boolean } = {}
) => {
    if (!title) return null;
    const minScore = options.minScore ?? 3;
    const ignoreYear = options.ignoreYear ?? false;

    try {
        const endpoint = type === 'series' ? '/search/tv' : '/search/movie';
        const safeTitle = sanitizeSearchTitle(title) || title;
        const params: Record<string, string> = { query: safeTitle };
        if (year && !ignoreYear) {
            params[type === 'series' ? 'first_air_date_year' : 'year'] = String(year);
        }
        const data = await fetchTmdb(endpoint, params);
        const results = data?.results || [];
        if (!results.length) return null;

        const target = normalizeTitle(title);
        const preferOlder = type === 'movie' && !year;
        const scored = results.map((item: any) => {
            const candidateTitle = item?.title || item?.name || '';
            const candidateYear = getCandidateYear(item);
            const score = scoreCandidate(normalizeTitle(candidateTitle), target, candidateYear, year);
            return { item, score };
        });
        scored.sort((a: any, b: any) => compareCandidates(a, b, year, preferOlder));
        const best = pickBestScoredCandidate(scored, { year, minScore });
        if (!best) return null;

        return {
            posterUrl: `${TMDB_IMAGE_BASE}${best.item.poster_path}`,
            tmdbId: String(best.item.id),
            releaseYear: getCandidateYear(best.item)
        };
    } catch {
        return null;
    }
};

const fetchOmdbJson = async (params: URLSearchParams) => {
    return fetchJson(`https://www.omdbapi.com/?${params.toString()}`);
};

const resolveImdbSuggestionMatch = async (
    title: string | null,
    type: 'movie' | 'series',
    year: number | null = null
) => {
    const safeTitle = sanitizeSearchTitle(title || undefined) || title;
    if (!safeTitle) return null;

    try {
        const first = safeTitle.toLowerCase().match(/[a-z0-9]/)?.[0] || 'x';
        const data = await fetchJson(`${IMDB_SUGGESTION_BASE}/${first}/${encodeURIComponent(safeTitle)}.json`);
        const results = data?.d || [];
        if (!results.length) return null;

        const target = normalizeTitle(safeTitle);
        const scored = results
            .filter((item: any) => /^tt\d+$/i.test(String(item?.id || '')))
            .map((item: any) => {
                const candidateTitle = item?.l || '';
                const candidateYear = parseYear(String(item?.y || item?.yr || ''));
                const isSeriesCandidate = /tv|series/i.test(String(item?.q || ''));
                let score = scoreCandidate(normalizeTitle(candidateTitle), target, candidateYear, year);
                if (type === 'series') score += isSeriesCandidate ? 3 : -3;
                if (type === 'movie') score += isSeriesCandidate ? -3 : 1;
                return { item, score };
            })
            .sort((a: any, b: any) => compareCandidates(a, b, year, type === 'movie' && !year));

        const best = scored.find((entry: any) => {
            const candidateYear = parseYear(String(entry.item?.y || entry.item?.yr || ''));
            if (entry.score < 2) return false;
            if (year && candidateYear && !yearsMatch(candidateYear, year)) return false;
            return true;
        });

        if (!best?.item?.id) return null;
        return {
            imdbId: best.item.id,
            posterUrl: best.item?.i?.imageUrl || null,
            releaseYear: parseYear(String(best.item?.y || best.item?.yr || '')),
        };
    } catch {
        return null;
    }
};

const resolveImdbSuggestionId = async (
    title: string | null,
    type: 'movie' | 'series',
    year: number | null = null
) => {
    const match = await resolveImdbSuggestionMatch(title, type, year);
    return match?.imdbId || null;
};

const resolveOmdbDetails = async (
    title: string | null,
    type: 'movie' | 'series',
    year: number | null = null
) => {
    const apiKey = process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '';
    if (!apiKey || !title) return null;

    const safeTitle = sanitizeSearchTitle(title) || title;
    const params = new URLSearchParams({
        apikey: apiKey,
        t: safeTitle
    });
    if (type === 'series') params.set('type', 'series');
    if (type === 'movie') params.set('type', 'movie');
    if (year) params.set('y', String(year));

    let data = await fetchOmdbJson(params);
    if (data && data.Response !== 'False' && year) {
        const matchedYear = parseYear(data.Year);
        if (matchedYear && !yearsMatch(matchedYear, year)) {
            data = null;
        }
    }

    if (!data || data.Response === 'False') {
        const searchParams = new URLSearchParams({
            apikey: apiKey,
            s: safeTitle
        });
        if (type === 'series') searchParams.set('type', 'series');
        if (type === 'movie') searchParams.set('type', 'movie');
        if (year) searchParams.set('y', String(year));

        const searchData = await fetchOmdbJson(searchParams);
        const results = searchData?.Search || [];
        const target = normalizeTitle(safeTitle);
        const scored = results
            .map((item: any) => {
                const candidateTitle = item?.Title || '';
                const candidateYear = parseYear(item?.Year);
                const score = scoreCandidate(normalizeTitle(candidateTitle), target, candidateYear, year);
                return { item, score };
            })
            .sort((a: any, b: any) => compareCandidates(a, b, year, type === 'movie' && !year));
        const best = pickBestOmdbSearchCandidate(scored, { year, minScore: 2 });
        const suggestedImdbId = best?.item?.imdbID || await resolveImdbSuggestionId(safeTitle, type, year);
        if (!suggestedImdbId) return null;

        const detailParams = new URLSearchParams({
            apikey: apiKey,
            i: suggestedImdbId,
            plot: 'short'
        });
        data = await fetchOmdbJson(detailParams);
        if (!data || data.Response === 'False') return null;
    }

    return {
        title: data.Title || null,
        year: data.Year || null,
        genre: data.Genre || null,
        rated: data.Rated || null,
        plot: data.Plot || null,
        imdbRating: data.imdbRating || null,
        imdbVotes: data.imdbVotes || null,
        imdbId: data.imdbID || null,
        poster: data.Poster && data.Poster !== 'N/A' ? data.Poster : null
    };
};

const findOmdbPoster = async (title: string | null, year: number | null, type: 'movie' | 'series') => {
    const apiKey = process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '';
    if (!apiKey || !title) return null;

    const details = await resolveOmdbDetails(title, type, year);
    if (!details) return null;

    if (year) {
        const matchedYear = parseYear(details.year || undefined);
        if (matchedYear && !yearsMatch(matchedYear, year)) return null;
    }

    const imdbId = details.imdbId;
    if (imdbId) {
        return {
            posterUrl: `https://img.omdbapi.com/?i=${encodeURIComponent(imdbId)}&h=600&apikey=${encodeURIComponent(apiKey)}`,
            tmdbId: null,
            releaseYear: parseYear(details.year || undefined)
        };
    }

    if (!details.poster) return null;
    return {
        posterUrl: details.poster,
        tmdbId: null,
        releaseYear: parseYear(details.year || undefined)
    };
};

const findWikipediaPoster = async (title: string | null, year: number | null, type: 'movie' | 'series') => {
    if (!title) return null;
    const intent = type === 'series' ? 'tv series' : 'film';
    const search = `${sanitizeSearchTitle(title) || title} ${year || ''} ${intent}`.trim();

    const searchParams = new URLSearchParams({
        action: 'query',
        list: 'search',
        srsearch: search,
        srlimit: '5',
        format: 'json',
        origin: '*'
    });

    const searchData = await fetchJson(`https://en.wikipedia.org/w/api.php?${searchParams.toString()}`);
    const hits = searchData?.query?.search || [];
    if (!hits.length) return null;

    const pageIds = hits.map((hit: any) => hit.pageid).filter(Boolean);
    if (!pageIds.length) return null;

    const imageParams = new URLSearchParams({
        action: 'query',
        prop: 'pageimages',
        piprop: 'thumbnail',
        pithumbsize: '500',
        format: 'json',
        pageids: pageIds.join(','),
        origin: '*'
    });

    const imageData = await fetchJson(`https://en.wikipedia.org/w/api.php?${imageParams.toString()}`);
    const pages = imageData?.query?.pages || {};

    for (const pageId of pageIds) {
        const page = pages[pageId];
        if (page?.thumbnail?.source) {
            return {
                posterUrl: page.thumbnail.source,
                tmdbId: null,
                releaseYear: year
            };
        }
    }

    return null;
};

const findImdbSuggestionPoster = async (title: string | null, year: number | null, type: 'movie' | 'series') => {
    const match = await resolveImdbSuggestionMatch(title, type, year);
    if (!match?.posterUrl) return null;
    return {
        posterUrl: match.posterUrl,
        tmdbId: null,
        releaseYear: match.releaseYear,
        source: 'imdb'
    };
};

const findBestPoster = async (title: string | null, year: number | null, type: 'movie' | 'series'): Promise<PosterMatch | null> => {
    const yearHint = type === 'series' ? null : (year ?? parseYear(title || undefined));

    let poster: PosterMatch | null = await findOmdbPoster(title, yearHint, type);
    if (!poster) {
        poster = await findCatalogPoster(title, yearHint, type, {
            minScore: yearHint ? 3 : 2,
            ignoreYear: !yearHint,
        });
    }
    if (!poster && yearHint) {
        poster = await findCatalogPoster(title, yearHint, type, {
            minScore: 2,
            ignoreYear: true,
        });
    }
    if (!poster && type === 'series' && year) {
        poster = await findOmdbPoster(title, year, type)
            || await findCatalogPoster(title, year, type, { minScore: 2, ignoreYear: false });
    }
    if (!poster) {
        poster = await findImdbSuggestionPoster(title, yearHint, type);
    }
    if (!poster) {
        poster = await findWikipediaPoster(title, yearHint, type);
    }
    return poster;
};

export async function POST(request: NextRequest) {
    try {
        const auth = await requireAdmin(request);
        if (auth.response) return auth.response;

        const body = await request.json();
        const presetId = body?.preset || DEFAULT_ARCHIVE_PRESET_ID;
        const limit = Math.min(Math.max(Number(body?.limit) || 1, 1), 200);
        const page = Math.max(Number(body?.page) || 1, 1);
        const shuffleSeedInput = body?.shuffleSeed ? String(body.shuffleSeed) : null;
        const allowMkv = Boolean(body?.allowMkv);
        const requestedType = body?.contentType || body?.importType;
        const contentType = requestedType === 'series' ? 'series' : 'movie';
        const archiveSourceInput = body?.archiveSource || body?.sourceIdentifier || body?.sourceUrl || null;
        let seriesTitleInput = contentType === 'series' ? String(body?.seriesTitle || '').trim() : '';
        const seasonNumberInput = contentType === 'series' ? Number(body?.seasonNumber) || 1 : null;
        const startEpisodeInput = contentType === 'series' ? Number(body?.startEpisodeNumber) || 1 : null;
        const dryRun = Boolean(body?.dryRun);

        const preset = ARCHIVE_PRESETS.find((p) => p.id === presetId) || ARCHIVE_PRESETS[0];
        const seriesQuery = preset.query;

        const providedIdentifiers = Array.isArray(body?.identifiers) ? body.identifiers.filter(Boolean) : [];
        const providedItems = Array.isArray(body?.items)
            ? body.items
                .map((item: any) => ({
                    identifier: String(item?.identifier || '').trim(),
                    fileName: item?.fileName ? String(item.fileName) : null,
                    title: item?.title ? String(item.title).trim() : null,
                    seriesTitle: item?.seriesTitle ? String(item.seriesTitle).trim() : null,
                    seasonNumber: Number.isFinite(Number(item?.seasonNumber)) ? Number(item.seasonNumber) : null,
                    episodeNumber: Number.isFinite(Number(item?.episodeNumber)) ? Number(item.episodeNumber) : null
                }))
                .filter((item: any) => item.identifier)
            : [];

        if (contentType === 'series' && !seriesTitleInput && providedItems[0]?.seriesTitle) {
            seriesTitleInput = providedItems[0].seriesTitle;
        }

        const metadataCache = new Map<string, { metadata: any; files: any[] }>();
        const seriesManifest = contentType === 'series' && providedItems.length === 0 && providedIdentifiers.length === 0
            ? (archiveSourceInput
                ? await buildSeriesManifest({
                    sourceIdentifier: String(archiveSourceInput),
                    fallbackIdentifier: null,
                    allowMkv,
                    limit,
                    page,
                })
                : await discoverSeriesManifest({
                    allowMkv,
                    limit,
                    page,
                }))
            : null;

        if (contentType === 'series' && seriesManifest) {
            seriesTitleInput = seriesManifest.seriesTitle;
            if (dryRun) {
                return NextResponse.json({
                    results: seriesManifest.results,
                    summary: {
                        requested: seriesManifest.results.length,
                        ready: seriesManifest.results.length,
                        searchQuery: 'searchQuery' in seriesManifest ? seriesManifest.searchQuery : seriesManifest.identifier,
                        seriesTitle: seriesManifest.seriesTitle,
                        totalAvailable: seriesManifest.totalAvailable,
                        page,
                    },
                });
            }
        }

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
            const seedValue = shuffleSeedInput || Date.now().toString();
            const shuffled = shuffleWithSeed(rankedFiles, toSeedNumber(seedValue));
            const start = (page - 1) * limit;
            const end = start + limit;
            const pageItems = shuffled.slice(start, end);
            return {
                seed: seedValue,
                total: rankedFiles.length,
                items: pageItems.map((file) => {
                    const parsed = parseSeasonEpisode(file.name);
                    return {
                        identifier: bundleId,
                        fileName: file.name,
                        seasonNumber: parsed.season,
                        episodeNumber: parsed.episode
                    };
                })
            };
        };

        const bundleResult = contentType !== 'series' && providedItems.length === 0 && preset.bundleIdentifier
            ? await hydrateBundleItems()
            : null;

        const bundleItems = bundleResult?.items || null;
        const shuffleSeed = bundleResult?.seed || shuffleSeedInput || null;
        const totalAvailable = bundleResult?.total || null;

        const itemsToProcess = providedItems.length > 0
            ? providedItems
            : (seriesManifest
                ? seriesManifest.results.map((item) => ({
                    identifier: item.identifier,
                    fileName: item.fileName || null,
                    title: item.title,
                    seriesTitle: item.seriesTitle || seriesManifest.seriesTitle,
                    seasonNumber: item.seasonNumber ?? null,
                    episodeNumber: item.episodeNumber ?? null,
                }))
                : (bundleItems && bundleItems.length > 0
                ? bundleItems
                : (providedIdentifiers.length > 0
                    ? providedIdentifiers.map((identifier: string) => ({ identifier, fileName: null, seasonNumber: null, episodeNumber: null }))
                    : (await searchArchiveIdentifiers(seriesQuery, limit, page))
                        .map((identifier: string) => ({ identifier, fileName: null, seasonNumber: null, episodeNumber: null })))));

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
                    playbackMode: 'mp4',
                    async: true,
                    items: itemsToProcess.map((item: any) => ({
                        identifier: item.identifier,
                        fileName: item.fileName || null,
                        title: item.title || null,
                        seriesTitle: item.seriesTitle || seriesTitleInput || null,
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

                let title = contentType === 'series' && item.title
                    ? item.title
                    : stringifyMetadata(metadata?.title) || identifier;
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
                const omdbQueryTitle = contentType === 'series' ? (seriesTitleInput || title) : title;
                const yearHint = contentType === 'series'
                    ? parseYear(omdbQueryTitle)
                    : resolveYearHint(
                        omdbQueryTitle,
                        stringifyMetadata(metadata?.year),
                        stringifyMetadata(metadata?.date),
                        bestFile.name
                    );
                const omdbDetails = await resolveOmdbDetails(omdbQueryTitle, contentType, yearHint);
                const description = omdbDetails?.plot && omdbDetails.plot !== 'N/A' ? omdbDetails.plot : null;
                const omdbYear = parseYear(omdbDetails?.year || undefined);
                const releaseYear = yearHint
                    ?? omdbYear
                    ?? (isBundleItem ? parseYear(bestFile.name || undefined) : null);
                const genre = omdbDetails?.genre || (isBundleGeneric ? null : normalizeGenre(metadata));
                const rating = omdbDetails?.rated || normalizeRating(metadata);
                const averageRating = parseAverageRating(omdbDetails?.imdbRating);
                const ratingCount = parseRatingCount(omdbDetails?.imdbVotes);
                const duration = parseDurationSeconds(bestFile.length) || parseDurationSeconds(stringifyMetadata(metadata?.length) || undefined);
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
                    ? (item.seriesTitle || seriesTitleInput)
                    : null;
                const seasonNumber = contentType === 'series'
                    ? (item.seasonNumber ?? parsed.season ?? seasonNumberInput)
                    : null;

                const posterTitle = contentType === 'series' ? (seriesTitle || title) : title;
                const posterMatch = await findBestPoster(posterTitle, releaseYear ?? yearHint, contentType);
                const resolvedReleaseYear = releaseYear ?? posterMatch?.releaseYear ?? omdbYear ?? null;
                const tmdbId = posterMatch?.tmdbId || null;
                const archiveIdentifier = buildArchiveIdentifier(identifier, bestFile.name, preset.bundleIdentifier, contentType);
                const posterSourceUrl = posterMatch?.posterUrl || (
                    contentType === 'series'
                        ? DEFAULT_POSTER_URL
                        : isBundleItem
                        ? (findThumbnailForFile(files, identifier, bestFile.name) || DEFAULT_POSTER_URL)
                        : `https://archive.org/services/img/${identifier}`
                );
                const thumbnailUrl = dryRun
                    ? posterSourceUrl
                    : await storeImportedPoster(posterSourceUrl, archiveIdentifier, bestFile.name);
                const s3KeyPlayback = `ia:${identifier}/${bestFile.name}`;

                if (!dryRun) {
                    const existing = await prisma.video.findUnique({
                        where: { archiveIdentifier },
                        select: {
                            id: true,
                            thumbnailLocked: true,
                            thumbnailUrl: true,
                        },
                    });
                    const shouldUpdateThumbnail = !existing?.thumbnailLocked;
                    const thumbnailSource = thumbnailUrl?.startsWith('/media/thumbnails/') ? 'import' : 'external';
                    const series = contentType === 'series'
                        ? await ensureSeriesMetadata({
                            title: seriesTitle,
                            description,
                            thumbnailUrl,
                            thumbnailSource,
                            releaseYear: resolvedReleaseYear,
                            genre,
                            rating,
                            averageRating,
                            ratingCount,
                            tmdbId,
                            sourceProvider: 'internet_archive',
                            sourcePageUrl,
                            sourceRights: resolveArchiveSourceRights(metadata),
                            sourceLicenseUrl: resolveArchiveSourceLicenseUrl(metadata, sourcePageUrl),
                        })
                        : null;

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
                            thumbnailSource,
                            thumbnailLocked: false,
                            thumbnailUpdatedAt: thumbnailUrl ? new Date() : null,
                            status: 'completed',
                            releaseYear: resolvedReleaseYear,
                            duration,
                            resolution,
                            genre,
                            rating,
                            averageRating,
                            ratingCount,
                            seriesId: series?.id || null,
                            seriesTitle,
                            seasonNumber,
                            episodeNumber,
                            fileSize,
                            mimeType,
                            tmdbId,
                            format: bestFile.format || null,
                            sourceType: 'external_legal',
                            sourceProvider: 'internet_archive',
                            sourcePageUrl,
                            archiveIdentifier,
                            sourceRights: resolveArchiveSourceRights(metadata),
                            sourceLicenseUrl: resolveArchiveSourceLicenseUrl(metadata, sourcePageUrl),
                            sourceMetadata: metadata,
                        },
                        update: {
                            title,
                            description,
                            playbackType: 'mp4',
                            s3KeyPlayback,
                            cloudfrontPath: playbackUrl,
                            s3Url: playbackUrl,
                            ...(shouldUpdateThumbnail ? {
                                thumbnailUrl,
                                thumbnailSource,
                                thumbnailLocked: false,
                                thumbnailUpdatedAt: thumbnailUrl ? new Date() : null,
                            } : {}),
                            status: 'completed',
                            releaseYear: resolvedReleaseYear,
                            duration,
                            resolution,
                            genre,
                            rating,
                            averageRating,
                            ratingCount,
                            seriesId: series?.id || null,
                            seriesTitle,
                            seasonNumber,
                            episodeNumber,
                            fileSize,
                            mimeType,
                            tmdbId,
                            format: bestFile.format || null,
                            sourceType: 'external_legal',
                            sourceProvider: 'internet_archive',
                            sourcePageUrl,
                            archiveIdentifier,
                            sourceRights: resolveArchiveSourceRights(metadata),
                            sourceLicenseUrl: resolveArchiveSourceLicenseUrl(metadata, sourcePageUrl),
                            sourceMetadata: metadata,
                        }
                    });

                    result.title = upserted.title;
                    result.fileName = bestFile.name;
                    result.seriesTitle = seriesTitle;
                    result.seasonNumber = seasonNumber;
                    result.episodeNumber = episodeNumber;
                    result.playbackUrl = playbackUrl;
                    result.fileSize = fileSize ? fileSize.toString() : null;
                    result.duration = duration;
                    result.sourcePageUrl = sourcePageUrl;
                    result.status = existing ? 'updated' : 'imported';

                    await recordAdminAction({
                        actorId: auth.user?.id,
                        action: existing ? 'video.import.update' : 'video.import.create',
                        entityType: 'Video',
                        entityId: upserted.id,
                        videoId: upserted.id,
                        metadata: {
                            archiveIdentifier,
                            thumbnailUrl,
                            previousThumbnailUrl: existing?.thumbnailUrl || null,
                            thumbnailSkippedDueToLock: Boolean(existing?.thumbnailLocked),
                            playbackType: 'mp4',
                        },
                    });
                } else {
                    result.title = title;
                    result.fileName = bestFile.name;
                    result.seriesTitle = seriesTitle;
                    result.seasonNumber = seasonNumber;
                    result.episodeNumber = episodeNumber;
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
            shuffleSeed,
            totalAvailable,
            page,
        };

        const safeResults = results.map((result) => ({
            identifier: result.identifier,
            title: result.title,
            fileName: result.fileName ?? null,
            seriesTitle: result.seriesTitle ?? null,
            seasonNumber: result.seasonNumber ?? null,
            episodeNumber: result.episodeNumber ?? null,
            playbackUrl: result.playbackUrl ?? null,
            fileSize: result.fileSize ?? null,
            duration: result.duration ?? null,
            sourcePageUrl: result.sourcePageUrl ?? null,
            status: result.status,
            reason: result.reason ?? null
        }));

        return NextResponse.json({
            success: true,
            presetId: preset.id,
            summary,
            results: safeResults
        });
    } catch (error: any) {
        console.error('Archive import error:', error);
        return NextResponse.json(
            { error: 'Failed to import from Internet Archive', details: error.message },
            { status: 500 }
        );
    }
}
