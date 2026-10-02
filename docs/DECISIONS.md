# FocusUp — Decision Log

Last updated: 2 October 2026 · From a grill session with the founder.

## How to read this

| Document | Role |
|---|---|
| `docs/SPEC.md` (v1.1, 2 Oct 2026) | Product truth: what to build and why. Already includes every decision below. `docs/FocusUp_SPEC_v1.1.docx` is the Word export of the same text |
| **This file** | Why each v1.1 change was made. If the spec and this file ever disagree, the newest entry wins and the spec gets updated |
| `AGENTS.md` | Code rules: how to build it |
| `plan/prd-phase-*.json`, `tasks/phase0` | **Retired.** April task lists (Cal.com era, statuses never updated). Kept for history only |

Everything in the spec not listed below still stands: 25/50/75-minute sessions, 15-minute start
slots up to 14 days ahead, free tier 6 sessions/week, strikes (5 in 30 days → 3-day suspension),
reminders, dashboard, admin panel and analytics events.

## Decisions — 2 Oct 2026

### Product

| # | Area | Decision | Overrides |
|---|---|---|---|
| P1 | Experience | Match the Focusmate experience unless a row below says otherwise | — |
| P2 | Calendar | Booked slots show other users' first name + photo. Privacy setting "hide my photo" shows initials instead | — |
| P3 | Camera | Camera required for everyone. No camera-off option | Spec #12, camera line in "why us" |
| P4 | Quiet mode | Soft preference. At booking, a Quiet user is matched with a waiting Quiet user first; if none is waiting, with a non-Quiet user, and the partner sees a "Quiet mode" badge | Spec #13 |
| P5 | Matching filters | **Hard:** same start, same duration, not blocked (either way), account active, same gender if either side asked. **Soft:** Quiet, Desk/Walk. **Priority:** favorites | Spec §5.2 |
| P6 | Match timing | A match locks at booking. The partner only changes if they cancel or no-show. T-10 relax for "flexible" bookings now only drops same-gender | Spec §5.3 |
| P7 | No-show | Rematch offered at T+1 min. Solo session offered at T+3 (no quota, no strike). Absent user marked NO_SHOW + 1 strike at T+5 | Spec §5.3–5.4 |
| P8 | Room tools (v1) | Goal + check-out (tasks done, 1–5 rating), report & block, text chat (LiveKit data channel), task list (≤ 10), screen share (opt-in, never auto-start) | — |
| P9 | Sign-in (beta) | Email + password (verified) and Google. Phone OTP and Facebook after the beta | Spec #20 for beta |
| P10 | Minors | No age restriction (founder's decision). **Accepted risk**, see Risks | — |

### Technical

| # | Area | Decision | Overrides |
|---|---|---|---|
| T1 | Hosting | One server, one IP, one domain. Subdomains allowed. Provider and region chosen before the beta (see Open questions) | Spec #31 |
| T2 | Backend | One REST backend: `apps/api` (controller → service → repository). Delete `apps/server`, `packages/api` (oRPC wrapper) and `packages/db` (empty scaffold) | Better-T-Stack scaffold |
| T3 | API contracts | All Zod input **and** response schemas live in `packages/shared-types`. Web calls the API through one typed fetch helper, no hand-written types in hooks | — |
| T4 | Auth | Migrate to Better Auth now, before other features. Remove the custom JWT code (it has a hard-coded fallback secret, and verification emails are never sent) | Current code |
| T5 | Jobs | Keep Redis + BullMQ. Redis runs with AOF persistence and `maxmemory-policy noeviction`. A sweep every minute rebuilds any missed reminder / rematch / no-show job from the database | Spec §9.1 (pg-boss) |
| T6 | Realtime | Keep socket.io for match, rematch and in-app notifications. Email + Web Push when the tab is closed | Spec §9.2 (polling) |
| T7 | Join/leave truth | LiveKit webhooks (signature-verified) record who joined and left. No-show and strike logic uses them, never the browser's word | — |
| T8 | Video preset | 960×540 @ 24 fps, max ~600 kbps, VP8 with simulcast, `adaptiveStream` + `dynacast` on. About 450 MB per 50-min session (send + receive) | Old preset: 540p30, 1.5 Mbps, VP9 |
| T9 | Payments | Paymob (Egypt) + an international card provider (TBD). Never Stripe (it doesn't support Egypt-based merchants). Built after the beta | AGENTS.md (Stripe) |
| T10 | Database | Create a baseline Prisma migration from the current schema. `db push` is not allowed from then on | — |
| T11 | Backups | Not now. **Revisit before beta invites go out** | — |

### Process

| # | Area | Decision |
|---|---|---|
| W1 | Branches | `master` is always deployable. One short branch per change (`feat/…`, `fix/…`, `docs/…`), merged into `master` by PR. The old stacked branches were all contained in `master` on 2 Oct 2026 |
| W2 | Build order | Foundation first (see below) |
| W3 | Closed beta | **Friday 20 November 2026.** No payments, invited users only (NTI + friends) |
| W4 | Beta success | Checked mid-December: ≥ 80% of bookings get a partner · ≥ 95% of sessions connect video within 10 s · ≥ 40% of beta users book a 2nd session within 7 days |

## Target architecture (one server)

```
example.com           → Caddy (TLS) → Next.js (apps/web)
example.com/api/*     → Caddy       → apps/api (REST, Better Auth, socket.io)
                                      worker container (same image, BullMQ workers + sweep)
rtc.example.com       → Caddy       → LiveKit signaling (WSS)
turn.example.com:443  → Caddy layer4 (SNI routing) → LiveKit TURN/TLS
UDP + TCP 7881        → LiveKit media (direct)
Postgres 17, Redis 7  → internal network only
```

Serving the API under the same origin (`/api`) avoids CORS and cross-site cookie problems for
Better Auth. LiveKit runs as its own Compose project so app deploys never restart it and never
cut live sessions. `infrastructure/livekit/livekit.yaml` must move from the dev key and
`use_external_ip: false` / TURN disabled to real keys from env, external IP, and TURN on.

## Build order to the beta

| Weeks | Dates | Work |
|---|---|---|
| 1 | 5–9 Oct | Cleanup: one backend, delete scaffolds, ignore the `livekit/` and `meet/` reference clones, baseline migration, shared contracts. Better Auth (email + Google, verification and reset through Resend) |
| 2–3 | 12–23 Oct | Schema for the new rules (booking preferences, Favorite, Strike, SessionTask, Notification, PushSubscription). Matching v2 (P4–P6). Calendar showing people (P2) |
| 4–5 | 26 Oct–6 Nov | Session room: video preset, goal/check-out, chat, tasks, screen share, report & block, LiveKit webhooks, reconnect, rematch T+1 / solo T+3 |
| 6 | 9–13 Nov | Jobs + notifications: reminders (email + .ics + push), T-10 relax, no-show at T+5, strikes, sweep. Server + domain live |
| 7 | 16–20 Nov | Dashboard (stats, streak, history), admin reports queue, analytics events, connection tests on Egyptian networks → **beta Fri 20 Nov** |

## Open questions

| Question | Needed by |
|---|---|
| Server provider + region, and the domain name | ~9 Nov (beta needs a live server) |
| Backups (T11) | Before beta invites |
| Product name (spec #1) | Before buying the domain |
| Subscription price; international card provider | Before payments work (after beta) |
| Minors policy (P10) | Before NTI/ITIDA partnership, app stores, public launch |
| Chat retention, quota week definition, auto-suspend threshold (spec §14) | Before beta |

## Risks to watch

| Risk | Mitigation |
|---|---|
| Video fails on restrictive networks (Egyptian mobile carriers, university and office Wi-Fi) | TURN/TLS on port 443. Test from Vodafone, Orange, e& and WE before the beta |
| One server is a single point of failure, and there are no backups yet | Decide T11 before beta invites. Uptime monitor |
| Few partners at off-peak hours | Beta invites focused on peak hours. Watch match rate per time slot |
| Minors in 1:1 video with adults (accepted risk) | Report & block in one click, auto-suspend threshold, admin review |
| Better Auth migration touches every user query | Do it first, behind the existing tests |
| Screen share with strangers | Opt-in only, report covers it |
