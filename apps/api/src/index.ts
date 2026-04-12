import app from "./app";
import { noshowWorker } from "./workers/noshow.worker";
import { reminderWorker } from "./workers/reminder.worker";
import { expiryWorker } from "./workers/expiry.worker";

const PORT = process.env.PORT;

const server = app.listen(PORT, () => {
  console.log(`API running on port ${PORT}`);
});

const workers = [noshowWorker, reminderWorker, expiryWorker];

async function gracefulShutdown(signal: string) {
  console.log(`Received ${signal}, shutting down gracefully...`);
  server.close();
  await Promise.all(workers.map((w) => w.close()));
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
