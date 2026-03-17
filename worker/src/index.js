require('dotenv').config();

const express = require('express');
const cuid = require('cuid');
const {
    searchArchiveIdentifiers,
    fetchArchiveMetadata,
    rankPlayableFiles,
    pickBestPlayableFile,
    buildArchiveDownloadUrl,
    inferMimeType
} = require('./internet-archive');
const { findBestPoster, resolveOmdbDetails } = require('./catalog');
const {
    upsertVideo,
    upsertReel,
    findVideoByS3KeyPlayback,
    findReelByS3KeyPlayback,
    pool,
    updateVideoPoster,
    updateVideoMetadata
} = require('./db');
const { buildS3Key, uploadToS3, listS3Objects, buildPublicUrl, isTranscoderAvailable } = require('./ingest');

const PORT = Number(process.env.PORT) || 8080;
const ADMIN_SECRET = process.env.INGEST_WORKER_SECRET;

if (!ADMIN_SECRET) {
    throw new Error('INGEST_WORKER_SECRET is required');
}

const app = express();
app.use(express.json({ limit: '2mb' }));

const jobs = new Map();

const parseYear = (value) => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) {
        for (const entry of value) {
            const parsed = parseYear(entry);
            if (parsed) return parsed;
        }
        return null;
    }
    const match = String(value).match(/\d{4}/);
    return match ? Number(match[0]) : null;
};

const parseDurationSeconds = (value) => {
    if (value === null || value === undefined || value === '') return null;

    if (Array.isArray(value)) {
        for (const entry of value) {
            const parsed = parseDurationSeconds(entry);
            if (parsed) return parsed;
        }
        return null;
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) && value > 0 ? value : null;
    }

    const normalized = String(value).trim();
    if (!normalized) return null;

    if (normalized.includes(':')) {
        const parts = normalized.split(':').map((part) => Number.parseFloat(part));
        if (parts.some((part) => Number.isNaN(part))) return null;
        const [h, m, s] = parts.length === 3 ? parts : [0, parts[0], parts[1] || 0];
        const total = (h * 3600) + (m * 60) + s;
        return Number.isFinite(total) && total > 0 ? total : null;
    }

    const numeric = Number.parseFloat(normalized.replace(/,/g, ''));
    return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const MIN_FEATURE_DURATION_SECONDS = 45 * 60;
const MIN_SERIES_DURATION_SECONDS = 5 * 60;
const DEFAULT_REEL_MAX_DURATION_SECONDS = 150;
const DEFAULT_REEL_MIN_DURATION_SECONDS = 8;
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

const REEL_EXCLUDED_TITLE_KEYWORDS = [
    'trailer',
    'preview',
    'teaser',
    'promo',
    'commercial',
    'sample'
];

const REEL_ENGAGING_KEYWORDS = [
    'funny',
    'comedy',
    'humor',
    'humour',
    'cartoon',
    'animation',
    'animated',
    'gag',
    'parody',
    'satire',
    'sketch',
    'slapstick',
    'blooper',
    'bloopers',
    'prank',
    'vaudeville',
    'musical',
    'music',
    'dance',
    'sing',
    'singing',
    'performance',
    'entertainment',
    'novelty'
];

const REEL_LOW_ENGAGEMENT_KEYWORDS = [
    'documentary',
    'lecture',
    'speech',
    'interview',
    'hearing',
    'hearing room',
    'news',
    'newscast',
    'instructional',
    'training',
    'education',
    'educational',
    'seminar',
    'meeting',
    'ceremony'
];

const isExcludedTitle = (value) => {
    if (!value) return false;
    const lower = value.toLowerCase();
    return EXCLUDED_TITLE_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const isExcludedReelTitle = (value) => {
    if (!value) return false;
    const lower = value.toLowerCase();
    return REEL_EXCLUDED_TITLE_KEYWORDS.some((keyword) => lower.includes(keyword));
};

const stringifyValue = (value) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) return value.join(' ');
    return String(value);
};

const buildReelSearchText = (file, metadata) => {
    return [
        file?.name,
        file?.title,
        file?.format,
        metadata?.title,
        metadata?.description,
        metadata?.subject,
        metadata?.keywords,
        metadata?.tags,
        metadata?.collection,
        metadata?.creator
    ]
        .map(stringifyValue)
        .join(' ')
        .toLowerCase();
};

const parseMaybeNumber = (value) => {
    if (value === null || value === undefined || value === '') return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : null;
};

const resolveDurationSeconds = (file, metadata) => {
    const candidates = [
        file?.length,
        file?.duration,
        file?.runtime,
        metadata?.length,
        metadata?.runtime,
        metadata?.duration,
        metadata?.avg_length
    ];

    for (const candidate of candidates) {
        const parsed = parseDurationSeconds(candidate);
        if (parsed) return parsed;
    }

    return null;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async (operation, attempts = 3, baseDelayMs = 400) => {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            if (attempt >= attempts) break;
            await sleep(baseDelayMs * attempt);
        }
    }
    throw lastError;
};

const scoreReelEngagement = (file, metadata) => {
    const searchText = buildReelSearchText(file, metadata);
    if (!searchText) return 0;

    let score = 0;
    for (const keyword of REEL_ENGAGING_KEYWORDS) {
        if (searchText.includes(keyword)) score += 3;
    }
    for (const keyword of REEL_LOW_ENGAGEMENT_KEYWORDS) {
        if (searchText.includes(keyword)) score -= 4;
    }

    if (searchText.includes('classic cartoon') || searchText.includes('comedy short')) score += 4;
    if (searchText.includes('silent') && !searchText.includes('comedy')) score -= 2;

    return score;
};

