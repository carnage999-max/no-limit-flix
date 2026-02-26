const { Pool } = require('pg');

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
            "seriesTitle",
            "seasonNumber",
            "episodeNumber",
            "fileSize",
            "mimeType",
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
            $21, $22, $23, $24, $25, $26, $27, $28::jsonb, $29, $30
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
            "seriesTitle" = EXCLUDED."seriesTitle",
            "seasonNumber" = EXCLUDED."seasonNumber",
            "episodeNumber" = EXCLUDED."episodeNumber",
            "fileSize" = EXCLUDED."fileSize",
            "mimeType" = EXCLUDED."mimeType",
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
        payload.seriesTitle,
        payload.seasonNumber,
        payload.episodeNumber,
        payload.fileSize,
        payload.mimeType,
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
    pool
};
