require('dotenv').config();

const express = require('express');
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

app.get('/health', (_req, res) => {
    res.json({ ok: true });
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

        const requestedItems = Array.isArray(req.body?.items)
            ? req.body.items
                .map((item) => ({
                    identifier: String(item?.identifier || '').trim(),
                    fileName: item?.fileName ? String(item.fileName) : null
                }))
                .filter((item) => item.identifier)
            : [];

        const providedIdentifiers = Array.isArray(req.body?.identifiers)
            ? req.body.identifiers.filter(Boolean)
            : [];

        const identifiers = requestedItems.length > 0
            ? requestedItems.map((item) => item.identifier)
            : (providedIdentifiers.length > 0
                ? providedIdentifiers
                : await searchArchiveIdentifiers(presetQuery, limit));

        const preferredFiles = new Map();
        requestedItems.forEach((item) => {
            preferredFiles.set(item.identifier, item.fileName);
        });

        const results = [];

        for (const identifier of identifiers) {
            const result = {
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
                const s3KeyPlayback = buildS3Key(identifier, bestFile.name);

                const { s3Url, contentType } = await uploadToS3(playbackUrl, s3KeyPlayback, bestFile);
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
                const fileSize = bestFile.size ? BigInt(bestFile.size).toString() : null;
                const height = bestFile.height ? Number(bestFile.height) : null;
                const resolution = height ? `${height}p` : null;
                const mimeType = normalizeMimeType(bestFile) || contentType || inferMimeType(bestFile);

                const dbRow = await upsertVideo({
                    title,
                    description,
                    type: 'movie',
                    playbackType: 'mp4',
                    s3KeyPlayback,
                    cloudfrontPath: `/${s3KeyPlayback}`,
                    s3KeySource: null,
                    s3Url,
                    thumbnailUrl: `https://archive.org/services/img/${identifier}`,
                    status: 'completed',
                    releaseYear,
                    duration,
                    resolution,
                    genre,
                    rating,
                    seriesTitle: null,
                    seasonNumber: null,
                    episodeNumber: null,
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
        }

        const summary = {
            requested: identifiers.length,
            imported: results.filter((r) => r.status === 'imported').length,
            updated: results.filter((r) => r.status === 'updated').length,
            skipped: results.filter((r) => r.status === 'skipped').length,
            failed: results.filter((r) => r.status === 'failed').length
        };

        return res.json({ success: true, summary, results });
    } catch (error) {
        console.error('Worker import error:', error);
        return res.status(500).json({ error: 'Worker import failed', details: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Ingest worker listening on ${PORT}`);
});
