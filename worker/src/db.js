const { Pool } = require('pg');
const cuid = require('cuid');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error('DATABASE_URL is required');
}

const sslRequired = /sslmode=require/i.test(connectionString);

const pool = new Pool({
    connectionString,
    ssl: sslRequired ? { rejectUnauthorized: false } : undefined
});

const textOrNull = (value) => {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    return trimmed || null;
};

async function ensureSeriesMetadata(payload) {
    const title = textOrNull(payload.seriesTitle || payload.title);
    if (!title) return null;

    const now = new Date();
    const query = `
        INSERT INTO "Series" (
            "id",
            "title",
            "description",
            "thumbnailUrl",
            "thumbnailSource",
            "thumbnailLocked",
            "thumbnailUpdatedAt",
            "releaseYear",
            "genre",
            "rating",
            "averageRating",
            "ratingCount",
            "tmdbId",
            "sourceProvider",
            "sourcePageUrl",
            "sourceRights",
            "sourceLicenseUrl",
            "createdAt",
            "updatedAt"
        ) VALUES (
            $1, $2, $3, $4, $5, false, $6, $7, $8, $9,
            $10, $11, $12, $13, $14, $15, $16, $17, $18
        )
        ON CONFLICT ("title") DO UPDATE SET
            "description" = COALESCE("Series"."description", EXCLUDED."description"),
            "thumbnailUrl" = CASE
                WHEN COALESCE("Series"."thumbnailLocked", false) = true THEN "Series"."thumbnailUrl"
                ELSE COALESCE(EXCLUDED."thumbnailUrl", "Series"."thumbnailUrl")
            END,
            "thumbnailSource" = CASE
                WHEN COALESCE("Series"."thumbnailLocked", false) = true THEN "Series"."thumbnailSource"
                ELSE COALESCE(EXCLUDED."thumbnailSource", "Series"."thumbnailSource")
            END,
            "thumbnailUpdatedAt" = CASE
                WHEN COALESCE("Series"."thumbnailLocked", false) = true THEN "Series"."thumbnailUpdatedAt"
                ELSE COALESCE(EXCLUDED."thumbnailUpdatedAt", "Series"."thumbnailUpdatedAt")
            END,
            "releaseYear" = COALESCE("Series"."releaseYear", EXCLUDED."releaseYear"),
            "genre" = COALESCE("Series"."genre", EXCLUDED."genre"),
            "rating" = COALESCE("Series"."rating", EXCLUDED."rating"),
            "averageRating" = COALESCE("Series"."averageRating", EXCLUDED."averageRating"),
            "ratingCount" = COALESCE("Series"."ratingCount", EXCLUDED."ratingCount"),
            "tmdbId" = COALESCE("Series"."tmdbId", EXCLUDED."tmdbId"),
            "sourceProvider" = COALESCE("Series"."sourceProvider", EXCLUDED."sourceProvider"),
            "sourcePageUrl" = COALESCE("Series"."sourcePageUrl", EXCLUDED."sourcePageUrl"),
            "sourceRights" = COALESCE("Series"."sourceRights", EXCLUDED."sourceRights"),
            "sourceLicenseUrl" = COALESCE("Series"."sourceLicenseUrl", EXCLUDED."sourceLicenseUrl"),
            "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "id", "title";
    `;

    const thumbnailSource = payload.thumbnailSource || (payload.thumbnailUrl
        ? (String(payload.thumbnailUrl).startsWith('/media/thumbnails/') ? 'import' : 'external')
        : null);
    const values = [
        cuid(),
        title,
        payload.description || null,
        payload.thumbnailUrl || null,
        thumbnailSource,
        payload.thumbnailUrl ? now : null,
        payload.releaseYear || null,
        payload.genre || null,
        payload.rating || null,
        payload.averageRating ?? null,
        payload.ratingCount ?? null,
        payload.tmdbId || null,
        payload.sourceProvider || null,
        payload.sourcePageUrl || null,
        payload.sourceRights || null,
        payload.sourceLicenseUrl || null,
        now,
        now
    ];

    const result = await pool.query(query, values);
    return result.rows[0] || null;
}

