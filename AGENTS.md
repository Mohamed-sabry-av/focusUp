# AGENTS.md — FocusUP Clone

## Project Identity
This is a **production MVP** for a virtual co-working platform.
This codebase will be maintained long-term. Treat every file as
permanent. No throwaway code. No shortcuts that create tech debt.

## Tech Stack (DO NOT DEVIATE)
- **Frontend**: Next.js 14 (App Router), TailwindCSS, shadcn/ui, Zustand, TanStack React Query
- **Backend**: Express (Node.js) with express-validator or Zod for validation
- **Database**: PostgreSQL 17 via Prisma ORM
- **Cache/Queue**: Redis via BullMQ
- **Auth**: Better Auth with JWT (access: 15min, refresh: 7d, httpOnly cookies)
- **Video**: LiveKit (Cloud) via @livekit/server-sdk + @livekit/components-react
- **Scheduling**: Custom-built slot-based booking system (no Cal.com dependency)
- **Email**: Resend SDK
- **Monorepo**: Turborepo with Bun

## Architecture Rules
- Express routes use controller → service → repository pattern
- All request payloads validated with Zod schemas (shared in packages/shared-types)
- All Prisma queries wrapped in try/catch with structured error responses
- Structured errors: { error: string, statusCode: number, details?: any }
- NO raw SQL — Prisma query API only
- NO useEffect for data fetching — TanStack React Query only
- LiveKit tokens generated server-side ONLY — never on client
- Booking system is custom-built. Slot-based booking: users pick time slots every 15 minutes, system matches them
- Session room names = session.id (cuid) — never user IDs
- WebSocket for: session presence, match notifications, in-app notifications
- REST for: everything else

## Code Style
- TypeScript strict mode everywhere
- No `any` types — use `unknown` and narrow
- All exports explicitly typed
- One component per file (React)
- Express routes grouped by domain: auth/, users/, sessions/, matching/, notifications/
- Prisma schema changes require a NEW migration file — never edit existing migrations

## Database Indexes Required
- sessions.status
- sessions.scheduledAt
- sessions.user1Id
- sessions.user2Id
- blocks.blockerId
- blocks.blockedId
- booking_requests.slotTime
- booking_requests.status

## Security
- All API routes behind JWT auth middleware (except: register, login, webhooks)
- Rate limiting on auth endpoints: 5 req/min
- All user-generated text sanitized with DOMPurify (frontend) and sanitize-html (backend)
- LiveKit tokens expire in 2 hours
- GDPR: data deletion endpoint required

## What You Must NEVER Change
- Prisma schema enums (SessionStatus, PlanTier) without explicit instruction
- LiveKit room config presets (resolution/encoding)
- Stripe webhook signature verification logic
- Auth token expiry values (15min access, 7d refresh)

## Quality Bar
Fight entropy. Leave the codebase better than you found it.
Every pattern you establish will be copied. Every corner you cut
will be cut again. This is production code.