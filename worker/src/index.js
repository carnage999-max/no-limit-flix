require('dotenv').config();

const express = require('express');
const cuid = require('cuid');
const {
    searchArchiveIdentifiers,
    fetchArchiveMetadata,
    pickBestPlayableFile,
    buildArchiveDownloadUrl,
    inferMimeType
} = require('./internet-archive');
const { upsertVideo } = require('./db');
const { buildS3Key, uploadToS3 } = require('./ingest');

const PORT = Number(process.env.PORT) || 8080;
const ADMIN_SECRET = process.env.INGEST_WORKER_SECRET;

if (!ADMIN_SECRET) {
    throw new Error('INGEST_WORKER_SECRET is required');
}

const app = express();
app.use(express.json({ limit: '2mb' }));

const jobs = new Map();

const parseYear = (value) => {
    if (!value) return null;
    const match = value.match(/\d{4}/);
    return match ? Number(match[0]) : null;
};

const parseDurationSeconds = (value) => {
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

const isExcludedTitle = (value) => {
    if (!value) return false;
    const lower = value.toLowerCase();
    return EXCLUDED_TITLE_KEYWORDS.some((keyword) => lower.includes(keyword));
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
    res.json({ ok: true });
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

                const thumbnailUrl = isBundleItem
                    ? (findThumbnailForFile(files, identifier, bestFile.name) || DEFAULT_POSTER_URL)
                    : `https://archive.org/services/img/${identifier}`;

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

app.listen(PORT, () => {
    console.log(`Ingest worker listening on ${PORT}`);
});
