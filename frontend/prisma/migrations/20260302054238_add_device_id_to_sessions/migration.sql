/*
  Warnings:

  - A unique constraint covering the columns `[userId,deviceId]` on the table `UserSession` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "UserSession" ADD COLUMN     "deviceId" TEXT;

-- CreateIndex
CREATE INDEX "UserSession_deviceId_idx" ON "UserSession"("deviceId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_userId_deviceId_key" ON "UserSession"("userId", "deviceId");
