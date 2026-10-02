import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { connection } from "../queues/connection";
import { prisma } from "../lib/prisma";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "../services/email.service";

export interface ReminderJobData {
  sessionId: string;
  type: "24h" | "5min";
}

export async function processReminderJob(
  job: Job<ReminderJobData>,
): Promise<void> {
  const { sessionId, type } = job.data;

  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    include: { user1: true, user2: true },
  });

  if (!session) {
    console.log(`[reminder] Session ${sessionId} not found, skipping`);
    return;
  }

  // Skip if session is no longer relevant
  if (
    session.status === "CANCELLED" ||
    session.status === "COMPLETED" ||
    session.status === "NO_SHOW"
  ) {
    console.log(
      `[reminder] Session ${sessionId} is ${session.status}, skipping`,
    );
    return;
  }

  if (type === "24h") {
    // Send WebSocket reminder + emails to both users
    await NotificationService.notifySessionReminder(session, "24h");

    await EmailService.sendSessionReminder({
      to: session.user1.email,
      partnerName: session.user2?.displayName ?? "your partner",
      sessionTime: session.scheduledAt,
      sessionId: session.id,
    });

    if (session.user2) {
      await EmailService.sendSessionReminder({
        to: session.user2.email,
        partnerName: session.user1.displayName,
        sessionTime: session.scheduledAt,
        sessionId: session.id,
      });
    }
  } else {
    // 5min: WebSocket only (no email)
    await NotificationService.notifySessionReminder(session, "5min");
  }
}

export const reminderWorker = new Worker<ReminderJobData>(
  "session-reminder",
  processReminderJob,
  { connection },
);
