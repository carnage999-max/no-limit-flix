CREATE TABLE "Reel" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileName" TEXT,
    "thumbnailUrl" TEXT,
    "playbackType" TEXT NOT NULL DEFAULT 'mp4',
    "s3KeyPlayback" TEXT NOT NULL,
    "cloudfrontPath" TEXT NOT NULL,
    "s3Url" TEXT,
    "duration" DOUBLE PRECISION,
    "fileSize" BIGINT,
    "mimeType" TEXT,
    "width" INTEGER,
    "height" INTEGER,
    "resolution" TEXT,
    "hasAudio" BOOLEAN,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "sourceType" TEXT,
    "sourceProvider" TEXT,
    "sourceIdentifier" TEXT NOT NULL,
    "sourcePageUrl" TEXT,
    "archiveIdentifier" TEXT NOT NULL,
    "sourceRights" TEXT,
    "sourceLicenseUrl" TEXT,
    "sourceMetadata" JSONB,
    "tags" TEXT,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reel_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Reel_s3KeyPlayback_key" ON "Reel"("s3KeyPlayback");
CREATE UNIQUE INDEX "Reel_archiveIdentifier_key" ON "Reel"("archiveIdentifier");
CREATE INDEX "Reel_status_createdAt_idx" ON "Reel"("status", "createdAt");
CREATE INDEX "Reel_sourceProvider_idx" ON "Reel"("sourceProvider");
CREATE INDEX "Reel_sourceIdentifier_idx" ON "Reel"("sourceIdentifier");
CREATE INDEX "Reel_duration_idx" ON "Reel"("duration");
