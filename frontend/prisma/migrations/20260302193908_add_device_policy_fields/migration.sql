-- AlterTable
ALTER TABLE "User" ADD COLUMN     "maxDevices" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "primaryDeviceId" TEXT;
