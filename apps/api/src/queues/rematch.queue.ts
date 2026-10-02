import { Queue } from "bullmq";
import { connection } from "./connection";

export const rematchQueue = new Queue("session-rematch", { connection });