const detectAudioSignal = (file, metadata) => {
    const candidateValues = [
        file?.sound,
        file?.audio,
        file?.audio_channels,
        file?.track,
        file?.format,
        file?.title,
        file?.name,
        metadata?.sound,
        metadata?.audio,
        metadata?.description
    ].map(stringifyValue).join(' ').toLowerCase();

    if (!candidateValues) return null;

    const explicitNo = [
        'no audio',
        'without audio',
        'silent',
        'mute',
        'muted'
    ];
    if (explicitNo.some((token) => candidateValues.includes(token))) {
        return false;
    }

    const audioChannels = parseMaybeNumber(file?.audio_channels);
    if (audioChannels && audioChannels > 0) return true;

    const explicitYes = [
        'audio',
        'sound',
        'stereo',
        'mono',
        'aac',
        'mp3'
    ];
    if (explicitYes.some((token) => candidateValues.includes(token))) {
        return true;
    }

    return null;
};

const fetchVideosNeedingPoster = async (limit) => {
    const result = await pool.query(
        `SELECT "id", "title", "seriesTitle", "releaseYear", "type", "thumbnailUrl", "archiveIdentifier", "s3KeyPlayback"
         FROM "Video"
         WHERE "status" = 'completed'
           AND "type" = 'movie'
         ORDER BY "updatedAt" DESC
         LIMIT $1`,
        [limit]
    );
    return result.rows || [];
};

const stringifyMetadata = (value) => {
    if (value === null || value === undefined) return null;
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
};

const pickFirstString = (value) => {
    if (!value) return null;
    if (Array.isArray(value)) {
        const first = value.find((entry) => typeof entry === 'string' && entry.trim().length > 0);
        return first || null;
    }
    if (typeof value === 'string') return value;
    return null;
};

const normalizeGenre = (metadata) => {
    const raw = pickFirstString(metadata?.genre)
        || pickFirstString(metadata?.category)
        || pickFirstString(metadata?.subject)
        || pickFirstString(metadata?.tags);

    if (!raw) return 'Movie';
    const cleaned = raw.replace(/[_-]+/g, ' ').trim();
    if (!cleaned) return 'Movie';
    return cleaned;
};

const normalizeRating = (metadata) => {
    const raw = pickFirstString(metadata?.rating)
        || pickFirstString(metadata?.contentrating)
        || pickFirstString(metadata?.mpaa_rating)
        || pickFirstString(metadata?.maturity)
        || pickFirstString(metadata?.audience);

    return raw ? raw.trim() : 'NR';
};

const parseAverageRating = (value) => {
    if (!value || value === 'N/A') return null;
    const numeric = Number.parseFloat(String(value));
    return Number.isFinite(numeric) ? numeric : null;
};

const parseRatingCount = (value) => {
    if (!value || value === 'N/A') return null;
    const cleaned = String(value).replace(/[^0-9]/g, '');
    if (!cleaned) return null;
    const numeric = Number.parseInt(cleaned, 10);
    return Number.isFinite(numeric) ? numeric : null;
};

const normalizeMimeType = (file) => {
    if (file?.mime) return String(file.mime);
    const name = (file?.name || '').toLowerCase();
    if (name.endsWith('.mp4')) return 'video/mp4';
    if (name.endsWith('.mkv')) return 'video/x-matroska';
    return null;
};

const deriveTitleFromFileName = (fileName) => {
    const base = fileName.replace(/\.[a-z0-9]+$/i, '');
    return base.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
};

const toMp4Name = (fileName) => {
    if (!fileName) return 'video.mp4';
    const base = fileName.replace(/\.[a-z0-9]+$/i, '');
    return `${base}.mp4`;
};

const deriveTitleFromIdentifiers = (archiveIdentifier, s3KeyPlayback) => {
    let fileName = null;
    if (archiveIdentifier && archiveIdentifier.includes(':')) {
        const parts = archiveIdentifier.split(':');
        fileName = parts.slice(1).join(':') || null;
    }
    if (!fileName && s3KeyPlayback) {
        const parts = s3KeyPlayback.split('/');
        fileName = parts[parts.length - 1] || null;
    }
    if (!fileName) return null;
    try {
        fileName = decodeURIComponent(fileName);
    } catch {
        fileName = fileName;
    }
    return deriveTitleFromFileName(fileName);
};

const isGenericBundleTitle = (value) => {
    if (!value) return true;
    const normalized = value.toLowerCase().trim();
    return normalized === 'public domain movies'
        || normalized === 'publicdomainmovies'
        || normalized === 'publicmovies212';
};

const DEFAULT_POSTER_URL = 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=400';

