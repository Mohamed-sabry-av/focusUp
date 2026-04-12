import express, {
  type Application,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";

import v1Router from "./api/v1";

import { errorHandler } from "./middleware/error-handler";
import passport from "./config/passport";
import { env } from "@focusUp/env/server";

const app: Application = express();

const localDevOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];
const corsOrigin =
  env.NODE_ENV === "development"
    ? [...new Set([env.CORS_ORIGIN, ...localDevOrigins])]
    : env.CORS_ORIGIN;

app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  }),
);
app.use(helmet());
app.use(cookieParser());
app.use(
  express.json({
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);
app.use(passport.initialize());

const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute window
  max: env.NODE_ENV === "test" ? 100 : 5, // max 5 requests per 1 minute window per IP
  message: {
    error: "Too many requests, please try again later.",
    statusCode: 429,
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/v1/auth", authLimiter);
app.use("/api/v1", v1Router);

app.get("/api/health", async (_req: Request, res: Response) => {
  let queues: Record<string, unknown> | undefined;
  try {
    const { noshowQueue } = await import("./queues/noshow.queue");
    const { reminderQueue } = await import("./queues/reminder.queue");
    const { expiryQueue } = await import("./queues/expiry.queue");

    const [noshowCounts, reminderCounts, expiryCounts] = await Promise.all([
      noshowQueue.getJobCounts(),
      reminderQueue.getJobCounts(),
      expiryQueue.getJobCounts(),
    ]);

    queues = {
      "session-noshow": noshowCounts,
      "session-reminder": reminderCounts,
      "booking-expiry": expiryCounts,
    };
  } catch {
    queues = undefined;
  }

  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    queues,
  });
});

app.use(errorHandler);

export default app;
