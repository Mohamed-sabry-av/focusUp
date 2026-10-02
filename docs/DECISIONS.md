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
| P3 | Camera | Optional, chosen per booking. Soft preference, same as Quiet: a camera-off user is matched with a waiting camera-off user first; if none, with a camera-on user, and the partner sees a "Camera off" badge (avatar + name shown). First set to "required" in this session, then reversed by the founder the same day | Spec #12 (camera was a hard filter) |
| P4 | Quiet mode | Soft preference. At booking, a Quiet user is matched with a waiting Quiet user first; if none is waiting, with a non-Quiet user, and the partner sees a "Quiet mode" badge | Spec #13 |
| P5 | Matching filters | **Hard:** same start, same duration, not blocked (either way), account active, same gender if either side asked. **Soft:** camera on/off, Quiet, Desk/Walk. **Priority:** favorites | Spec §5.2 |
| P6 | Match timing | A match locks at booking. The partner only changes if they cancel or no-show. T-10 relax for "flexible" bookings now only drops same-gender | Spec §5.3 |
| P7 | No-show | Rematch offered at T+1 min. Solo session offered at T+3 (no quota, no strike). Absent user marked NO_SHOW + 1 strike at T+5 | Spec §5.3–5.4 |
| P8 | Room tools (v1) | Goal + check-out (tasks done, 1–5 rating), report & block, text chat (LiveKit data channel), task list (≤ 10), screen share (opt-in, never auto-start) | — |
| P9 | Sign-in | Email + password (verified) and Google only. No phone OTP or Facebook, not even after the beta | Spec #20 |
| P10 | Minors | No age restriction (founder's decision). **Accepted risk**, see Risks | — |

### Technical

| # | Area | Decision | Overrides |
|---|---|---|---|
| T1 | Hosting | One server, one IP, one domain. Subdomains allowed. Provider and region chosen before the beta (see Open questions) | Spec #31 |
| T2 | Backend | One REST backend: `apps/api` (controller → service → repository). Delete `apps/server`, `packages/api` (oRPC wrapper) and `packages/db` (empty scaffold) | Better-T-Stack scaffold |
| T3 | API contracts | All Zod input **and** response schemas live in `packages/shared-types`. Web calls the API through one typed fetch helper, no hand-written types in hooks | — |
| T4 | Auth | Migrate to Better Auth now, before other features. Remove the custom JWT code (it has a hard-coded fallback secret, and verification emails are never sent). **Done 2 Oct 2026** on `feat/better-auth` (PR 1 of 2); see T12–T15 | Current code |
| T5 | Jobs | pg-boss: jobs stored in Postgres (own `pgboss` schema), retries, backoff and schedules built in. Jobs are queued right after the booking is saved, outside the Prisma transaction (no raw SQL), so every handler re-checks booking state and a reconcile step re-creates missing jobs at worker startup and every 15 minutes. Redis and BullMQ are removed when the workers are rewritten in week 6. Compared on 2 Oct against keeping BullMQ and a custom Postgres scheduler: pg-boss needs no extra service and less of our own code | BullMQ code (matches spec v1 §9.1) |
| T6 | Realtime | Keep socket.io for match, rematch and in-app notifications. Email + Web Push when the tab is closed | Spec §9.2 (polling) |
| T7 | Join/leave truth | LiveKit webhooks (signature-verified) record who joined and left. No-show and strike logic uses them, never the browser's word | — |
| T8 | Video quality | Dynamic: VP8 simulcast with 3 layers (about 180p / 360p / 720p), `adaptiveStream` + `dynacast` on, so each partner gets what their connection can handle. "Data saver" user setting caps the user's video at 360p. Full HD both ways can reach ~1.3 GB per 50-min session | Old preset: 540p30, 1.5 Mbps, VP9 |
| T9 | Payments | Paymob (Egypt) + an international card provider (TBD). Never Stripe (it doesn't support Egypt-based merchants). Built after the beta | AGENTS.md (Stripe) |
| T10 | Database | Create a baseline Prisma migration from the current schema. `db push` is not allowed from then on | — |
| T11 | Backups | Not now. **Revisit before beta invites go out** | — |
| T12 | Auth: users | Better Auth reuses our `User` table (`name` → `displayName`, `image` → `avatarUrl`); login sessions live in `AuthSession` (our `Session` is the focus session). Usernames are generated by the server, never asked at sign-up (the spec says onboarding is name + photo only). Sessions last 7 days; the middleware bypasses the 15-minute cookie cache so a revoked session, ban or deactivation applies at once | — |
| T13 | Auth: verified email | A verified email is required to **book and to join a session**. Login stays open, so unverified users can still see the dashboard. Google sign-ups count as verified | Spec §6.3 ("before the first session") made stricter |
| T14 | Auth: email | Verification and reset emails go through Resend. No Resend account yet: in development they are printed in the API log. **A sending domain and Resend key are required before beta invites** (the verified-email gate would lock beta users out otherwise) | — |
| T15 | Auth: tests | `bun run test:integration` runs the real flows (sign-up, verify, sign-in/out, reset, ban, rate limit) against a real `focusup_test` database. Not in the pre-commit hook | — |

### Core: booking and matching (M)

| # | Area | Decision | Overrides |
|---|---|---|---|
| M1 | Core: scope | Booking + matching v2 ships in two PRs: backend (schema, rules, strikes, favorites, real-database tests) first, then the UI (booking options, badges, hide-photo, strike screens) | — |
| M2 | Desk/Walk | Included now as a soft preference (it orders candidates, never blocks a match) | Spec #14 confirmed |
| M3 | Same-gender | **Deferred until after the beta.** No gender field, no hard filter, no T-10 relax step for now | Spec #17, #18, §5.2, §5.3 |
| M4 | Free quota | 6 sessions per Monday-Sunday week in the user's timezone is built (`QUOTA_ENFORCED`), but **switched off during the beta** and turned on with payments at launch | Spec §5.1 timing |
| M5 | Matching rules | Hard: same start and duration, not blocked either way, partner active, not banned, not suspended. Soft ordering: favorite, same camera, same Quiet, same Desk/Walk, longest wait. Match locks at booking. Concurrent bookings are serializable and retried a fixed 3 times | Spec §5.2 (camera and Quiet as hard filters) |
| M6 | Strikes | `Strike` records (no counter). A strike comes from a no-show, a late cancel (under 1 hour) or an admin. 5 inside a rolling 30 days suspend the account for 3 days (signing in still works). A booking earns at most one strike per reason. Permanent bans stay an admin action only | Old rule: permanent ban at 5 |
| M7 | Booking limits | At most 14 days ahead and 3 upcoming bookings; no overlap with your own bookings. Cancelling a matched booking at least 1 hour ahead is free (session given back); later is a strike and still counts | — |
| M8 | Bug fixed | A cancelled booking used to block rebooking the same slot (unique key on user, slot and duration). Replaced by an index plus a transactional overlap check | — |

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
                                      worker container (same image, pg-boss workers)
rtc.example.com       → Caddy       → LiveKit signaling (WSS)
turn.example.com:443  → Caddy layer4 (SNI routing) → LiveKit TURN/TLS
UDP + TCP 7881        → LiveKit media (direct)
Postgres 17           → internal network only (no Redis)
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
| 4–5 | 26 Oct–6 Nov | Session room: dynamic video + Data saver, goal/check-out, chat, tasks, screen share, report & block, LiveKit webhooks, reconnect, rematch T+1 / solo T+3 |
| 6 | 9–13 Nov | Jobs + notifications: pg-boss replaces BullMQ (Redis removed); reminders (email + .ics + push), T-10 relax, no-show at T+5, strikes, reconcile. Server + domain live |
| 7 | 16–20 Nov | Dashboard (stats, streak, history), admin reports queue, analytics events, connection tests on Egyptian networks → **beta Fri 20 Nov** |

## Open questions

| Question | Needed by |
|---|---|
| Server provider + region, and the domain name | ~9 Nov (beta needs a live server) |
| Backups (T11) | Before beta invites |
| Resend account + sending domain (T14); needed so verification and reset emails reach beta users | Before beta invites |
| Google OAuth credentials (create the client in Google Cloud Console) to test Google sign-in end to end | Before beta |
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
