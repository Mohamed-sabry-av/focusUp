-- AlterEnum
ALTER TYPE "TaskType" ADD VALUE 'ANY';

-- AlterTable
ALTER TABLE "BookingRequest" ADD COLUMN     "preferFavorites" BOOLEAN NOT NULL DEFAULT true;
