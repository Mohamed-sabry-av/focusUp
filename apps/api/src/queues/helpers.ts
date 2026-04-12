import { Queue } from "bullmq";
import { noshowQueue } from "./noshow.queue";
import { reminderQueue } from "./reminder.queue";
import { expiryQueue } from "./expiry.queue";

const queueMap: Record<string, Queue> = {
  "session-noshow": noshowQueue,
  "session-reminder": reminderQueue,
  "booking-expiry": expiryQueue,
};

export async function scheduleNoshowCheck(
  sessionId: string,
  scheduledAt: Date,
): Promise<void> {
  const delay = scheduledAt.getTime() + 5 * 60 * 1000 - Date.now();
  if (delay <= 0) return;

  await noshowQueue.add(
    "noshow-check",
    { sessionId },
    {
      jobId: `noshow-${sessionId}`,
      delay,
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
    },
  );
}

export async function scheduleReminders(
  sessionId: string,
  scheduledAt: Date,
): Promise<void> {
  const now = Date.now();
  const scheduledTime = scheduledAt.getTime();
  const twentyFourHours = 24 * 60 * 60 * 1000;
  const fiveMinutes = 5 * 60 * 1000;

  if (scheduledTime - now > twentyFourHours) {
    await reminderQueue.add(
      "reminder-24h",
      { sessionId, type: "24h" },
      {
        jobId: `reminder-24h-${sessionId}`,
        delay: scheduledTime - twentyFourHours - now,
      },
    );
  }

  if (scheduledTime - now > fiveMinutes) {
    await reminderQueue.add(
      "reminder-5m",
      { sessionId, type: "5m" },
      {
        jobId: `reminder-5m-${sessionId}`,
        delay: scheduledTime - fiveMinutes - now,
      },
    );
  }
}

export async function scheduleBookingExpiry(
  bookingRequestId: string,
  slotTime: Date,
): Promise<void> {
  const delay = slotTime.getTime() - Date.now();
  if (delay <= 0) return;

  await expiryQueue.add(
    "booking-expiry",
    { bookingRequestId },
    {
      jobId: `expiry-${bookingRequestId}`,
      delay,
    },
  );
}

export async function removeJob(
  queueName: string,
  jobId: string,
): Promise<void> {
  try {
    const queue = queueMap[queueName];
    if (!queue) return;
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
  } catch {
    // Job might not exist — ignore silently
  }
}
