-- Add optional Apple identity id for Sign in with Apple
ALTER TABLE "User" ADD COLUMN "appleId" TEXT;

-- Ensure one Apple account maps to only one user
CREATE UNIQUE INDEX "User_appleId_key" ON "User"("appleId");