const findThumbnailForFile = (files, identifier, fileName) => {
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

const buildArchiveIdentifier = (identifier, fileName, bundleIdentifier) => {
    if (bundleIdentifier && identifier === bundleIdentifier && fileName) {
        return `${identifier}:${fileName}`;
    }
    return identifier;
};

const normalizeText = (value) => {
    if (!value) return '';
    return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
};

const extractTokens = (value) => normalizeText(value)
    .split(' ')
    .filter((token) => token.length > 2);

const matchesSeriesTitle = (fileName, seriesTitle) => {
    const normalizedTitle = normalizeText(seriesTitle);
    if (!normalizedTitle) return false;
    const haystack = normalizeText(fileName);
    if (!haystack) return false;
    if (haystack.includes(normalizedTitle)) return true;
    const tokens = extractTokens(seriesTitle);
    if (tokens.length === 0) return false;
    return tokens.every((token) => haystack.includes(token));
};

const parseSeasonEpisode = (value) => {
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

app.get('/health', (_req, res) => {
    res.json({
        ok: true,
        ffmpegAvailable: isTranscoderAvailable()
    });
});

app.get('/jobs', (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const list = Array.from(jobs.values())
        .sort((a, b) => b.startedAt - a.startedAt)
        .slice(0, 50);
    res.json({ success: true, jobs: list });
});

app.get('/jobs/:id', (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const job = jobs.get(req.params.id);
    if (!job) {
        return res.status(404).json({ error: 'Job not found' });
    }
    return res.json({ success: true, job });
});

app.post('/reconcile', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const bundleIdentifier = String(req.body?.bundleIdentifier || 'publicmovies212');
        const limit = Math.min(Math.max(Number(req.body?.limit) || 50, 1), 500);
        const prefix = req.body?.prefix ? String(req.body.prefix) : `ia/${bundleIdentifier}/`;
        const asyncMode = req.body?.async !== false;

        const runReconcile = async (job) => {
            const s3Keys = await listS3Objects(prefix, limit);
            if (job) {
                job.total = s3Keys.length;
            }
            const { metadata, files } = await fetchArchiveMetadata(bundleIdentifier);
            const fileMap = new Map(files.map((file) => [file.name, file]));

            let baseTitle = stringifyMetadata(metadata?.title) || bundleIdentifier;
            const isBundleGeneric = isGenericBundleTitle(baseTitle);
            if (isBundleGeneric) {
                baseTitle = 'Public Domain Movies';
            }

            const results = [];

            for (const key of s3Keys) {
                const fileName = key.replace(prefix, '');
                const result = { key, fileName, status: 'failed' };
                try {
                    const existing = await findVideoByS3KeyPlayback(key);
                    if (existing) {
                        result.status = 'existing';
                        results.push(result);
                        if (job) {
                            job.processed += 1;
                            job.existing += 1;
                            job.lastUpdatedAt = Date.now();
                        }
                        continue;
                    }

                    const fileMeta = fileMap.get(fileName);
                    if (!fileMeta) {
                        result.status = 'skipped';
                        results.push(result);
                        if (job) {
                            job.processed += 1;
                            job.skipped += 1;
                            job.lastUpdatedAt = Date.now();
                        }
                        continue;
                    }

                    let title = isBundleGeneric ? deriveTitleFromFileName(fileName) : baseTitle;
                    const omdbDetails = await resolveOmdbDetails({ title, type: 'movie' });
                    const omdbYear = parseYear(omdbDetails?.year);
                    const releaseYear = omdbYear
                        ?? parseYear(stringifyMetadata(metadata?.year) || stringifyMetadata(metadata?.date))
                        ?? parseYear(fileName);
                    const genre = omdbDetails?.genre || (isBundleGeneric ? null : normalizeGenre(metadata));
                    const duration = parseDurationSeconds(fileMeta.length) || null;
                    const fileSize = fileMeta.size ? BigInt(fileMeta.size).toString() : null;
                    const height = fileMeta.height ? Number(fileMeta.height) : null;
                    const resolution = height ? `${height}p` : null;
                    const mimeType = normalizeMimeType(fileMeta) || inferMimeType(fileMeta) || 'video/mp4';
                    const omdbPosterUrl = omdbDetails?.imdbId
                        ? `https://img.omdbapi.com/?i=${encodeURIComponent(omdbDetails.imdbId)}&h=600&apikey=${encodeURIComponent(process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '')}`
                        : omdbDetails?.poster;
                    const posterMatch = omdbPosterUrl
                        ? { posterUrl: omdbPosterUrl, tmdbId: null }
                        : await findBestPoster({
                            title,
                            year: null,
                            type: 'movie'
                        });
                    const tmdbId = posterMatch?.tmdbId || null;
                    const thumbnailUrl = posterMatch?.posterUrl
                        || findThumbnailForFile(files, bundleIdentifier, fileName)
                        || DEFAULT_POSTER_URL;
                    const archiveIdentifier = buildArchiveIdentifier(bundleIdentifier, fileName, bundleIdentifier);

                    await upsertVideo({
                        title,
                        description: omdbDetails?.plot && omdbDetails.plot !== 'N/A' ? omdbDetails.plot : null,
                        type: 'movie',
                        playbackType: 'mp4',
                        s3KeyPlayback: key,
                        cloudfrontPath: `/${key}`,
                        s3KeySource: null,
                        s3Url: buildPublicUrl(key),
                        thumbnailUrl,
                        status: 'completed',
                        releaseYear,
                        duration,
                        resolution,
                        genre,
                        rating: omdbDetails?.rated || normalizeRating(metadata),
                        averageRating: parseAverageRating(omdbDetails?.imdbRating),
                        ratingCount: parseRatingCount(omdbDetails?.imdbVotes),
                        seriesTitle: null,
                        seasonNumber: null,
                        episodeNumber: null,
                        fileSize,
                        mimeType,
                        format: fileMeta.format || null,
                        tmdbId,
                        sourceType: 'external_legal',
                        sourceProvider: 'internet_archive',
                        sourcePageUrl: `https://archive.org/details/${bundleIdentifier}`,
                        archiveIdentifier,
                        sourceRights: stringifyMetadata(metadata?.rights),
                        sourceLicenseUrl: stringifyMetadata(metadata?.licenseurl || metadata?.license),
                        sourceMetadata: JSON.stringify(metadata)
                    });

                    result.status = 'reconciled';
                    results.push(result);
                    if (job) {
                        job.processed += 1;
                        job.reconciled += 1;
                        job.lastUpdatedAt = Date.now();
                    }
                } catch (error) {
                    result.status = 'failed';
                    result.reason = error?.message || 'Reconcile failed';
                    results.push(result);
                    if (job) {
                        job.processed += 1;
                        job.failed += 1;
                        job.lastUpdatedAt = Date.now();
                    }
                }
            }

            const summary = {
                requested: s3Keys.length,
                reconciled: results.filter((r) => r.status === 'reconciled').length,
                existing: results.filter((r) => r.status === 'existing').length,
                skipped: results.filter((r) => r.status === 'skipped').length,
                failed: results.filter((r) => r.status === 'failed').length
            };

            return { summary, results };
        };

        if (asyncMode) {
            const jobId = cuid();
            const job = {
                id: jobId,
                type: 'reconcile',
                status: 'running',
                total: limit,
                processed: 0,
                reconciled: 0,
                existing: 0,
                skipped: 0,
                failed: 0,
                startedAt: Date.now(),
                lastUpdatedAt: Date.now(),
                finishedAt: null
            };
            jobs.set(jobId, job);
            setImmediate(async () => {
                try {
                    const data = await runReconcile(job);
                    job.status = 'completed';
                    job.finishedAt = Date.now();
                    job.summary = data.summary;
                    console.log(`Reconcile job ${jobId} completed`, data.summary);
                } catch (error) {
                    job.status = 'failed';
                    job.finishedAt = Date.now();
                    console.error(`Reconcile job ${jobId} failed`, error);
                }
            });

            return res.status(202).json({
                success: true,
                message: 'Reconcile queued',
                jobId,
                summary: {
                    requested: limit,
                    queued: limit
                }
            });
        }

        const data = await runReconcile(null);
        return res.json({ success: true, ...data });
    } catch (error) {
        console.error('Worker reconcile error:', error);
        return res.status(500).json({ error: 'Worker reconcile failed', details: error.message });
    }
});

