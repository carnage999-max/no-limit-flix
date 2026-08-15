CREATE TABLE IF NOT EXISTS "Series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "thumbnailSource" TEXT,
    "thumbnailLocked" BOOLEAN NOT NULL DEFAULT false,
    "thumbnailUpdatedByUserId" TEXT,
    "thumbnailUpdatedAt" TIMESTAMP(3),
    "releaseYear" INTEGER,
    "genre" TEXT,
    "rating" TEXT,
    "averageRating" DOUBLE PRECISION,
    "ratingCount" INTEGER,
    "tmdbId" TEXT,
    "sourceProvider" TEXT,
    "sourcePageUrl" TEXT,
    "sourceRights" TEXT,
    "sourceLicenseUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Series_title_key" ON "Series"("title");
CREATE INDEX IF NOT EXISTS "Series_title_idx" ON "Series"("title");
CREATE INDEX IF NOT EXISTS "Series_tmdbId_idx" ON "Series"("tmdbId");

ALTER TABLE "Video"
ADD COLUMN IF NOT EXISTS "seriesId" TEXT;

CREATE INDEX IF NOT EXISTS "Video_seriesId_idx" ON "Video"("seriesId");

INSERT INTO "Series" (
    "id",
    "title",
    "description",
    "thumbnailUrl",
    "thumbnailSource",
    "thumbnailLocked",
    "thumbnailUpdatedByUserId",
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
)
SELECT
    'series_' || md5(series_key),
    series_key,
    (ARRAY_AGG("description" ORDER BY CASE WHEN "description" IS NULL OR "description" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("thumbnailUrl" ORDER BY CASE WHEN "thumbnailUrl" IS NULL OR "thumbnailUrl" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("thumbnailSource" ORDER BY CASE WHEN "thumbnailSource" IS NULL OR "thumbnailSource" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    BOOL_OR("thumbnailLocked"),
    (ARRAY_AGG("thumbnailUpdatedByUserId" ORDER BY CASE WHEN "thumbnailUpdatedByUserId" IS NULL OR "thumbnailUpdatedByUserId" = '' THEN 1 ELSE 0 END, "thumbnailUpdatedAt" DESC NULLS LAST))[1],
    MAX("thumbnailUpdatedAt"),
    (ARRAY_AGG("releaseYear" ORDER BY CASE WHEN "releaseYear" IS NULL THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("genre" ORDER BY CASE WHEN "genre" IS NULL OR "genre" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("rating" ORDER BY CASE WHEN "rating" IS NULL OR "rating" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("averageRating" ORDER BY CASE WHEN "averageRating" IS NULL THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("ratingCount" ORDER BY CASE WHEN "ratingCount" IS NULL THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("tmdbId" ORDER BY CASE WHEN "tmdbId" IS NULL OR "tmdbId" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("sourceProvider" ORDER BY CASE WHEN "sourceProvider" IS NULL OR "sourceProvider" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("sourcePageUrl" ORDER BY CASE WHEN "sourcePageUrl" IS NULL OR "sourcePageUrl" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("sourceRights" ORDER BY CASE WHEN "sourceRights" IS NULL OR "sourceRights" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    (ARRAY_AGG("sourceLicenseUrl" ORDER BY CASE WHEN "sourceLicenseUrl" IS NULL OR "sourceLicenseUrl" = '' THEN 1 ELSE 0 END, "seasonNumber" NULLS LAST, "episodeNumber" NULLS LAST, "createdAt" ASC))[1],
    MIN("createdAt"),
    MAX("updatedAt")
FROM (
    SELECT
        *,
        COALESCE(NULLIF(TRIM("seriesTitle"), ''), TRIM("title")) AS series_key
    FROM "Video"
    WHERE "type" = 'series'
) grouped
WHERE series_key IS NOT NULL AND series_key <> ''
GROUP BY series_key
ON CONFLICT ("title") DO UPDATE SET
    "description" = COALESCE("Series"."description", EXCLUDED."description"),
    "thumbnailUrl" = COALESCE("Series"."thumbnailUrl", EXCLUDED."thumbnailUrl"),
    "thumbnailSource" = COALESCE("Series"."thumbnailSource", EXCLUDED."thumbnailSource"),
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
    "updatedAt" = GREATEST("Series"."updatedAt", EXCLUDED."updatedAt");

UPDATE "Video" v
SET "seriesId" = s."id"
FROM "Series" s
WHERE v."type" = 'series'
  AND COALESCE(NULLIF(TRIM(v."seriesTitle"), ''), TRIM(v."title")) = s."title"
  AND (v."seriesId" IS NULL OR v."seriesId" <> s."id");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Video_seriesId_fkey'
    ) THEN
        ALTER TABLE "Video"
        ADD CONSTRAINT "Video_seriesId_fkey"
        FOREIGN KEY ("seriesId") REFERENCES "Series"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
