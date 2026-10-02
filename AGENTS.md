# AGENTS.md — FocusUP Clone

## Project Identity
This is a **production MVP** for a virtual co-working platform.
This codebase will be maintained long-term. Treat every file as
permanent. No throwaway code. No shortcuts that create tech debt.

## Source of Truth
- **What to build**: `docs/SPEC.md` (product spec v1.1; Word export in `docs/FocusUp_SPEC_v1.1.docx`)
- **Why it was decided**: `docs/DECISIONS.md` — when a decision changes, update both files
- **How to build it**: this file
- `plan/prd-phase-*.json` and `tasks/phase0` are retired (April, Cal.com era) — do not implement from them

## Tech Stack (DO NOT DEVIATE)
- **Frontend**: Next.js 16 (App Router), TailwindCSS v4, shadcn/ui (packages/ui), Zustand, TanStack React Query
- **Backend**: Express 5 REST in `apps/api` — the only backend. Zod for validation
- **Database**: PostgreSQL 17 via Prisma 7
- **Background jobs**: pg-boss (jobs stored in Postgres). No Redis — the BullMQ workers are being replaced
- **Auth**: Better Auth — email/password + Google only. httpOnly cookies
- **Video**: LiveKit (self-hosted Docker) — ws://localhost:7880 for development
- **Realtime**: socket.io for app events; LiveKit data channel inside the session room
- **Scheduling**: Custom-built slot-based booking system (no Cal.com dependency)
- **Email**: Resend SDK · **Push**: Web Push (VAPID)
- **Payments**: Paymob + an international card provider (TBD). NOT Stripe — it doesn't support Egypt-based merchants
- **Monorepo**: Turborepo with Bun
- **Hosting**: one server, one domain (subdomains allowed), Docker Compose behind Caddy

## Architecture Rules
- Express routes use controller → service → repository pattern
- All request payloads AND response bodies defined as Zod schemas in packages/shared-types
- Web calls the API only through the shared typed fetch helper — no hand-written request/response types in hooks
- All Prisma queries wrapped in try/catch with structured error responses
- Structured errors: { error: string, statusCode: number, details?: unknown }
- NO raw SQL — Prisma query API only
- NO useEffect for data fetching — TanStack React Query only
- LiveKit tokens generated server-side ONLY — never on client
- Join/leave, no-show and strike logic reads LiveKit webhooks (signature-verified) — never trust the client for presence
- Booking system is custom-built. Slot-based booking: users pick time slots every 15 minutes, system matches them
- Session room names = session.id (cuid) — never user IDs
- WebSocket (socket.io) for: match notifications, rematch events, in-app notifications
- REST for: everything else
- Every job handler re-checks database state before acting (idempotent) — jobs are queued outside the Prisma transaction
- A reconcile step re-creates missing jobs at worker startup and every 15 minutes

## Code Style
- TypeScript strict mode everywhere
- No `any` types — use `unknown` and narrow
- All exports explicitly typed
- One component per file (React)
- Express routes grouped by domain: auth/, users/, bookings/, matching/, sessions/, notifications/, reports/, blocks/, admin/, webhooks/
- Prisma schema changes require a NEW migration file — never edit existing migrations, never use `db push`

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
- All API routes behind auth middleware (except: Better Auth handler, webhooks, health check)
- Never fall back to a default secret — missing secrets must crash the process at startup
- Rate limiting on auth endpoints: 5 req/min
- All user-generated text sanitized with DOMPurify (frontend) and sanitize-html (backend)
- LiveKit tokens expire in 2 hours
- GDPR + Egypt PDPL: data export and data deletion endpoints required

## Workflow
- `master` is always deployable
- One short branch per change: `feat/…`, `fix/…`, `docs/…` — merged into `master` by PR
- Pre-commit runs type checks and tests — never skip them

## What You Must NEVER Change
- Prisma schema enums (SessionStatus, PlanTier) without explicit instruction
- LiveKit video config: VP8 simulcast (3 layers up to 720p), adaptiveStream + dynacast; "Data saver" caps at 360p
- Payment webhook signature verification logic
- Auth expiry values: 15 min (session re-validation / cookie cache) and 7 days (session lifetime)

## Quality Bar
Fight entropy. Leave the codebase better than you found it.
Every pattern you establish will be copied. Every corner you cut
will be cut again. This is production code.
