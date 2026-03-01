-- Add average rating + vote count for public catalog metadata
ALTER TABLE "Video"
ADD COLUMN IF NOT EXISTS "averageRating" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "ratingCount" INTEGER;
