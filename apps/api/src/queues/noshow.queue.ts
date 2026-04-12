import { Queue } from "bullmq";
import { connection } from "./connection";

export const noshowQueue = new Queue("session-noshow", { connection });
