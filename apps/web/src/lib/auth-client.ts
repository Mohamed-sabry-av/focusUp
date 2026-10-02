import { env } from "@focusUp/env/web";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

/**
 * Better Auth client. Talks to the API at /api/auth and sends the session
 * cookie with every request (the web app and the API run on different ports
 * in development).
 */
export const authClient = createAuthClient({
  baseURL: env.NEXT_PUBLIC_SERVER_URL,
  fetchOptions: { credentials: "include" },
  plugins: [
    inferAdditionalFields({
      user: {
        // Mirror the server definitions in apps/api/src/lib/auth.ts.
        username: { type: "string", required: false, input: false },
        timezone: { type: "string", required: false },
      },
    }),
  ],
});

/** Browser timezone, sent at sign-up so the server can store it. */
export function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Absolute URL of a page in this web app (Better Auth needs full URLs for redirects). */
export function webUrl(path: string): string {
  return `${window.location.origin}${path}`;
}
