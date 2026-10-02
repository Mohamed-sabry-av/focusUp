import { createServer } from "node:http";

import { env } from "@focusUp/env/server";

import app from "./app";
import { initializeSocket } from "./lib/socket";
import { noshowWorker } from "./workers/noshow.worker";
import { reminderWorker } from "./workers/reminder.worker";
import { expiryWorker } from "./workers/expiry.worker";
import { rematchWorker } from "./workers/rematch.worker";

const httpServer = createServer(app);
const io = initializeSocket(httpServer);

httpServer.listen(env.PORT, () => {
  console.log(`API running on http://localhost:${env.PORT}`);
});

const workers = [noshowWorker, reminderWorker, expiryWorker, rematchWorker];

async function gracefulShutdown(signal: string): Promise<void> {
  console.log(`Received ${signal}, shutting down gracefully...`);
  await io.close();
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
