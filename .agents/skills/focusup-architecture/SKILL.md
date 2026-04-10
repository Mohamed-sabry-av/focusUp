---
name: focusup-architecture
description: "FocusUp monorepo architecture, conventions, file placement, oRPC patterns, and hard agent constraints. Use when creating new modules, adding routes, modifying structure, or reviewing code for architectural compliance."
---

# FocusUp Architecture

## Monorepo Structure (Turborepo + Bun)

```
focusUp/
├── apps/
│   ├── web/                    # Next.js 14 (App Router) — TailwindCSS + shadcn/ui
│   │   ├── src/app/            # Route segments
│   │   ├── src/components/     # React components
│   │   └── src/utils/          # Client utilities (oRPC client, etc.)
│   └── server/                 # Express + oRPC — API server
│       └── src/index.ts        # Entry point, RPC + OpenAPI handlers
├── packages/
│   ├── api/                    # @focusUp/api — oRPC router definitions + procedures
│   │   └── src/
│   │       ├── index.ts        # Base procedures (publicProcedure, protectedProcedure)
│   │       ├── context.ts      # Request context (auth, session)
│   │       └── routers/        # Route modules (one file per domain)
│   ├── db/                     # @focusUp/db — Prisma schema + generated client
│   │   ├── prisma/schema/      # Schema files
│   │   └── prisma/generated/   # Generated Prisma client
│   ├── env/                    # @focusUp/env — T3 Env (Zod-validated env vars)
│   │   └── src/
│   │       ├── server.ts       # Server env (DATABASE_URL, CORS_ORIGIN, etc.)
│   │       └── web.ts          # Client env (NEXT_PUBLIC_*)
│   ├── config/                 # @focusUp/config — Shared TS/ESLint configs
│   └── ui/                     # @focusUp/ui — Shared design system components
└── infrastructure/
    ├── docker-compose.yml
    ├── calcom/
    └── nginx/
```

## Adding New Features — Step-by-Step

### 1. Add oRPC Router (Backend)
Create a new file in `packages/api/src/routers/`:
```typescript
// packages/api/src/routers/sessions.ts
import { z } from "zod";
import { publicProcedure, protectedProcedure } from "../index";

export const sessionsRouter = {
  list: protectedProcedure
    .input(z.object({ status: z.enum(["PENDING", "ACTIVE"]).optional() }))
    .handler(async ({ input, context }) => {
      // Always wrap Prisma in try/catch
      // Access auth via context.auth
    }),
};
```

Register in `packages/api/src/routers/index.ts`:
```typescript
import { sessionsRouter } from "./sessions";
export const appRouter = {
  healthCheck: publicProcedure.handler(() => "OK"),
  sessions: sessionsRouter,
};
```

### 2. Add Protected Procedure (Auth Guard)
```typescript
// packages/api/src/index.ts
import { ORPCError, os } from "@orpc/server";
import type { Context } from "./context";

export const o = os.$context<Context>();
export const publicProcedure = o;

export const authMiddleware = o.middleware(async ({ context, next }) => {
  if (!context.auth) {
    throw new ORPCError("UNAUTHORIZED", { message: "Not authenticated" });
  }
  return next({ context: { user: context.auth } });
});

export const protectedProcedure = o.use(authMiddleware);
```

### 3. Add Environment Variables
```typescript
// packages/env/src/server.ts — add new vars to the server schema
export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    CORS_ORIGIN: z.url(),
    LIVEKIT_API_KEY: z.string().min(1),      // ← new
    LIVEKIT_API_SECRET: z.string().min(1),   // ← new
  },
  runtimeEnv: process.env,
});
```

### 4. Add Next.js Pages
Place route segments in `apps/web/src/app/`:
- `(auth)/login/page.tsx` — Auth group
- `dashboard/page.tsx` — Dashboard
- `session/[id]/page.tsx` — Live session room
- `schedule/page.tsx` — Cal.com booking
- `profile/[slug]/page.tsx` — Public profile

Mark client components with `"use client"` — required for LiveKit, React Query, interactive UI.

### 5. Add shadcn/ui Components
Run from `apps/web/`: `bunx shadcn@latest add <component>`

## Hard Constraints — NEVER Violate

### Architecture
- NEVER use REST where WebSocket is appropriate (session presence, match notifications)
- NEVER store LiveKit tokens in localStorage — use in-memory state
- ALWAYS generate LiveKit tokens server-side, NEVER on the client
- ALWAYS verify Cal.com webhook signatures before processing
- Session room name = `session.id` (UUID) — never use user IDs

### Code Style
- ALL request payloads validated with Zod schema
- ALL Prisma queries wrapped in try/catch with structured error responses
- Use `{ error, statusCode }` format consistently
- Frontend: NO useEffect for data fetching — use React Query (TanStack Query)
- ALL user-generated text sanitized before storage (DOMPurify)

### Database
- NEVER run raw SQL — use Prisma query API only
- ALL schema changes require a new migration file
- Required indexes: `sessions.status`, `sessions.scheduledAt`, `sessions.user1Id`, `sessions.user2Id`

### Business Logic
- Free tier: enforce 3 sessions/week in SessionsService BEFORE calling Cal.com
- No-show: trigger at T+5min via BullMQ scheduled job, NOT on disconnect
- Strikes are immutable — never delete, only add
- Block is bidirectional — always create two Block records (A→B and B→A)

## What Agents CANNOT Change
- Prisma schema enums without explicit instruction
- LiveKit room config presets (resolution/encoding)
- Webhook signature verification logic
- Auth token expiry values

## What Agents CAN Do
- Add new oRPC routers following existing patterns
- Add new React Query hooks following conventions
- Write and run Prisma migrations
- Add new email templates
- Add new shadcn/ui components

## Tech Stack Quick Reference
| Layer | Technology | Package |
|-------|-----------|---------|
| Frontend | Next.js 14 App Router | `apps/web` |
| Styling | TailwindCSS + shadcn/ui | `apps/web` |
| State | Zustand + React Query | `apps/web` |
| API | oRPC (RPC + OpenAPI) | `packages/api` |
| Server | Express | `apps/server` |
| Database | PostgreSQL 17 + Prisma | `packages/db` |
| Cache/Queue | Redis + BullMQ | `apps/server` |
| Video | LiveKit Cloud | `apps/web` + `apps/server` |
| Scheduling | Cal.com (self-hosted) | Docker |
| Email | Resend | `apps/server` |
| Auth | Better Auth / NextAuth | `packages/api` |
| Env | T3 Env (Zod) | `packages/env` |
