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

async function upsertVideo(payload) {
    const now = new Date();
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
            "status",
            "releaseYear",
            "duration",
            "resolution",
            "genre",
            "rating",
            "averageRating",
            "ratingCount",
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
            $31, $32::jsonb, $33, $34
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
            "thumbnailUrl" = EXCLUDED."thumbnailUrl",
            "status" = EXCLUDED."status",
            "releaseYear" = EXCLUDED."releaseYear",
            "duration" = EXCLUDED."duration",
            "resolution" = EXCLUDED."resolution",
            "genre" = EXCLUDED."genre",
            "rating" = EXCLUDED."rating",
            "averageRating" = EXCLUDED."averageRating",
            "ratingCount" = EXCLUDED."ratingCount",
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
        payload.status,
        payload.releaseYear,
        payload.duration,
        payload.resolution,
        payload.genre,
        payload.rating,
        payload.averageRating,
        payload.ratingCount,
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

module.exports = {
    upsertVideo,
    pool,
    updateVideoPoster: async (id, thumbnailUrl, tmdbId) => {
        const result = await pool.query(
            'UPDATE "Video" SET "thumbnailUrl" = $1, "tmdbId" = COALESCE($2, "tmdbId"), "updatedAt" = NOW() WHERE "id" = $3',
            [thumbnailUrl, tmdbId, id]
        );
        return result.rowCount || 0;
    },
    updateVideoMetadata: async (id, payload) => {
        const result = await pool.query(
            `UPDATE "Video"
             SET "thumbnailUrl" = COALESCE($1, "thumbnailUrl"),
                 "tmdbId" = COALESCE($2, "tmdbId"),
                 "description" = COALESCE($3, "description"),
                 "releaseYear" = COALESCE($4, "releaseYear"),
                 "genre" = COALESCE($5, "genre"),
                 "rating" = COALESCE($6, "rating"),
                 "averageRating" = COALESCE($7, "averageRating"),
                 "ratingCount" = COALESCE($8, "ratingCount"),
                 "updatedAt" = NOW()
             WHERE "id" = $9`,
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
    findVideoByS3KeyPlayback: async (s3KeyPlayback) => {
        const result = await pool.query(
            'SELECT id, "archiveIdentifier" FROM "Video" WHERE "s3KeyPlayback" = $1 LIMIT 1',
            [s3KeyPlayback]
        );
        return result.rows[0] || null;
    }
};
