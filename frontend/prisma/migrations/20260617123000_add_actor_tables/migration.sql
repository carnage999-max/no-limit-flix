-- CreateTable
CREATE TABLE "Actor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tmdbId" TEXT,
    "profilePath" TEXT,
    "toneProfile" JSONB NOT NULL,
    "pacingTendency" TEXT NOT NULL DEFAULT 'medium',
    "emotionalRange" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "genreBlend" JSONB NOT NULL,
    "rewatchability" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "permanenceScore" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Actor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActorOnVideo" (
    "actorId" TEXT NOT NULL,
    "videoId" TEXT NOT NULL,
    "role" TEXT,
    "isLead" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActorOnVideo_pkey" PRIMARY KEY ("actorId","videoId")
);

-- CreateIndex
CREATE UNIQUE INDEX "Actor_tmdbId_key" ON "Actor"("tmdbId");

-- CreateIndex
CREATE INDEX "Actor_name_idx" ON "Actor"("name");

-- CreateIndex
CREATE INDEX "Actor_tmdbId_idx" ON "Actor"("tmdbId");

-- CreateIndex
CREATE INDEX "ActorOnVideo_actorId_idx" ON "ActorOnVideo"("actorId");

-- CreateIndex
CREATE INDEX "ActorOnVideo_videoId_idx" ON "ActorOnVideo"("videoId");

-- AddForeignKey
ALTER TABLE "ActorOnVideo" ADD CONSTRAINT "ActorOnVideo_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Actor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActorOnVideo" ADD CONSTRAINT "ActorOnVideo_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE CASCADE ON UPDATE CASCADE;
