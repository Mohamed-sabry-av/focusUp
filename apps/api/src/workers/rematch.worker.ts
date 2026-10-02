import type { Job } from "bullmq";
import { Worker } from "bullmq";
import { connection } from "../queues/connection";
import { scheduleNoshowCheck } from "../queues/helpers";
import { NotificationService } from "../services/notification.service";
import { RematchService } from "../api/v1/matching/rematch.service";

export interface RematchJobData {
  sessionId: string;
}

/** At T+1 and T+2: if this session's person is alone, pair them with another lonely person. */
export async function processRematchJob(job: Job<RematchJobData>): Promise<void> {
  const result = await RematchService.rematchLonelySession(job.data.sessionId);
  if (!result) return;

  await scheduleNoshowCheck(result.sessionId, result.scheduledAt);
  for (const userId of result.userIds) {
    await NotificationService.notifyRematch(userId, result.sessionId);
  }
}

export const rematchWorker = new Worker<RematchJobData>(
  "session-rematch",
  processRematchJob,
  { connection },
);