app.post('/refresh-posters', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const limit = Math.min(Math.max(Number(req.body?.limit) || 100, 1), 500);
        const asyncMode = req.body?.async !== false;

        const runRefresh = async (job) => {
            const rows = await fetchVideosNeedingPoster(limit);
            if (job) {
                job.total = rows.length;
            }

            const results = [];

            for (const row of rows) {
                const result = { id: row.id, title: row.title, status: 'failed' };
                try {
                    let title = row.type === 'series'
                        ? (row.seriesTitle || row.title)
                        : row.title;
                    if (!title || isGenericBundleTitle(title)) {
                        const derived = deriveTitleFromIdentifiers(row.archiveIdentifier, row.s3KeyPlayback);
                        if (derived) title = derived;
                    }
                    const contentType = row.type === 'series' ? 'series' : 'movie';
                    const omdbDetails = await resolveOmdbDetails({ title, type: contentType });
                    const omdbPosterUrl = omdbDetails?.imdbId
                        ? `https://img.omdbapi.com/?i=${encodeURIComponent(omdbDetails.imdbId)}&h=600&apikey=${encodeURIComponent(process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '')}`
                        : omdbDetails?.poster;
                    const posterMatch = omdbPosterUrl
                        ? { posterUrl: omdbPosterUrl, tmdbId: null }
                        : await findBestPoster({
                            title,
                            year: null,
                            type: contentType
                        });

                    const omdbYear = parseYear(omdbDetails?.year);
                    const payload = {
                        thumbnailUrl: posterMatch?.posterUrl || null,
                        tmdbId: posterMatch?.tmdbId || null,
                        description: omdbDetails?.plot && omdbDetails.plot !== 'N/A' ? omdbDetails.plot : null,
                        releaseYear: omdbYear || null,
                        genre: omdbDetails?.genre || null,
                        rating: omdbDetails?.rated || null,
                        averageRating: parseAverageRating(omdbDetails?.imdbRating),
                        ratingCount: parseRatingCount(omdbDetails?.imdbVotes)
                    };

                    if (!posterMatch && !omdbDetails) {
                        result.status = 'skipped';
                        results.push(result);
                        if (job) {
                            job.processed += 1;
                            job.skipped += 1;
                            job.lastUpdatedAt = Date.now();
                        }
                        continue;
                    }

                    await updateVideoMetadata(row.id, payload);
                    result.status = 'refreshed';
                    results.push(result);
                    if (job) {
                        job.processed += 1;
                        job.refreshed += 1;
                        job.lastUpdatedAt = Date.now();
                    }
                } catch (error) {
                    result.status = 'failed';
                    result.reason = error?.message || 'Poster refresh failed';
                    results.push(result);
                    if (job) {
                        job.processed += 1;
                        job.failed += 1;
                        job.lastUpdatedAt = Date.now();
                    }
                }
            }

            const summary = {
                requested: rows.length,
                refreshed: results.filter((r) => r.status === 'refreshed').length,
                skipped: results.filter((r) => r.status === 'skipped').length,
                failed: results.filter((r) => r.status === 'failed').length
            };

            return { summary, results };
        };

        if (asyncMode) {
            const jobId = cuid();
            const job = {
                id: jobId,
                type: 'poster_refresh',
                status: 'running',
                total: limit,
                processed: 0,
                refreshed: 0,
                skipped: 0,
                failed: 0,
                startedAt: Date.now(),
                lastUpdatedAt: Date.now(),
                finishedAt: null
            };
            jobs.set(jobId, job);

            runRefresh(job)
                .then((result) => {
                    job.status = 'completed';
                    job.finishedAt = Date.now();
                    job.summary = result.summary;
                })
                .catch((error) => {
                    job.status = 'failed';
                    job.finishedAt = Date.now();
                    job.error = error.message;
                });

            return res.json({ success: true, jobId, summary: job.summary || null });
        }

        const result = await runRefresh(null);
        return res.json({ success: true, ...result });
    } catch (error) {
        console.error('Worker refresh posters error:', error);
        return res.status(500).json({ error: 'Worker poster refresh failed', details: error.message });
    }
});

