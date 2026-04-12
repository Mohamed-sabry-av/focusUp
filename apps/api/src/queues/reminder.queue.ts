import { Queue } from "bullmq";
import { connection } from "./connection";

export const reminderQueue = new Queue("session-reminder", { connection });
