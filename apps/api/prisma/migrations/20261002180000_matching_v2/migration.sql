-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('DESK', 'WALK');

-- CreateEnum
CREATE TYPE "StrikeReason" AS ENUM ('NO_SHOW', 'LATE_CANCEL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "BookingRequestStatus" ADD VALUE 'LATE_CANCELLED';
ALTER TYPE "BookingRequestStatus" ADD VALUE 'NO_SHOW';
ALTER TYPE "BookingRequestStatus" ADD VALUE 'SOLO';
ALTER TYPE "BookingRequestStatus" ADD VALUE 'COMPLETED';

-- DropIndex
DROP INDEX "BookingRequest_userId_slotTime_durationMin_key";

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "cameraOn" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "countsToQuota" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "flexible" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "quiet" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taskType" "TaskType" NOT NULL DEFAULT 'DESK';

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "isSolo" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "strikeCount",
ADD COLUMN     "dataSaver" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hidePhoto" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "suspendedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "favoriteId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","favoriteId")
);

-- CreateTable
CREATE TABLE "Strike" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "bookingRequestId" TEXT,
    "reason" "StrikeReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Strike_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Favorite_favoriteId_idx" ON "Favorite"("favoriteId");

-- CreateIndex
CREATE INDEX "Strike_userId_createdAt_idx" ON "Strike"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Block_blockerId_idx" ON "Block"("blockerId");

-- CreateIndex
CREATE INDEX "Block_blockedId_idx" ON "Block"("blockedId");

-- CreateIndex
CREATE INDEX "BookingRequest_userId_slotTime_idx" ON "BookingRequest"("userId", "slotTime");

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_favoriteId_fkey" FOREIGN KEY ("favoriteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Strike" ADD CONSTRAINT "Strike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
