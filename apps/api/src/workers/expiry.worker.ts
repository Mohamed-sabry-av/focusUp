import { Worker } from "bullmq";
import { connection } from "../queues/connection";

export const expiryWorker = new Worker(
  "booking-expiry",
  async (job) => {
    try {
      console.log("Processing booking expiry:", job.data.bookingRequestId);
    } catch (err) {
      console.error("Expiry worker error:", err);
      throw err;
    }
  },
  { connection },
);
