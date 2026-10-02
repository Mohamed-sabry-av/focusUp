-- AlterEnum
ALTER TYPE "StrikeReason" ADD VALUE 'ADMIN';

-- AlterTable
ALTER TABLE "Strike" ADD COLUMN     "note" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Strike_bookingRequestId_reason_key" ON "Strike"("bookingRequestId", "reason");
