CREATE TABLE IF NOT EXISTS "UserRating" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "watchCompletionPercent" DOUBLE PRECISION,
    "verifiedCompletion" BOOLEAN NOT NULL DEFAULT false,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRating_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserRating_userId_videoId_key" ON "UserRating"("userId", "videoId");
CREATE INDEX IF NOT EXISTS "UserRating_videoId_idx" ON "UserRating"("videoId");
CREATE INDEX IF NOT EXISTS "UserRating_userId_idx" ON "UserRating"("userId");
CREATE INDEX IF NOT EXISTS "UserRating_createdAt_idx" ON "UserRating"("createdAt");

ALTER TABLE "UserRating"
ADD CONSTRAINT "UserRating_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserRating"
ADD CONSTRAINT "UserRating_videoId_fkey"
FOREIGN KEY ("videoId") REFERENCES "Video"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
