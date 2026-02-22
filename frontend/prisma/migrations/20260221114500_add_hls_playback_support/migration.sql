-- AlterTable: Add HLS/MP4 playback support to Video table
ALTER TABLE "Video" ADD COLUMN "s3KeySource" TEXT;
ALTER TABLE "Video" ADD COLUMN "playbackType" TEXT NOT NULL DEFAULT 'mp4';
-- Add nullable first, then backfill, then add constraint
ALTER TABLE "Video" ADD COLUMN "s3KeyPlayback" TEXT;
ALTER TABLE "Video" ADD COLUMN "cloudfrontPath" TEXT;

-- Backfill s3KeyPlayback and cloudfrontPath from existing s3Key
-- Use a UUID if s3Key is missing (for existing rows without s3Key)
UPDATE "Video" SET 
  "s3KeyPlayback" = COALESCE("s3Key", gen_random_uuid()::text),
  "cloudfrontPath" = COALESCE("s3Key", gen_random_uuid()::text);

-- Now add NOT NULL constraint
ALTER TABLE "Video" ALTER COLUMN "s3KeyPlayback" SET NOT NULL;
ALTER TABLE "Video" ALTER COLUMN "cloudfrontPath" SET NOT NULL;

-- Create unique constraint on s3KeyPlayback
ALTER TABLE "Video" ADD CONSTRAINT "Video_s3KeyPlayback_key" UNIQUE ("s3KeyPlayback");

-- Create index on playbackType
CREATE INDEX "Video_playbackType_idx" ON "Video"("playbackType");
