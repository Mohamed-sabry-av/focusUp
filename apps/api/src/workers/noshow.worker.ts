import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { connection } from "../queues/connection";
import { prisma } from "../lib/prisma";
import { redis } from "../lib/redis";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "../services/email.service";
import { removeJob } from "../queues/helpers";
import { addStrike } from "../services/strikes.service";

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

  // Absent users: their booking becomes NO_SHOW and earns one strike. Retried jobs are
  // safe: a booking earns at most one strike per reason.
  for (const userId of absentUserIds) {
    const booking = await prisma.bookingRequest.findFirst({
      where: { sessionId, userId },
      select: { id: true },
    });
    if (booking) {
      await prisma.bookingRequest.update({
        where: { id: booking.id },
        data: { status: "NO_SHOW" },
      });
    }
    await addStrike({
      userId,
      reason: "NO_SHOW",
      bookingRequestId: booking?.id,
    });
  }

  // Present users did nothing wrong: their session does not count toward the weekly quota.
  if (presentUserIds.length > 0) {
    await prisma.bookingRequest.updateMany({
      where: { sessionId, userId: { in: presentUserIds } },
      data: { countsToQuota: false },
    });
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
