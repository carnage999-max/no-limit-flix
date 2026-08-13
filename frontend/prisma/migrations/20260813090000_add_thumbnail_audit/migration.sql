ALTER TABLE "Video"
ADD COLUMN IF NOT EXISTS "thumbnailSource" TEXT,
ADD COLUMN IF NOT EXISTS "thumbnailLocked" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS "thumbnailUpdatedByUserId" TEXT,
ADD COLUMN IF NOT EXISTS "thumbnailUpdatedAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "Video_thumbnailLocked_idx" ON "Video"("thumbnailLocked");
CREATE INDEX IF NOT EXISTS "Video_thumbnailSource_idx" ON "Video"("thumbnailSource");

CREATE TABLE IF NOT EXISTS "AdminActionLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "videoId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminActionLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminActionLog_actorId_idx" ON "AdminActionLog"("actorId");
CREATE INDEX IF NOT EXISTS "AdminActionLog_action_idx" ON "AdminActionLog"("action");
CREATE INDEX IF NOT EXISTS "AdminActionLog_entityType_entityId_idx" ON "AdminActionLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AdminActionLog_videoId_idx" ON "AdminActionLog"("videoId");
CREATE INDEX IF NOT EXISTS "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AdminActionLog_actorId_fkey'
    ) THEN
        ALTER TABLE "AdminActionLog"
        ADD CONSTRAINT "AdminActionLog_actorId_fkey"
        FOREIGN KEY ("actorId") REFERENCES "User"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'AdminActionLog_videoId_fkey'
    ) THEN
        ALTER TABLE "AdminActionLog"
        ADD CONSTRAINT "AdminActionLog_videoId_fkey"
        FOREIGN KEY ("videoId") REFERENCES "Video"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
