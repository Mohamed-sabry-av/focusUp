import { Worker } from "bullmq";
import { connection } from "../queues/connection";

export const reminderWorker = new Worker(
  "session-reminder",
  async (job) => {
    try {
      console.log("Processing session reminder:", job.data.sessionId);
    } catch (err) {
      console.error("Reminder worker error:", err);
      throw err;
    }
  },
  { connection },
);
