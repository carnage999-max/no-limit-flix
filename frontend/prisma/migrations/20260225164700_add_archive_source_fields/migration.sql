/*
  Warnings:

  - A unique constraint covering the columns `[userId,tmdbId]` on the table `Favorite` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[archiveIdentifier]` on the table `Video` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Favorite" ADD COLUMN     "tmdbId" TEXT,
ALTER COLUMN "videoId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "archiveIdentifier" TEXT,
ADD COLUMN     "format" TEXT,
ADD COLUMN     "sourceLicenseUrl" TEXT,
ADD COLUMN     "sourceMetadata" JSONB,
ADD COLUMN     "sourcePageUrl" TEXT,
ADD COLUMN     "sourceProvider" TEXT,
ADD COLUMN     "sourceRights" TEXT,
ADD COLUMN     "sourceType" TEXT;

-- CreateIndex
CREATE INDEX "Favorite_tmdbId_idx" ON "Favorite"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Favorite_userId_tmdbId_key" ON "Favorite"("userId", "tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Video_archiveIdentifier_key" ON "Video"("archiveIdentifier");
