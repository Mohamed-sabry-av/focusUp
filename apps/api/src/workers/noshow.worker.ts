import { Worker } from "bullmq";
import { connection } from "../queues/connection";

export const noshowWorker = new Worker(
  "session-noshow",
  async (job) => {
    try {
      console.log("Processing no-show check:", job.data.sessionId);
    } catch (err) {
      console.error("No-show worker error:", err);
      throw err;
    }
  },
  { connection },
);
