-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "episodeNumber" INTEGER,
ADD COLUMN     "seasonNumber" INTEGER,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'movie';

-- CreateIndex
CREATE INDEX "Video_type_idx" ON "Video"("type");
