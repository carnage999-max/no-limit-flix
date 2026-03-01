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
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
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

const scoreCandidate = (candidate: string, target: string, candidateYear: number | null, targetYear: number | null) => {
    if (!candidate || !target) return 0;
    let score = 0;
    if (candidate === target) score += 5;
    if (candidate.startsWith(target) || target.startsWith(candidate)) score += 3;
    if (candidate.includes(target) || target.includes(candidate)) score += 2;
    if (targetYear && candidateYear) {
        if (candidateYear === targetYear) score += 2;
        if (Math.abs(candidateYear - targetYear) === 1) score += 1;
    }
    return score;
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
    } catch (error) {
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
        const scored = results.map((item: any) => {
            const candidateTitle = item?.title || item?.name || '';
            const candidateYear = parseTmdbYear(item?.release_date || item?.first_air_date);
            const score = scoreCandidate(normalizeTitle(candidateTitle), target, candidateYear, year);
            return { item, score };
        });
        scored.sort((a: any, b: any) => b.score - a.score);
        const best = scored[0];
        if (!best || best.score < minScore || !best.item?.poster_path) return null;

        return {
            posterUrl: `${TMDB_IMAGE_BASE}${best.item.poster_path}`,
            tmdbId: String(best.item.id)
        };
    } catch (error) {
        return null;
    }
};

const fetchOmdbJson = async (params: URLSearchParams) => {
    return fetchJson(`https://www.omdbapi.com/?${params.toString()}`);
};

const resolveOmdbDetails = async (title: string | null, type: 'movie' | 'series') => {
    const apiKey = process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '';
    if (!apiKey || !title) return null;

    const safeTitle = sanitizeSearchTitle(title) || title;
    const params = new URLSearchParams({
        apikey: apiKey,
        t: safeTitle
    });
    if (type === 'series') params.set('type', 'series');
    if (type === 'movie') params.set('type', 'movie');

    let data = await fetchOmdbJson(params);
    if (!data || data.Response === 'False') {
        const searchParams = new URLSearchParams({
            apikey: apiKey,
            s: safeTitle
        });
        if (type === 'series') searchParams.set('type', 'series');
        if (type === 'movie') searchParams.set('type', 'movie');

        const searchData = await fetchOmdbJson(searchParams);
        const results = searchData?.Search || [];
        if (!results.length) return null;

        const target = normalizeTitle(safeTitle);
        const scored = results.map((item: any) => {
            const candidateTitle = item?.Title || '';
            const score = scoreCandidate(normalizeTitle(candidateTitle), target, null, null);
            return { item, score };
        });
        scored.sort((a: any, b: any) => b.score - a.score);
        const best = scored[0]?.item;
        if (!best?.imdbID) return null;

        const detailParams = new URLSearchParams({
            apikey: apiKey,
            i: best.imdbID,
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

    const details = await resolveOmdbDetails(title, type);
    if (!details) return null;

    const imdbId = details.imdbId;
    if (imdbId) {
        return {
            posterUrl: `https://img.omdbapi.com/?i=${encodeURIComponent(imdbId)}&h=600&apikey=${encodeURIComponent(apiKey)}`,
            tmdbId: null
        };
    }

    if (!details.poster) return null;
    return {
        posterUrl: details.poster,
        tmdbId: null
    };
};

const findWikipediaPoster = async (title: string | null, year: number | null, type: 'movie' | 'series') => {
    if (!title) return null;
    const intent = type === 'series' ? 'tv series' : 'film';
    const search = `${title} ${year || ''} ${intent}`.trim();

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
                tmdbId: null
            };
        }
    }

    return null;
};

const findBestPoster = async (title: string | null, year: number | null, type: 'movie' | 'series') => {
    let poster = await findOmdbPoster(title, null, type);
    if (!poster) {
        poster = await findCatalogPoster(title, null, type, { minScore: 2, ignoreYear: true });
    }
    if (!poster) {
        poster = await findWikipediaPoster(title, null, type);
    }
    return poster;
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
        const limit = Math.min(Math.max(Number(body?.limit) || 1, 1), 200);
        const page = Math.max(Number(body?.page) || 1, 1);
        const shuffleSeedInput = body?.shuffleSeed ? String(body.shuffleSeed) : null;
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

        const bundleResult = providedItems.length === 0 && preset.bundleIdentifier
            ? await hydrateBundleItems()
            : null;

        const bundleItems = bundleResult?.items || null;
        const shuffleSeed = bundleResult?.seed || shuffleSeedInput || null;
        const totalAvailable = bundleResult?.total || null;

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
                    : (await searchArchiveIdentifiers(seriesQuery, limit, page))
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
                const omdbQueryTitle = contentType === 'series' ? (seriesTitleInput || title) : title;
                const omdbDetails = await resolveOmdbDetails(omdbQueryTitle, contentType);
                const description = omdbDetails?.plot && omdbDetails.plot !== 'N/A' ? omdbDetails.plot : null;
                const omdbYear = parseYear(omdbDetails?.year || undefined);
                const releaseYear = omdbYear
                    ?? parseYear(stringifyMetadata(metadata?.year) || stringifyMetadata(metadata?.date))
                    ?? (isBundleItem ? parseYear(bestFile.name) : null);
                const genre = omdbDetails?.genre || (isBundleGeneric ? null : normalizeGenre(metadata));
                const rating = omdbDetails?.rated || normalizeRating(metadata);
                const averageRating = parseAverageRating(omdbDetails?.imdbRating);
                const ratingCount = parseRatingCount(omdbDetails?.imdbVotes);
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

                const posterTitle = contentType === 'series' ? (seriesTitle || title) : title;
                const omdbPosterUrl = omdbDetails?.imdbId
                    ? `https://img.omdbapi.com/?i=${encodeURIComponent(omdbDetails.imdbId)}&h=600&apikey=${encodeURIComponent(process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '')}`
                    : omdbDetails?.poster;
                const posterMatch = omdbPosterUrl
                    ? { posterUrl: omdbPosterUrl, tmdbId: null }
                    : await findBestPoster(posterTitle, null, contentType);
                const tmdbId = posterMatch?.tmdbId || null;
                const thumbnailUrl = posterMatch?.posterUrl || (
                    isBundleItem
                        ? (findThumbnailForFile(files, identifier, bestFile.name) || DEFAULT_POSTER_URL)
                        : `https://archive.org/services/img/${identifier}`
                );
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
                            averageRating,
                            ratingCount,
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
                            averageRating,
                            ratingCount,
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
            shuffleSeed,
            totalAvailable,
            page,
        };

        const safeResults = results.map((result) => ({
            identifier: result.identifier,
            title: result.title,
            fileName: result.fileName ?? null,
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
