---
name: focusup-auth
description: "FocusUp authentication & onboarding — JWT strategy, OAuth, protected routes, onboarding wizard. Use when implementing login, register, auth guards, session tokens, or onboarding flows."
---

# FocusUp Authentication & Onboarding

## Auth Strategy
- **Methods:** Email/Password + Google OAuth
- **Tokens:** JWT access (15 min) + refresh token (7 days) in httpOnly cookie
- **Hashing:** bcrypt, rounds: 12
- **Rate limit:** 5 req/min on auth endpoints
- **Email verification:** Required before first session

## Implementation Pattern

### Backend Auth Middleware (oRPC)
```typescript
// packages/api/src/middleware/auth.ts
import { ORPCError } from "@orpc/server";
import { o } from "../index";
import { verifyAccessToken } from "../lib/jwt";

export const authMiddleware = o.middleware(async ({ context, next }) => {
  const token = context.req?.headers?.authorization?.replace("Bearer ", "");
  if (!token) {
    throw new ORPCError("UNAUTHORIZED", { message: "Missing access token" });
  }

  try {
    const payload = await verifyAccessToken(token);
    return next({ context: { user: payload } });
  } catch {
    throw new ORPCError("UNAUTHORIZED", { message: "Invalid or expired token" });
  }
});

export const protectedProcedure = o.use(authMiddleware);
```

### JWT Token Service
```typescript
// packages/api/src/lib/jwt.ts
import jwt from "jsonwebtoken";
import { env } from "@focusUp/env/server";

export function generateTokens(userId: string) {
  const accessToken = jwt.sign({ sub: userId }, env.JWT_SECRET, {
    expiresIn: "15m",
  });
  const refreshToken = jwt.sign({ sub: userId }, env.JWT_REFRESH_SECRET, {
    expiresIn: "7d",
  });
  return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, env.JWT_SECRET) as { sub: string };
}
```

### Auth Router
```typescript
// packages/api/src/routers/auth.ts
import { z } from "zod";
import { publicProcedure } from "../index";
import bcrypt from "bcrypt";

export const authRouter = {
  register: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
      displayName: z.string().min(2),
      username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_-]+$/),
    }))
    .handler(async ({ input }) => {
      const passwordHash = await bcrypt.hash(input.password, 12);
      // Create user, send verification email
    }),

  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string(),
    }))
    .handler(async ({ input }) => {
      // Verify credentials, generate tokens
      // Set refreshToken in httpOnly cookie
      // Return accessToken in response body
    }),

  refresh: publicProcedure.handler(async ({ context }) => {
    // Read refreshToken from httpOnly cookie
    // Verify, generate new token pair
  }),
};
```

### Frontend Protected Routes (Next.js)
```typescript
// apps/web/src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/register", "/", "/profile"];

export function middleware(request: NextRequest) {
  const token = request.cookies.get("refreshToken");
  const isPublic = publicPaths.some(p => request.nextUrl.pathname.startsWith(p));

  if (!token && !isPublic) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
```

## Onboarding Wizard (3 Steps)

After registration, redirect to `/onboarding`:

### Step 1 — Timezone
```typescript
// Auto-detect + allow override
const detectedTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
```

### Step 2 — Work Categories
```typescript
// Multi-select from: CODING, WRITING, STUDYING, DESIGN, ADMIN, OTHER
const categories: Category[] = ["CODING", "WRITING"];
```

### Step 3 — Preferred Session Length
```typescript
// Checkbox group: 25 min, 50 min, 75 min
const preferredLength: number[] = [25, 50];
```

On completion → update User record → redirect to `/dashboard`.

## Security Rules
- NEVER store tokens in localStorage — httpOnly cookies for refresh, in-memory for access
- NEVER expose JWT secrets to the client
- Rate limit auth endpoints: 5 req/min per IP
- Sanitize all user input on registration (DOMPurify)
- GDPR: data deletion endpoint required at `/api/account/delete`

## Public Profile
- Route: `/profile/[username]`
- Display: name, avatar, member since, total focus hours, categories, languages
- "Book a session with me" button → their Cal.com page
- No private data exposed (email, timezone hidden from public view)
