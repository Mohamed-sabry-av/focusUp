import express, {} from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import rateLimit from "express-rate-limit";
import v1Router from "./api/v1";
import { errorHandler } from "./middleware/error-handler";
import passport from "./config/passport";
import { env } from "@focusUp/env/server";
const app = express();
app.use(cors({
    origin: env.CORS_ORIGIN,
}));
app.use(helmet());
app.use(cookieParser());
app.use(express.json({
    verify: (req, _res, buf) => {
        req.rawBody = buf;
    },
}));
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
app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        timestamp: new Date().toISOString(),
    });
});
app.use(errorHandler);
export default app;
