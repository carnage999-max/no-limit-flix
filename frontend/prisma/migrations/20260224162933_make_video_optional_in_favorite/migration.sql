-- DropForeignKey
ALTER TABLE "Favorite" DROP CONSTRAINT "Favorite_videoId_fkey";

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;
