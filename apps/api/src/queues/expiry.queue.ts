import { Queue } from "bullmq";
import { connection } from "./connection";

export const expiryQueue = new Queue("booking-expiry", { connection });