app.post('/import', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const allowMkv = Boolean(req.body?.allowMkv);
        const presetQuery = req.body?.presetQuery || '(collection:(feature_films) OR collection:(publicdomainmovies)) AND mediatype:(movies)';
        const limit = Math.min(Math.max(Number(req.body?.limit) || 1, 1), 50);
        const requestedType = req.body?.contentType || req.body?.importType;
        const contentType = requestedType === 'series' ? 'series' : 'movie';
        const seriesTitleInput = contentType === 'series' ? String(req.body?.seriesTitle || '').trim() : '';
        const seasonNumberInput = contentType === 'series' ? Number(req.body?.seasonNumber) || 1 : null;
        const startEpisodeInput = contentType === 'series' ? Number(req.body?.startEpisodeNumber) || 1 : null;
        const bundleIdentifier = req.body?.bundleIdentifier ? String(req.body.bundleIdentifier) : null;

        if (contentType === 'series' && !seriesTitleInput) {
            return res.status(400).json({ error: 'Series title is required for series imports' });
        }

        const requestedItems = Array.isArray(req.body?.items)
            ? req.body.items
                .map((item) => ({
                    identifier: String(item?.identifier || '').trim(),
                    fileName: item?.fileName ? String(item.fileName) : null,
                    seasonNumber: Number.isFinite(Number(item?.seasonNumber)) ? Number(item.seasonNumber) : null,
                    episodeNumber: Number.isFinite(Number(item?.episodeNumber)) ? Number(item.episodeNumber) : null
                }))
                .filter((item) => item.identifier)
            : [];

        const providedIdentifiers = Array.isArray(req.body?.identifiers)
            ? req.body.identifiers.filter(Boolean)
            : [];

        const itemsToProcess = requestedItems.length > 0
            ? requestedItems
            : (providedIdentifiers.length > 0
                ? providedIdentifiers.map((identifier) => ({ identifier, fileName: null, seasonNumber: null, episodeNumber: null }))
                : (await searchArchiveIdentifiers(presetQuery, limit))
                    .map((identifier) => ({ identifier, fileName: null, seasonNumber: null, episodeNumber: null })));

        const runImport = async (job) => {
            const results = [];

            for (const [index, item] of itemsToProcess.entries()) {
                const identifier = item.identifier;
                const result = {
                    identifier,
                    title: identifier,
                    status: 'failed'
                };

            try {
                const { metadata, files } = await fetchArchiveMetadata(identifier);
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

                if (contentType === 'series' && !matchesSeriesTitle(bestFile.name, seriesTitleInput)) {
                    result.status = 'skipped';
                    result.reason = 'Series title mismatch';
                    results.push(result);
                    continue;
                }

                const playbackUrl = buildArchiveDownloadUrl(identifier, bestFile.name);
                const s3KeyPlayback = buildS3Key(identifier, bestFile.name);

                const { s3Url, contentType: uploadedContentType } = await uploadToS3(playbackUrl, s3KeyPlayback, bestFile);
                const sourcePageUrl = `https://archive.org/details/${identifier}`;

                let title = stringifyMetadata(metadata?.title) || identifier;
                const isBundleItem = identifier === 'publicmovies212';
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
                const omdbDetails = await resolveOmdbDetails({ title: omdbQueryTitle, type: contentType });
                const description = omdbDetails?.plot && omdbDetails.plot !== 'N/A' ? omdbDetails.plot : null;
                const omdbYear = parseYear(omdbDetails?.year);
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
                const fileSize = bestFile.size ? BigInt(bestFile.size).toString() : null;
                const height = bestFile.height ? Number(bestFile.height) : null;
                const resolution = height ? `${height}p` : null;
                const mimeType = normalizeMimeType(bestFile) || uploadedContentType || inferMimeType(bestFile);
                const parsed = parseSeasonEpisode(bestFile.name);
                const episodeNumber = contentType === 'series'
                    ? (item.episodeNumber ?? parsed.episode ?? (startEpisodeInput !== null ? startEpisodeInput + index : null))
                    : null;
                const seriesTitle = contentType === 'series' ? seriesTitleInput : null;
                const seasonNumber = contentType === 'series'
                    ? (item.seasonNumber ?? parsed.season ?? seasonNumberInput)
                    : null;

                const posterTitle = contentType === 'series' ? (seriesTitle || title) : title;
                const omdbPosterUrl = omdbDetails?.imdbId
                    ? `https://img.omdbapi.com/?i=${encodeURIComponent(omdbDetails.imdbId)}&h=600&apikey=${encodeURIComponent(process.env.OMDB_API_KEY || process.env.OMDB_APIKEY || '')}`
                    : omdbDetails?.poster;
                const posterMatch = omdbPosterUrl
                    ? { posterUrl: omdbPosterUrl, tmdbId: null }
                    : await findBestPoster({
                        title: posterTitle,
                        year: null,
                        type: contentType
                    });
                const tmdbId = posterMatch?.tmdbId || null;
                const thumbnailUrl = posterMatch?.posterUrl || (
                    isBundleItem
                        ? (findThumbnailForFile(files, identifier, bestFile.name) || DEFAULT_POSTER_URL)
                        : `https://archive.org/services/img/${identifier}`
                );

                let archiveIdentifier = buildArchiveIdentifier(identifier, bestFile.name, bundleIdentifier);
                const existingByKey = await findVideoByS3KeyPlayback(s3KeyPlayback);
                if (existingByKey?.archiveIdentifier && existingByKey.archiveIdentifier !== archiveIdentifier) {
                    archiveIdentifier = existingByKey.archiveIdentifier;
                }

                const dbRow = await upsertVideo({
                    title,
                    description,
                    type: contentType,
                    playbackType: 'mp4',
                    s3KeyPlayback,
                    cloudfrontPath: `/${s3KeyPlayback}`,
                    s3KeySource: null,
                    s3Url,
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
                    format: bestFile.format || null,
                    tmdbId,
                    sourceType: 'external_legal',
                    sourceProvider: 'internet_archive',
                    sourcePageUrl,
                    archiveIdentifier,
                    sourceRights: stringifyMetadata(metadata?.rights),
                    sourceLicenseUrl: stringifyMetadata(metadata?.licenseurl || metadata?.license),
                    sourceMetadata: JSON.stringify(metadata)
                });

                result.title = dbRow.title;
                result.fileName = bestFile.name;
                result.playbackUrl = s3Url;
                result.fileSize = fileSize;
                result.duration = duration;
                result.sourcePageUrl = sourcePageUrl;
                result.status = dbRow.inserted ? 'imported' : 'updated';
            } catch (error) {
                result.status = 'failed';
                result.reason = error?.message || 'Failed to ingest item';
            }

                results.push(result);
                if (job) {
                    job.processed += 1;
                    if (result.status === 'imported') job.imported += 1;
                    if (result.status === 'updated') job.updated += 1;
                    if (result.status === 'skipped') job.skipped += 1;
                    if (result.status === 'failed') job.failed += 1;
                    job.lastUpdatedAt = Date.now();
                }
            }

            const summary = {
                requested: itemsToProcess.length,
                imported: results.filter((r) => r.status === 'imported').length,
                updated: results.filter((r) => r.status === 'updated').length,
                skipped: results.filter((r) => r.status === 'skipped').length,
                failed: results.filter((r) => r.status === 'failed').length
            };

            return { summary, results };
        };

        const asyncMode = Boolean(req.body?.async);
        if (asyncMode) {
            const jobId = cuid();
            const job = {
                id: jobId,
                status: 'running',
                total: itemsToProcess.length,
                processed: 0,
                imported: 0,
                updated: 0,
                skipped: 0,
                failed: 0,
                startedAt: Date.now(),
                lastUpdatedAt: Date.now(),
                finishedAt: null
            };
            jobs.set(jobId, job);
            setImmediate(async () => {
                try {
                    const data = await runImport(job);
                    job.status = 'completed';
                    job.finishedAt = Date.now();
                    job.summary = data.summary;
                    console.log(`Import job ${jobId} completed`, data.summary);
                } catch (error) {
                    job.status = 'failed';
                    job.finishedAt = Date.now();
                    console.error(`Import job ${jobId} failed`, error);
                }
            });

            return res.status(202).json({
                success: true,
                message: 'Import queued',
                jobId,
                summary: {
                    requested: itemsToProcess.length,
                    queued: itemsToProcess.length
                },
                results: itemsToProcess.map((item) => ({
                    identifier: item.identifier,
                    title: item.identifier,
                    fileName: item.fileName || null,
                    status: 'queued'
                }))
            });
        }

        const data = await runImport();
        return res.json({ success: true, ...data });
    } catch (error) {
        console.error('Worker import error:', error);
        return res.status(500).json({ error: 'Worker import failed', details: error.message });
    }
});

