-- CreateTable
CREATE TABLE "VideoFlag" (
    "id" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "flaggedById" TEXT,
    "reason" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "VideoFlag_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VideoFlag_videoId_idx" ON "VideoFlag"("videoId");

-- CreateIndex
CREATE INDEX "VideoFlag_status_idx" ON "VideoFlag"("status");

-- AddForeignKey
ALTER TABLE "VideoFlag" ADD CONSTRAINT "VideoFlag_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoFlag" ADD CONSTRAINT "VideoFlag_flaggedById_fkey" FOREIGN KEY ("flaggedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

