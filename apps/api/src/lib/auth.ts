import { env } from "@focusUp/env/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError } from "better-auth/api";

import { EmailService } from "../services/email.service";
import { prisma } from "./prisma";
import { generateUniqueUsername } from "./username";

/** Sign-in, sign-up and email-sending endpoints: 5 requests per minute (AGENTS.md). */
const SENSITIVE_PATHS = [
  "/sign-in/email",
  "/sign-up/email",
  "/request-password-reset",
  "/reset-password",
  "/send-verification-email",
] as const;

export interface CreateAuthOptions {
  /** Requests per minute allowed on the sensitive endpoints. */
  sensitiveRateLimit?: number;
}

const SESSION_LIFETIME_SECONDS = 60 * 60 * 24 * 7; // 7 days
const SESSION_CACHE_SECONDS = 60 * 15; // 15 minutes

async function isUsernameTaken(username: string): Promise<boolean> {
  const found = await prisma.user.findUnique({
    where: { username },
    select: { id: true },
  });
  return found !== null;
}

/** Logs a failed email send without failing the request that triggered it. */
function sendInBackground(task: Promise<void>, what: string): void {
  task.catch((error: unknown) => {
    console.error(`[auth] could not send ${what}:`, error);
  });
}

export function createAuth(options: CreateAuthOptions = {}) {
  const googleEnabled = Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  const sensitiveMax = options.sensitiveRateLimit ?? 5;

  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.CORS_ORIGIN],
    database: prismaAdapter(prisma, { provider: "postgresql" }),

    user: {
      // Reuse our User table: Better Auth "name" and "image" live in these columns.
      fields: { name: "displayName", image: "avatarUrl" },
      additionalFields: {
        username: { type: "string", required: false, input: false },
        timezone: { type: "string", required: false },
      },
    },

    // Our Session model is the focus session, so login sessions use AuthSession.
    session: {
      modelName: "authSession",
      expiresIn: SESSION_LIFETIME_SECONDS,
      cookieCache: { enabled: true, maxAge: SESSION_CACHE_SECONDS },
    },

    advanced: {
      cookiePrefix: "focusup",
      useSecureCookies: env.NODE_ENV === "production",
      // Ids come from the Prisma schema (cuid).
      database: { generateId: false },
    },

    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        sendInBackground(
          EmailService.sendPasswordReset({ to: user.email, name: user.name, url }),
          "password reset email",
        );
      },
    },

    emailVerification: {
      sendOnSignUp: true,
      autoSignInAfterVerification: true,
      sendVerificationEmail: async ({ user, url }) => {
        sendInBackground(
          EmailService.sendVerificationEmail({ to: user.email, name: user.name, url }),
          "verification email",
        );
      },
    },

    ...(googleEnabled
      ? {
          socialProviders: {
            google: {
              clientId: env.GOOGLE_CLIENT_ID as string,
              clientSecret: env.GOOGLE_CLIENT_SECRET as string,
            },
          },
        }
      : {}),

    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },

    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: Object.fromEntries(
        SENSITIVE_PATHS.map((path) => [path, { window: 60, max: sensitiveMax }]),
      ),
    },

    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            const username = await generateUniqueUsername(user.email, isUsernameTaken);
            return { data: { ...user, username } };
          },
        },
      },
      session: {
        create: {
          before: async (session) => {
            const account = await prisma.user.findUnique({
              where: { id: session.userId },
              select: { isBanned: true, isActive: true },
            });
            if (account?.isBanned) {
              throw new APIError("FORBIDDEN", { message: "Account suspended" });
            }
            if (account && !account.isActive) {
              throw new APIError("FORBIDDEN", { message: "Account deactivated" });
            }
            return { data: session };
          },
        },
      },
    },
  });
}

export const auth = createAuth();

export type Auth = typeof auth;