app.post('/reels/import', async (req, res) => {
    try {
        const authHeader = req.headers.authorization || '';
        if (authHeader !== `Bearer ${ADMIN_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const allowMkv = Boolean(req.body?.allowMkv);
        const requireAudio = req.body?.requireAudio !== false;
        const allowUnknownDuration = req.body?.allowUnknownDuration === true;
        const providedQuery = req.body?.query || req.body?.presetQuery;
        const discoveryQueries = providedQuery
            ? [String(providedQuery)]
            : [
                '(mediatype:(movies)) AND (subject:(comedy OR funny OR humor OR humour OR cartoon OR animation OR gag OR parody OR sketch OR slapstick OR musical OR music OR dance OR novelty) OR title:(comedy OR funny OR cartoon OR animation OR parody OR gag OR musical) OR description:(comedy OR funny OR humorous OR cartoon OR animation OR musical)) AND -title:(trailer OR preview OR teaser OR promo OR commercial OR sample)',
                '(mediatype:(movies)) AND (subject:("short films" OR shorts OR "comedy shorts" OR cartoons) OR collection:(short_films OR classic_cartoons)) AND -title:(trailer OR preview OR teaser OR promo OR commercial OR sample)',
                '(mediatype:(movies)) AND (collection:(prelinger OR classic_tv OR opensource_movies OR community_video OR fedflix OR classic_cartoons) OR subject:(vaudeville OR entertainment OR performance)) AND -title:(trailer OR preview OR teaser OR promo OR commercial OR sample)',
                '(mediatype:(movies)) AND (subject:("public domain") OR rights:("public domain") OR licenseurl:(creativecommons.org)) AND (subject:(comedy OR cartoon OR animation OR musical OR novelty) OR description:(comedy OR funny OR entertaining)) AND -title:(trailer OR preview OR teaser OR promo OR commercial OR sample)'
            ];
        const limit = Math.min(Math.max(Number(req.body?.limit) || 20, 1), 200);
        const minDurationSeconds = Math.max(
            1,
            Number(req.body?.minDurationSeconds) || DEFAULT_REEL_MIN_DURATION_SECONDS
        );
        const maxDurationSeconds = Math.max(
            minDurationSeconds,
            Number(req.body?.maxDurationSeconds) || DEFAULT_REEL_MAX_DURATION_SECONDS
        );
        const targetDurationSeconds = Math.round((minDurationSeconds + maxDurationSeconds) / 2);
        const compress = req.body?.compress !== false;
        const compressMinBytes = Math.max(
            0,
            Number(req.body?.compressMinBytes) || (15 * 1024 * 1024)
        );

        const providedItems = Array.isArray(req.body?.items)
            ? req.body.items
                .map((item) => ({
                    identifier: String(item?.identifier || '').trim(),
                    fileName: item?.fileName ? String(item.fileName).trim() : null
                }))
                .filter((item) => item.identifier)
            : [];

        const providedIdentifiers = Array.isArray(req.body?.identifiers)
            ? req.body.identifiers
                .map((identifier) => String(identifier || '').trim())
                .filter(Boolean)
            : [];

        const usesSearchDiscovery = providedItems.length === 0 && providedIdentifiers.length === 0;
        const requestedCount = limit;
        const candidateMultiplier = Math.min(
            Math.max(Number(req.body?.candidateMultiplier) || 8, 1),
            10
        );
        const candidateSearchLimit = usesSearchDiscovery
            ? Math.min(500, Math.max(requestedCount, requestedCount * candidateMultiplier))
            : requestedCount;

        const discoverIdentifiers = async () => {
            const collected = [];
            const seen = new Set();
            const perQueryLimit = Math.min(
                1000,
                Math.max(
                    candidateSearchLimit,
                    Math.ceil((candidateSearchLimit * 2) / Math.max(discoveryQueries.length, 1))
                )
            );

            for (const query of discoveryQueries) {
                if (collected.length >= candidateSearchLimit) break;
                const identifiers = await withRetry(
                    () => searchArchiveIdentifiers(query, perQueryLimit),
                    2,
                    350
                );
                for (const identifier of identifiers) {
                    if (!identifier || seen.has(identifier)) continue;
                    seen.add(identifier);
                    collected.push(identifier);
                    if (collected.length >= candidateSearchLimit) break;
                }
            }

            return collected;
        };

        const itemsToProcess = providedItems.length > 0
            ? providedItems
            : (providedIdentifiers.length > 0
                ? providedIdentifiers.map((identifier) => ({ identifier, fileName: null }))
                : (await discoverIdentifiers())
                    .map((identifier) => ({ identifier, fileName: null })));

        const selectBestReelFile = (files, metadata, preferredFileName) => {
            let ranked = rankPlayableFiles(files, allowMkv);
            if (preferredFileName) {
                ranked = ranked.filter((file) => file?.name === preferredFileName);
            }
            if (ranked.length === 0) return null;

            const candidates = ranked
                .map((file) => {
                    const duration = resolveDurationSeconds(file, metadata);
                    if (duration === null && usesSearchDiscovery && !allowUnknownDuration) {
                        return null;
                    }
                    if (duration !== null && (duration < minDurationSeconds || duration > maxDurationSeconds)) {
                        return null;
                    }
                    const audioSignal = detectAudioSignal(file, metadata);
                    const engagementScore = scoreReelEngagement(file, metadata);
                    if (requireAudio && audioSignal === false) {
                        return null;
                    }
                    return { file, duration, audioSignal, engagementScore };
                })
                .filter(Boolean);

            if (candidates.length === 0) return null;

            const withAudio = candidates.filter((item) => item.audioSignal === true);
            const unknownAudio = candidates.filter((item) => item.audioSignal === null);
            const silent = candidates.filter((item) => item.audioSignal === false);
            const ordered = requireAudio
                ? [...withAudio, ...unknownAudio]
                : [...withAudio, ...unknownAudio, ...silent];

            ordered.sort((a, b) => {
                if (b.engagementScore !== a.engagementScore) {
                    return b.engagementScore - a.engagementScore;
                }
                const aDistance = a.duration === null ? Number.POSITIVE_INFINITY : Math.abs(a.duration - targetDurationSeconds);
                const bDistance = b.duration === null ? Number.POSITIVE_INFINITY : Math.abs(b.duration - targetDurationSeconds);
                if (!Number.isFinite(aDistance) && !Number.isFinite(bDistance)) return 0;
                return aDistance - bDistance;
            });

            return ordered[0] || null;
        };

        const runReelImport = async (job) => {
            const results = [];
            const skippedReasons = {};
            const failedReasons = {};
            let successCount = 0;

            const addReason = (bucket, value) => {
                const key = String(value || 'Unknown reason').trim().slice(0, 180);
                bucket[key] = (bucket[key] || 0) + 1;
            };

            for (const item of itemsToProcess) {
                const identifier = item.identifier;
                const result = {
                    identifier,
                    title: identifier,
                    fileName: item.fileName || null,
                    duration: null,
                    hasAudio: null,
                    status: 'failed'
                };

                try {
                    const { metadata, files } = await withRetry(
                        () => fetchArchiveMetadata(identifier),
                        2,
                        350
                    );
                    if (metadata?.mediatype && String(metadata.mediatype).toLowerCase() !== 'movies') {
                        result.status = 'skipped';
                        result.reason = `Mediatype ${metadata.mediatype} not movies`;
                        results.push(result);
                        continue;
                    }

                    const picked = selectBestReelFile(files, metadata, item.fileName);
                    if (!picked) {
                        result.status = 'skipped';
                        result.reason = 'No short playable file matched duration/audio constraints';
                        results.push(result);
                        continue;
                    }

                    const bestFile = picked.file;
                    const duration = picked.duration;
                    const hasAudio = picked.audioSignal;
                    const engagementScore = picked.engagementScore;

                    let title = stringifyMetadata(metadata?.title) || deriveTitleFromFileName(bestFile.name) || identifier;
                    if (isGenericBundleTitle(title) || isExcludedReelTitle(title)) {
                        title = deriveTitleFromFileName(bestFile.name) || identifier;
                    }
                    if (isExcludedReelTitle(title) || isExcludedReelTitle(bestFile.name)) {
                        result.status = 'skipped';
                        result.reason = 'Excluded by title keywords';
                        results.push(result);
                        continue;
                    }

                    const playbackUrl = buildArchiveDownloadUrl(identifier, bestFile.name);
                    const sourceFileSize = parseMaybeNumber(bestFile.size);
                    const shouldCompress = compress && (!sourceFileSize || sourceFileSize >= compressMinBytes);
                    const outputFileName = shouldCompress ? toMp4Name(bestFile.name) : bestFile.name;
                    const s3KeyPlayback = buildS3Key(identifier, outputFileName, 'reels');
                    const { s3Url, contentType: uploadedContentType, transcoded } = await withRetry(
                        () => uploadToS3(
                            playbackUrl,
                            s3KeyPlayback,
                            bestFile,
                            {
                                transcode: shouldCompress
                            }
                        ),
                        2,
                        500
                    );
                    const sourcePageUrl = `https://archive.org/details/${identifier}`;

                    const metadataDescription = stringifyMetadata(metadata?.description);
                    const description = metadataDescription && metadataDescription.trim().length > 0
                        ? metadataDescription
                        : 'Public domain short-form video from Internet Archive.';
                    const fileSize = bestFile.size ? BigInt(bestFile.size).toString() : null;
                    const width = bestFile.width ? Number(bestFile.width) : null;
                    const height = bestFile.height ? Number(bestFile.height) : null;
                    const resolution = height ? `${height}p` : null;
                    const mimeType = normalizeMimeType(bestFile) || uploadedContentType || inferMimeType(bestFile);
                    const thumbnailUrl = findThumbnailForFile(files, identifier, bestFile.name) || `https://archive.org/services/img/${identifier}`;
                    let archiveIdentifier = `${identifier}:${bestFile.name}`;
                    const existingByKey = await findReelByS3KeyPlayback(s3KeyPlayback);
                    if (existingByKey?.archiveIdentifier && existingByKey.archiveIdentifier !== archiveIdentifier) {
                        archiveIdentifier = existingByKey.archiveIdentifier;
                    }

                    const dbRow = await upsertReel({
                        title,
                        description,
                        fileName: outputFileName,
                        thumbnailUrl,
                        playbackType: 'mp4',
                        s3KeyPlayback,
                        cloudfrontPath: `/${s3KeyPlayback}`,
                        s3Url,
                        duration,
                        fileSize,
                        mimeType,
                        width,
                        height,
                        resolution,
                        hasAudio,
                        status: 'completed',
                        sourceType: 'external_legal',
                        sourceProvider: 'internet_archive',
                        sourceIdentifier: identifier,
                        sourcePageUrl,
                        archiveIdentifier,
                        sourceRights: stringifyMetadata(metadata?.rights),
                        sourceLicenseUrl: stringifyMetadata(metadata?.licenseurl || metadata?.license),
                        sourceMetadata: JSON.stringify(metadata),
                        tags: stringifyMetadata(metadata?.subject || metadata?.keywords || metadata?.tags),
                        language: stringifyMetadata(metadata?.language)
                    });

                    result.title = dbRow.title;
                    result.fileName = outputFileName;
                    result.duration = duration;
                    result.hasAudio = hasAudio;
                    result.playbackUrl = s3Url;
                    result.thumbnailUrl = thumbnailUrl;
                    result.sourcePageUrl = sourcePageUrl;
                    result.transcoded = transcoded;
                    result.engagementScore = engagementScore;
                    result.status = dbRow.inserted ? 'imported' : 'updated';
                } catch (error) {
                    result.status = 'failed';
                    result.reason = error?.message || 'Failed to ingest reel';
                }

                results.push(result);

                if (job) {
                    job.processed += 1;
                    if (result.status === 'imported') job.imported += 1;
                    if (result.status === 'updated') job.updated += 1;
                    if (result.status === 'skipped') job.skipped += 1;
                    if (result.status === 'failed') job.failed += 1;
                    job.lastUpdatedAt = Date.now();
                }

                if (result.status === 'skipped') {
                    addReason(skippedReasons, result.reason);
                }
                if (result.status === 'failed') {
                    addReason(failedReasons, result.reason);
                }
                if (result.status === 'imported' || result.status === 'updated') {
                    successCount += 1;
                }

                if (usesSearchDiscovery && successCount >= requestedCount) {
                    break;
                }
            }

            const importedCount = results.filter((r) => r.status === 'imported').length;
            const updatedCount = results.filter((r) => r.status === 'updated').length;
            const skippedCount = results.filter((r) => r.status === 'skipped').length;
            const failedCount = results.filter((r) => r.status === 'failed').length;
            const transcodedCount = results.filter((r) => r.transcoded === true).length;
            const uploadedOriginalCount = results.filter((r) => r.transcoded === false && (r.status === 'imported' || r.status === 'updated')).length;

            const summary = {
                requested: requestedCount,
                candidatesQueued: itemsToProcess.length,
                candidatesProcessed: results.length,
                imported: importedCount,
                updated: updatedCount,
                skipped: skippedCount,
                failed: failedCount,
                minDurationSeconds,
                maxDurationSeconds,
                targetDurationSeconds,
                requireAudio,
                allowUnknownDuration,
                compress,
                compressMinBytes,
                searchQueries: discoveryQueries,
                engagingKeywords: REEL_ENGAGING_KEYWORDS,
                ffmpegAvailable: isTranscoderAvailable(),
                transcoded: transcodedCount,
                uploadedOriginal: uploadedOriginalCount,
                skippedReasons,
                failedReasons
            };

            return { summary, results };
        };

        const asyncMode = req.body?.async !== false;
        if (asyncMode) {
            const jobId = cuid();
            const job = {
                id: jobId,
                type: 'reels_import',
                status: 'running',
                total: itemsToProcess.length,
                processed: 0,
                imported: 0,
                updated: 0,
                skipped: 0,
                failed: 0,
                startedAt: Date.now(),
                lastUpdatedAt: Date.now(),
                finishedAt: null
            };
            jobs.set(jobId, job);

            setImmediate(async () => {
                try {
                    const data = await runReelImport(job);
                    job.status = 'completed';
                    job.finishedAt = Date.now();
                    job.summary = data.summary;
                    console.log(`Reels import job ${jobId} completed`, data.summary);
                } catch (error) {
                    job.status = 'failed';
                    job.finishedAt = Date.now();
                    job.error = error.message;
                    console.error(`Reels import job ${jobId} failed`, error);
                }
            });

            return res.status(202).json({
                success: true,
                message: 'Reels import queued',
                jobId,
                summary: {
                    requested: requestedCount,
                    queued: itemsToProcess.length,
                    candidateMultiplier: usesSearchDiscovery ? candidateMultiplier : 1,
                    searchQueries: discoveryQueries,
                    engagingKeywords: REEL_ENGAGING_KEYWORDS,
                    minDurationSeconds,
                    maxDurationSeconds,
                    targetDurationSeconds,
                    requireAudio,
                    allowUnknownDuration,
                    compress,
                    compressMinBytes
                }
            });
        }

        const data = await runReelImport(null);
        return res.json({ success: true, ...data });
    } catch (error) {
        console.error('Worker reels import error:', error);
        return res.status(500).json({ error: 'Worker reels import failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Ingest worker listening on ${PORT}`);
});