async function upsertVideo(payload) {
    const now = new Date();
    const series = payload.type === 'series'
        ? await ensureSeriesMetadata(payload)
        : null;
    const seriesId = payload.seriesId || series?.id || null;
    const query = `
        INSERT INTO "Video" (
            "id",
            "title",
            "description",
            "type",
            "playbackType",
            "s3KeyPlayback",
            "cloudfrontPath",
            "s3KeySource",
            "s3Url",
            "thumbnailUrl",
            "thumbnailSource",
            "thumbnailLocked",
            "thumbnailUpdatedAt",
            "status",
            "releaseYear",
            "duration",
            "resolution",
            "genre",
            "rating",
            "averageRating",
            "ratingCount",
            "seriesId",
            "seriesTitle",
            "seasonNumber",
            "episodeNumber",
            "fileSize",
            "mimeType",
            "tmdbId",
            "format",
            "sourceType",
            "sourceProvider",
            "sourcePageUrl",
            "archiveIdentifier",
            "sourceRights",
            "sourceLicenseUrl",
            "sourceMetadata",
            "createdAt",
            "updatedAt"
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
            $31, $32, $33, $34, $35, $36::jsonb, $37, $38
        )
        ON CONFLICT ("archiveIdentifier") DO UPDATE SET
            "title" = EXCLUDED."title",
            "description" = EXCLUDED."description",
            "type" = EXCLUDED."type",
            "playbackType" = EXCLUDED."playbackType",
            "s3KeyPlayback" = EXCLUDED."s3KeyPlayback",
            "cloudfrontPath" = EXCLUDED."cloudfrontPath",
            "s3KeySource" = EXCLUDED."s3KeySource",
            "s3Url" = EXCLUDED."s3Url",
            "thumbnailUrl" = CASE
                WHEN COALESCE("Video"."thumbnailLocked", false) = true THEN "Video"."thumbnailUrl"
                ELSE EXCLUDED."thumbnailUrl"
            END,
            "thumbnailSource" = CASE
                WHEN COALESCE("Video"."thumbnailLocked", false) = true THEN "Video"."thumbnailSource"
                ELSE EXCLUDED."thumbnailSource"
            END,
            "thumbnailLocked" = CASE
                WHEN COALESCE("Video"."thumbnailLocked", false) = true THEN "Video"."thumbnailLocked"
                ELSE EXCLUDED."thumbnailLocked"
            END,
            "thumbnailUpdatedAt" = CASE
                WHEN COALESCE("Video"."thumbnailLocked", false) = true THEN "Video"."thumbnailUpdatedAt"
                ELSE EXCLUDED."thumbnailUpdatedAt"
            END,
            "status" = EXCLUDED."status",
            "releaseYear" = EXCLUDED."releaseYear",
            "duration" = EXCLUDED."duration",
            "resolution" = EXCLUDED."resolution",
            "genre" = EXCLUDED."genre",
            "rating" = EXCLUDED."rating",
            "averageRating" = EXCLUDED."averageRating",
            "ratingCount" = EXCLUDED."ratingCount",
            "seriesId" = EXCLUDED."seriesId",
            "seriesTitle" = EXCLUDED."seriesTitle",
            "seasonNumber" = EXCLUDED."seasonNumber",
            "episodeNumber" = EXCLUDED."episodeNumber",
            "fileSize" = EXCLUDED."fileSize",
            "mimeType" = EXCLUDED."mimeType",
            "tmdbId" = EXCLUDED."tmdbId",
            "format" = EXCLUDED."format",
            "sourceType" = EXCLUDED."sourceType",
            "sourceProvider" = EXCLUDED."sourceProvider",
            "sourcePageUrl" = EXCLUDED."sourcePageUrl",
            "sourceRights" = EXCLUDED."sourceRights",
            "sourceLicenseUrl" = EXCLUDED."sourceLicenseUrl",
            "sourceMetadata" = EXCLUDED."sourceMetadata",
            "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "id", "title", (xmax = 0) AS inserted;
    `;

    const values = [
        cuid(),
        payload.title,
        payload.description,
        payload.type,
        payload.playbackType,
        payload.s3KeyPlayback,
        payload.cloudfrontPath,
        payload.s3KeySource,
        payload.s3Url,
        payload.thumbnailUrl,
        payload.thumbnailSource || (payload.thumbnailUrl
            ? (String(payload.thumbnailUrl).startsWith('/media/thumbnails/') ? 'import' : 'external')
            : null),
        false,
        payload.thumbnailUrl ? now : null,
        payload.status,
        payload.releaseYear,
        payload.duration,
        payload.resolution,
        payload.genre,
        payload.rating,
        payload.averageRating,
        payload.ratingCount,
        seriesId,
        payload.seriesTitle,
        payload.seasonNumber,
        payload.episodeNumber,
        payload.fileSize,
        payload.mimeType,
        payload.tmdbId,
        payload.format,
        payload.sourceType,
        payload.sourceProvider,
        payload.sourcePageUrl,
        payload.archiveIdentifier,
        payload.sourceRights,
        payload.sourceLicenseUrl,
        payload.sourceMetadata,
        now,
        now
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

async function upsertReel(payload) {
    const now = new Date();
    const query = `
        INSERT INTO "Reel" (
            "id",
            "title",
            "description",
            "fileName",
            "thumbnailUrl",
            "playbackType",
            "s3KeyPlayback",
            "cloudfrontPath",
            "s3Url",
            "duration",
            "fileSize",
            "mimeType",
            "width",
            "height",
            "resolution",
            "hasAudio",
            "status",
            "sourceType",
            "sourceProvider",
            "sourceIdentifier",
            "sourcePageUrl",
            "archiveIdentifier",
            "sourceRights",
            "sourceLicenseUrl",
            "sourceMetadata",
            "tags",
            "language",
            "createdAt",
            "updatedAt"
        ) VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
            $21, $22, $23, $24, $25::jsonb, $26, $27, $28, $29
        )
        ON CONFLICT ("archiveIdentifier") DO UPDATE SET
            "title" = EXCLUDED."title",
            "description" = EXCLUDED."description",
            "fileName" = EXCLUDED."fileName",
            "thumbnailUrl" = EXCLUDED."thumbnailUrl",
            "playbackType" = EXCLUDED."playbackType",
            "s3KeyPlayback" = EXCLUDED."s3KeyPlayback",
            "cloudfrontPath" = EXCLUDED."cloudfrontPath",
            "s3Url" = EXCLUDED."s3Url",
            "duration" = EXCLUDED."duration",
            "fileSize" = EXCLUDED."fileSize",
            "mimeType" = EXCLUDED."mimeType",
            "width" = EXCLUDED."width",
            "height" = EXCLUDED."height",
            "resolution" = EXCLUDED."resolution",
            "hasAudio" = EXCLUDED."hasAudio",
            "status" = EXCLUDED."status",
            "sourceType" = EXCLUDED."sourceType",
            "sourceProvider" = EXCLUDED."sourceProvider",
            "sourceIdentifier" = EXCLUDED."sourceIdentifier",
            "sourcePageUrl" = EXCLUDED."sourcePageUrl",
            "sourceRights" = EXCLUDED."sourceRights",
            "sourceLicenseUrl" = EXCLUDED."sourceLicenseUrl",
            "sourceMetadata" = EXCLUDED."sourceMetadata",
            "tags" = EXCLUDED."tags",
            "language" = EXCLUDED."language",
            "updatedAt" = EXCLUDED."updatedAt"
        RETURNING "id", "title", (xmax = 0) AS inserted;
    `;

    const values = [
        cuid(),
        payload.title,
        payload.description,
        payload.fileName,
        payload.thumbnailUrl,
        payload.playbackType || 'mp4',
        payload.s3KeyPlayback,
        payload.cloudfrontPath,
        payload.s3Url,
        payload.duration,
        payload.fileSize,
        payload.mimeType,
        payload.width,
        payload.height,
        payload.resolution,
        payload.hasAudio,
        payload.status || 'completed',
        payload.sourceType,
        payload.sourceProvider,
        payload.sourceIdentifier,
        payload.sourcePageUrl,
        payload.archiveIdentifier,
        payload.sourceRights,
        payload.sourceLicenseUrl,
        payload.sourceMetadata,
        payload.tags,
        payload.language,
        now,
        now
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
}

module.exports = {
    upsertVideo,
    upsertReel,
    pool,
    updateVideoPoster: async (id, thumbnailUrl, tmdbId) => {
        const result = await pool.query(
            `UPDATE "Video"
             SET "thumbnailUrl" = $1::text,
                 "thumbnailSource" = 'refresh',
                 "thumbnailLocked" = false,
                 "thumbnailUpdatedAt" = NOW(),
                 "tmdbId" = COALESCE($2::text, "tmdbId"),
                 "updatedAt" = NOW()
             WHERE "id" = $3::text
               AND COALESCE("thumbnailLocked", false) = false`,
            [thumbnailUrl, tmdbId, id]
        );
        return result.rowCount || 0;
    },
    updateVideoMetadata: async (id, payload) => {
        const result = await pool.query(
            `UPDATE "Video"
             SET "thumbnailUrl" = CASE
                     WHEN $1::text IS NULL OR COALESCE("thumbnailLocked", false) = true THEN "thumbnailUrl"
                     ELSE $1::text
                 END,
                 "thumbnailSource" = CASE
                     WHEN $1::text IS NULL OR COALESCE("thumbnailLocked", false) = true THEN "thumbnailSource"
                     ELSE 'refresh'
                 END,
                 "thumbnailUpdatedAt" = CASE
                     WHEN $1::text IS NULL OR COALESCE("thumbnailLocked", false) = true THEN "thumbnailUpdatedAt"
                     ELSE NOW()
                 END,
                 "tmdbId" = COALESCE($2::text, "tmdbId"),
                 "description" = COALESCE($3::text, "description"),
                 "releaseYear" = COALESCE($4::integer, "releaseYear"),
                 "genre" = COALESCE($5::text, "genre"),
                 "rating" = COALESCE($6::text, "rating"),
                 "averageRating" = COALESCE($7::double precision, "averageRating"),
                 "ratingCount" = COALESCE($8::integer, "ratingCount"),
                 "updatedAt" = NOW()
             WHERE "id" = $9::text`,
            [
                payload.thumbnailUrl || null,
                payload.tmdbId || null,
                payload.description || null,
                payload.releaseYear || null,
                payload.genre || null,
                payload.rating || null,
                payload.averageRating ?? null,
                payload.ratingCount ?? null,
                id
            ]
        );
        return result.rowCount || 0;
    },
    updateSeriesMetadata: async (seriesTitle, payload) => {
        const series = await ensureSeriesMetadata({
            ...payload,
            seriesTitle,
            thumbnailSource: payload.thumbnailUrl ? 'refresh' : null
        });
        const result = await pool.query(
            `UPDATE "Video"
             SET "seriesId" = COALESCE($10::text, "seriesId"),
                 "thumbnailUrl" = CASE
                    WHEN $1::text IS NULL OR COALESCE("thumbnailLocked", false) = true THEN "thumbnailUrl"
                    ELSE $1::text
                END,
                "thumbnailSource" = CASE
                    WHEN $1::text IS NULL OR COALESCE("thumbnailLocked", false) = true THEN "thumbnailSource"
                    ELSE 'refresh'
                END,
                "thumbnailUpdatedAt" = CASE
                    WHEN $1::text IS NULL OR COALESCE("thumbnailLocked", false) = true THEN "thumbnailUpdatedAt"
                    ELSE NOW()
                END,
                "tmdbId" = COALESCE($2::text, "tmdbId"),
                "description" = COALESCE($3::text, "description"),
                "releaseYear" = COALESCE($4::integer, "releaseYear"),
                "genre" = COALESCE($5::text, "genre"),
                "rating" = COALESCE($6::text, "rating"),
                "averageRating" = COALESCE($7::double precision, "averageRating"),
                "ratingCount" = COALESCE($8::integer, "ratingCount"),
                "updatedAt" = NOW()
            WHERE "type" = 'series'
              AND "seriesTitle" = $9::text`,
            [
                payload.thumbnailUrl || null,
                payload.tmdbId || null,
                payload.description || null,
                payload.releaseYear || null,
                payload.genre || null,
                payload.rating || null,
                payload.averageRating ?? null,
                payload.ratingCount ?? null,
                seriesTitle,
                series?.id || null
            ]
        );
        return result.rowCount || 0;
    },
    findVideoByS3KeyPlayback: async (s3KeyPlayback) => {
        const result = await pool.query(
            'SELECT id, "archiveIdentifier" FROM "Video" WHERE "s3KeyPlayback" = $1 LIMIT 1',
            [s3KeyPlayback]
        );
        return result.rows[0] || null;
    },
    findVideoByArchiveIdentifier: async (archiveIdentifier) => {
        const result = await pool.query(
            'SELECT id, "status", "playbackType" FROM "Video" WHERE "archiveIdentifier" = $1 LIMIT 1',
            [archiveIdentifier]
        );
        return result.rows[0] || null;
    },
    listLocalMp4Videos: async (limit, offset = 0) => {
        const result = await pool.query(
            `SELECT id, "s3KeyPlayback", "archiveIdentifier"
             FROM "Video"
             WHERE "playbackType" = 'mp4'
               AND "status" = 'completed'
               AND "type" = 'movie'
               AND "sourceProvider" = 'internet_archive'
               AND "s3KeyPlayback" NOT LIKE 'ia:%'
               AND "s3KeyPlayback" ILIKE '%.mp4'
             ORDER BY "createdAt" ASC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    },
    switchVideoToHls: async (id, manifestPath, publicUrl) => {
        await pool.query(
            `UPDATE "Video"
             SET "playbackType" = 'hls',
                 "s3KeySource" = "s3KeyPlayback",
                 "s3KeyPlayback" = $2,
                 "cloudfrontPath" = $3,
                 "s3Url" = $4,
                 "mimeType" = 'application/vnd.apple.mpegurl',
                 "updatedAt" = NOW()
             WHERE id = $1`,
            [id, manifestPath, `/${manifestPath}`, publicUrl]
        );
    },
    listConvertedMp4Sources: async (limit, offset = 0) => {
        const result = await pool.query(
            `SELECT id, "s3KeyPlayback", "s3KeySource"
             FROM "Video"
             WHERE "playbackType" = 'hls'
               AND "status" = 'completed'
               AND "type" = 'movie'
               AND "sourceProvider" = 'internet_archive'
               AND "s3KeySource" ILIKE '%.mp4'
             ORDER BY "createdAt" ASC
             LIMIT $1 OFFSET $2`,
            [limit, offset]
        );
        return result.rows;
    },
    isMediaPathReferencedElsewhere: async (id, mediaPath) => {
        const result = await pool.query(
            `SELECT 1 FROM "Video"
             WHERE id <> $1 AND ("s3KeyPlayback" = $2 OR "s3KeySource" = $2)
             LIMIT 1`,
            [id, mediaPath]
        );
        return result.rowCount > 0;
    },
    clearVideoSource: async (id) => {
        await pool.query('UPDATE "Video" SET "s3KeySource" = NULL, "updatedAt" = NOW() WHERE id = $1', [id]);
    },
    findReelByS3KeyPlayback: async (s3KeyPlayback) => {
        const result = await pool.query(
            'SELECT id, "archiveIdentifier" FROM "Reel" WHERE "s3KeyPlayback" = $1 LIMIT 1',
            [s3KeyPlayback]
        );
        return result.rows[0] || null;
    }
};
