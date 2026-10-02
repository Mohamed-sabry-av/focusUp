import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { connection } from "../queues/connection";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "../services/email.service";
import { removeJob } from "../queues/helpers";

export interface NoshowJobData {
  sessionId: string;
}

export async function processNoshowJob(job: Job<NoshowJobData>): Promise<void> {
  const { sessionId } = job.data;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user1: true, user2: true },
  });

  if (!session) {
    console.log(`[noshow] Session ${sessionId} not found, skipping`);
    return;
  }

  // Only trigger NO_SHOW if still CONFIRMED (not ACTIVE, COMPLETED, or CANCELLED)
  if (session.status !== "CONFIRMED") {
    console.log(
      `[noshow] Session ${sessionId} already ${session.status}, skipping`,
    );
    return;
  }

  // Determine who joined via Redis set
  const redisKey = `session:joined:${sessionId}`;
  const joinedUserIds = await redis.smembers(redisKey);

  // Mark session as NO_SHOW
  await prisma.session.update({
    where: { id: sessionId },
    data: { status: "NO_SHOW" },
  });

  // Determine absent and present participants
  const participantIds = [session.user1Id, session.user2Id].filter(
    (id): id is string => id !== null,
  );
  const absentUserIds = participantIds.filter(
    (id) => !joinedUserIds.includes(id),
  );
  const presentUserIds = participantIds.filter((id) =>
    joinedUserIds.includes(id),
  );

  // Handle absent users: increment strike, warn at 3, ban at 5
  for (const userId of absentUserIds) {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { strikeCount: { increment: 1 } },
    });

    const userRecord =
      userId === session.user1Id ? session.user1 : session.user2;

    if (updatedUser.strikeCount === 3 && userRecord) {
      await EmailService.sendStrikeWarning({
        to: userRecord.email,
        strikeCount: 3,
      });
    }

    if (updatedUser.strikeCount >= 5) {
      await prisma.user.update({
        where: { id: userId },
        data: { isBanned: true },
      });
      if (userRecord) {
        await EmailService.sendBanNotification({ to: userRecord.email });
      }
    }
  }

  // Notify present users via WebSocket + email
  for (const userId of presentUserIds) {
    const userRecord =
      userId === session.user1Id ? session.user1 : session.user2;
    await NotificationService.notifyNoShow(session, userId);
    if (userRecord) {
      await EmailService.sendPartnerNoShowNotification({
        to: userRecord.email,
        sessionId,
      });
    }
  }

  // Remove reminder jobs — no longer relevant
  await removeJob("session-reminder", `reminder-24h-${sessionId}`);
  await removeJob("session-reminder", `reminder-5m-${sessionId}`);
}

export const noshowWorker = new Worker<NoshowJobData>(
  "session-noshow",
  processNoshowJob,
  { connection },
);
