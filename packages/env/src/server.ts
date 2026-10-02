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

    // Email. Without a key, emails are logged (development and test only).
    RESEND_API_KEY: z.string().min(1).optional(),
    EMAIL_FROM: z.string().min(3).default("FocusUp <no-reply@localhost>"),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
  createFinalSchema: (shape) =>
    z.object(shape).superRefine((value, ctx) => {
      if (value.NODE_ENV === "production" && !value.RESEND_API_KEY) {
        ctx.addIssue({
          code: "custom",
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required in production",
        });
      }
    }),
});
