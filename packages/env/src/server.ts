import path from "node:path";
import { fileURLToPath } from "node:url";

import dotenv from "dotenv";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, "../../../apps/api/.env") });
dotenv.config({ path: path.join(__dirname, "../../../.env") });

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    PORT: z.coerce.number().int().positive().default(3000),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

    // Better Auth. No default: a missing secret must stop the server.
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),

    // Google sign-in is enabled only when both values are set.
    GOOGLE_CLIENT_ID: z.string().min(1).optional(),
    GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

    // Free plan weekly limit (6 sessions). Off during the free beta; turned on with payments.
    QUOTA_ENFORCED: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    // LiveKit. Tokens are signed here and webhooks are verified with the same pair. No default.
    LIVEKIT_API_KEY: z.string().min(1),
    LIVEKIT_API_SECRET: z.string().min(32),

    // Development only: new accounts start verified and no verification email is sent, for
    // when there is no email provider yet. Refused in production (see below).
    SKIP_EMAIL_VERIFICATION: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),

    // Email. Without a key, emails are logged (development and test only).
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3).default("FocusUp <no-reply@localhost>"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((value, ctx) => {
      if (value.NODE_ENV === "production" && value.SKIP_EMAIL_VERIFICATION) {
        ctx.addIssue({
          code: "custom",
          path: ["SKIP_EMAIL_VERIFICATION"],
          message: "SKIP_EMAIL_VERIFICATION must not be enabled in production",
        });
      }
      if (value.NODE_ENV === "production" && !value.RESEND_API_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required in production",
        });
      }
    }),
});
