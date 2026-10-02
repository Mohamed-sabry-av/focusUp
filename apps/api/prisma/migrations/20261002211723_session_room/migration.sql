-- AlterTable
ALTER TABLE "Report" ADD COLUMN     "chatSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "endedEarly" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "rematchedToId" TEXT;

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "firstJoinedAt" TIMESTAMP(3),
    "lastJoinedAt" TIMESTAMP(3),
    "lastLeftAt" TIMESTAMP(3),
    "isPresent" BOOLEAN NOT NULL DEFAULT false,
    "extendedUntil" TIMESTAMP(3),
    "extensionCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionTask" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "done" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SessionTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SessionParticipant_userId_idx" ON "SessionParticipant"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_userId_key" ON "SessionParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "SessionTask_sessionId_userId_idx" ON "SessionTask"("sessionId", "userId");

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTask" ADD CONSTRAINT "SessionTask_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionTask" ADD CONSTRAINT "SessionTask_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
