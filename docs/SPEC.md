# FocusUp — Product & Technical Spec (MVP v1.1)

Working name · Version 1.1 · 2 October 2026 · Supersedes v1 (1 October 2026)

Items changed in v1.1 are marked **[v1.1]**. The reasons are logged in `docs/DECISIONS.md`.

## 0. Summary (read this first)

- **What:** A web app where people book a 1:1 virtual co-working session (25 / 50 / 75 min) with a partner, so both actually start and finish their work. Body doubling, with the Focusmate experience.
- **For whom:** university students, high-school students, freelancers and remote employees in the Arab world. Entry channels: NTI, ITIDA, university groups, freelancer communities, social content.
- **Why us vs Focusmate:** cheaper with local payment, a more generous free tier (6 sessions/week), camera optional (unlike Focusmate), a "hide my photo" privacy option, built for Arab users (Arabic in v2).
- **MVP shape:** web only, English UI, scheduled booking only, 1:1 only. **[v1.1]** Built on the existing focusUp repo: Next.js 16 + Express REST (`apps/api`) + Prisma + PostgreSQL 17 + self-hosted LiveKit, all on one server with one domain. No Redis.
- **Success at 3 months after launch:** 100 weekly active users (WAU = users who completed ≥ 1 session that week).
- **Owner & capacity:** solo founder, 20+ hours/week, infra budget < $50/month.
- **Timeline [v1.1]:** closed beta (no payments) on **Friday 20 November 2026**. Payments and hardening follow; public launch date decided after the mid-December beta review.

Legend used in this doc:

- **[D]** decision made by the founder.
- **[A]** assumption or default chosen to fill a gap. Change it if wrong.
- **[R]** recommendation, not yet confirmed.
- **[OPEN]** must be decided before the related milestone.
- **[v1.1]** changed or added on 2 October 2026.

## 1. Decision log

| # | Topic | Decision | Type |
|---|---|---|---|
| 1 | Product name | Not decided. "FocusUp" is the working name | [OPEN] |
| 2 | Target users | University students, high-school students, freelancers, remote employees, all at equal priority | [D] |
| 3 | NTI / ITIDA | Partnership or sponsorship, not a paying B2B customer | [D] |
| 4 | Market | Arab world | [D] |
| 5 | Language | English first, Arabic later | [D] |
| 6 | Project goal | Side project that can grow into a business | [D] |
| 7 | Team / time / budget | Solo · 20+ h/week · < $50/month infra | [D] |
| 8 | Session format | 1:1 only | [D] |
| 9 | Durations | 25, 50, 75 minutes | [D] |
| 10 | Booking | Scheduled only (no instant "Focus Now") | [D] |
| 11 | Booking horizon | Up to 14 days ahead | [D] |
| 12 | Camera | **[v1.1]** Optional, chosen per booking. Soft preference: a camera-off user is matched with a waiting camera-off user first; if none, with a camera-on user, and the partner sees a "Camera off" badge (avatar + name shown) | [D] |
| 13 | Quiet mode | **[v1.1]** Soft preference. A Quiet user is matched with a waiting Quiet user first; if none, with a non-Quiet user, and the partner sees a "Quiet mode" badge. Quiet users cannot unmute | [D] |
| 14 | Desk / Walk | Session type labels kept as in Focusmate. Soft preference | [A] confirm |
| 15 | Mic during focus | Optional (user decides) | [D] |
| 16 | Start / end ritual | Written goal + optional short voice check-in, and the same at the end | [D] |
| 17 | Matching extras | Favorites first. **[v1.1]** Same-gender matching is deferred until after the beta | [D] |
| 18 | No partner found | **[v1.1]** Rematch offered at T+1 → solo session at T+3 (no quota, no strike). The T-10 relax step only applied to same-gender, so it waits with that feature | [D] |
| 19 | Strikes | Lighter policy: 5 strikes in 30 days → 3-day suspension | [D] |
| 20 | Sign-up | **[v1.1]** Email + password and Google only. No phone (OTP) or Facebook sign-in | [D] |
| 21 | Onboarding | Name + photo only | [D] |
| 22 | Reports | Manual admin review + auto-suspend on threshold + user block | [D] |
| 23 | Minors | Allowed with no special restrictions. Accepted risk, see §12 | [D] |
| 24 | Monetization | Free + subscription; free = 6 sessions/week | [D] |
| 25 | Price | Not decided | [OPEN] |
| 26 | Payments | International card (USD) for everyone + local methods (Egypt first). Never Stripe | [D] |
| 27 | Platform v1 | Web only | [D] |
| 28 | Mobile later | Android + iOS together (cross-platform) | [D] |
| 29 | Notifications v1 | Email, in-app, Web Push | [D] |
| 30 | Cal.com | Removed. Booking is built in-app; .ics file attached to emails | [D] |
| 31 | Hosting | **[v1.1]** One server, one IP, one domain; subdomains allowed. Provider and region not chosen yet | [D] / [OPEN] |
| 32 | In-session tools | Text chat, screen share (opt-in), task list, instant report & block | [D] |
| 33 | Dashboard | Upcoming sessions, book CTA, stats + streak, favorites, history, free-quota meter. Public profile in v2 | [D] |
| 34 | Success metric | 100 WAU three months after launch | [D] |
| 35 | Spec format | English, Word + Markdown | [D] |
| 36 | Calendar visibility | **[v1.1]** Booked slots show other users' first name + photo. "Hide my photo" setting shows initials instead | [D] |
| 37 | Match timing | **[v1.1]** A match locks at booking. The partner changes only on cancel or no-show | [D] |
| 38 | Video quality | **[v1.1]** Dynamic: adapts to each connection, up to 720p. "Data saver" setting caps it at 360p | [D] |
| 39 | Backend shape | **[v1.1]** One REST backend (`apps/api`). oRPC scaffold removed | [D] |
| 40 | Auth library | **[v1.1]** Better Auth, migrated before other features | [D] |
| 41 | Background jobs | **[v1.1]** pg-boss (job queue stored in Postgres). No Redis. A reconcile step re-creates any missing job at startup and every 15 minutes | [D] |
| 42 | Realtime | **[v1.1]** socket.io + Web Push (replaces polling) | [D] |
| 43 | Backups | **[v1.1]** Not now. Revisit before beta invites | [OPEN] |
| 44 | Closed beta | **[v1.1]** Friday 20 November 2026, no payments | [D] |
| 45 | Beta success | **[v1.1]** See §11.1 | [D] |

## 2. Users & core use cases

### 2.1 Personas

| Persona | Typical moment | What they need |
|---|---|---|
| University student | Evening study block before exams | Someone "there" so they start; low cost |
| High-school student | Long revision days | Same as above, plus safety (see §12) |
| Freelancer | Morning deep-work block for a client deliverable | Reliable partner, flexible times, focus on output |
| Remote employee | Afternoon slump at home | Structure and a reason to stay on task |

### 2.2 Core user stories (MVP)

- As a user, I book a 50-min session for tomorrow at 20:00, and the system finds me a partner.
- **[v1.1]** As a user, I see who is already booked on the calendar, so I pick times where I'll get a partner.
- **[v1.1]** As a user, I choose camera on/off and Quiet mode, so I'm matched with people who chose the same when possible, and my partner sees a badge when our choices differ.
- **[v1.1]** As a user, I can hide my photo from the calendar and show initials instead.
- **[v1.1]** As a user on mobile data, I turn on Data saver so sessions use less data.
- As a user, I join the room, write my goal, optionally say hi, work, then mark what I finished.
- As a user, if my partner doesn't show, I'm rematched or I continue solo, and I'm not punished.
- As a user, I add a good partner to favorites and get matched with them first next time.
- As a user, I report or block a partner instantly if something is wrong.
- As a user, I see my hours, sessions and streak on my dashboard.
- As a free user, I can do 6 sessions per week; after that I'm asked to subscribe.
- As the admin, I review reports, suspend or ban users, and see basic usage numbers.

## 3. Scope

### 3.1 In MVP (v1)

| Feature | Closed beta (20 Nov) | Public launch |
|---|---|---|
| Sign-up/login: email + password (with email verification), Google | Yes | Yes |
| Onboarding: display name + photo; timezone auto-detected from the browser | Yes | Yes |
| Booking calendar: 14 days, 15-minute start slots, 25/50/75 min, booked people shown | Yes | Yes |
| Booking options in the sidebar: duration, My Task (Desk / Moving / Anything), Quiet Mode, Prefer Favorites. The camera is chosen when joining the session, not when booking ("flexible" is stored for later) | Yes | Yes |
| Matching engine (§5): favorites first, blocks respected, locks at booking | Yes | Yes |
| Session room on LiveKit: video, audio, timer, goal, task list, text chat, opt-in screen share, report & block | Yes | Yes |
| No-show handling: rematch at T+1, solo fallback at T+3 (§5.4) | Yes | Yes |
| Strikes and suspensions (§6) | Yes | Yes |
| Dashboard: upcoming, book CTA, stats, streak, favorites, history, free-quota meter | Yes | Yes |
| Notifications: email (confirmation + reminder + .ics), in-app, Web Push | Yes | Yes |
| Free quota enforcement (6/week) + paid plan; international card + Egypt local methods | No | Yes |
| Admin panel: reports queue, user actions, basic metrics | Yes | Yes |
| Legal pages: Terms, Privacy, Community rules; cookie notice | Yes | Yes |
| Product analytics events (§11) | Yes | Yes |

### 3.2 Not in MVP (v2+)

- Arabic UI (RTL). Build v1 i18n-ready [R].
- Public profile page.
- Instant "Focus Now" matching.
- Group sessions.
- Verified focus hours / certificate.
- Exam marathon mode.
- AI assistant (task breakdown, weekly summary).
- Mobile apps (Android + iOS).
- Partner dashboards for NTI / ITIDA.
- WhatsApp notifications.
- Local payment methods beyond Egypt.

## 4. Session experience

### 4.1 Timeline (50-min example)

| Time | What happens |
|---|---|
| T-24h / T-1h / T-10m | Reminders (email + Web Push) |
| T-5m | "Join" button becomes active |
| T0 → T+2m | Check-in: each user writes a goal (visible to partner). Optional task list (voice hello: v2) |
| T+1m | **[v1.1]** Partner not here yet → rematch offered if another compatible user is available |
| T+3m | **[v1.1]** Still no partner → solo session offered (timer, no quota, no strike) |
| T+5m | Absent user marked NO_SHOW + 1 strike |
| T+2m → T+45m | Focus: camera per booking choice, mic optional (Quiet = mic disabled) |
| T+45m | 5-minute warning |
| T+45m → T+50m | "Keep going 15 min" can be chosen (per person, up to twice) |
| T+48m → T+50m | Check-out: tick tasks done, short reflection, 1–5 rating of the session (voice wrap-up: v2) |
| T+50m | Session ends. Room closes at T+52m (grace) |

25 and 75-minute sessions scale the same way: check-in 2 min, check-out 2 min.

### 4.2 Room features

| Feature | Rule |
|---|---|
| Video | Per booking: camera on/off. Camera-off users show avatar + name. **[v1.1]** When choices differ, the camera-on partner sees a "Camera off" badge |
| Video quality | **[v1.1]** Dynamic. Each user sends 3 simulcast layers (about 180p / 360p / 720p). LiveKit gives the partner the layer their connection can handle and switches live (adaptive stream); layers nobody watches stop being encoded (dynacast). "Data saver" caps the user's video at 360p, about a quarter of the data of full HD (which can reach ~1.3 GB per 50-min session, send + receive). VP8 for the widest device support [A] |
| Mic | Optional; Quiet users cannot unmute (the server refuses the microphone in their token). **[v1.1]** Partner of a Quiet user sees a "Quiet mode" badge |
| Text chat | LiveKit data channel. [A] Not stored after the session (privacy); last 50 messages attached to a report if one is filed |
| Screen share | Opt-in per session, never auto-start |
| Task list | Up to 10 tasks per person per session; private (the partner sees only the goal) |
| Keep going | One tap adds 15 minutes for that person only; the partner may leave at the normal end. Up to twice. No quota, no strike |
| Report & block | One click: ends the session, files a report with the last 50 chat lines, blocks both ways. No automatic strike |
| Reconnect | One automatic reconnect; 2-minute grace before the user is counted as left |
| Presence | **[v1.1]** Joins and leaves come from LiveKit webhooks (signature-verified), never from the browser |

### 4.3 Recording

No audio/video recording, ever, in v1. This is stated in the Privacy Policy.

## 5. Booking & matching

### 5.1 Booking rules

- Start times every 15 minutes, up to 14 days ahead.
- Max 3 future bookings at the same time per user [A].
- Free quota: 6 counted sessions per week (Mon–Sun in the user's timezone) [A on week definition]. Checked before creating a booking. **[v1.1]** Enforced from public launch, together with payments.
- A session counts toward quota when booked; it is refunded if the user cancels ≥ 1h before, or if the session ends as solo / partner no-show.

### 5.2 Matching key

Two bookings are compatible when all hard filters match:

| Filter | Type |
|---|---|
| Same start time | Hard |
| Same duration | Hard |
| Not blocked in either direction | Hard |
| Both active, not suspended/banned | Hard |
| **[v1.1]** Camera on/off | Soft: prefer the same choice; a cross-match shows the "Camera off" badge |
| **[v1.1]** Quiet | Soft: prefer Quiet with Quiet; a cross-match shows the "Quiet mode" badge |
| Desk / Moving / Anything | Soft (prefer same; **Anything fits everybody**) |
| Favorite | Priority (match favorites first) |

**[v1.1]** Order among compatible waiting bookings [A]: favorites (only if the person booking has **Prefer Favorites** on, which is the default) → same camera choice → same Quiet choice → same task → oldest booking.

**[v1.1]** Same-gender matching is deferred until after the beta: no gender field is stored and no hard filter exists yet. When it returns, gender is asked only the first time someone turns it on.

With camera and Quiet as soft preferences, each start time has only 3 pools (one per duration), v1 had 12.

### 5.3 When matching runs

- **On booking:** look for a compatible pending booking in the order above. If found → create the session and notify both. **[v1.1]** The match is locked.
- **[v1.1] Waiting:** if no one is found, the booking waits and is matched when a compatible user books the same slot.
- **T-10 minutes:** nothing to relax yet (the T-10 step only dropped the same-gender filter, which is deferred).
- **[v1.1] T+1 minute:** users whose partner hasn't joined, and still-unmatched users, are offered a rematch with another available compatible user.
- **[v1.1] T+3 minutes:** still no partner → solo offer.

### 5.4 No partner / no-show

| Situation | Result |
|---|---|
| No match by T+3m | Offer solo session with timer. Not counted in quota, no strike |
| Partner absent at T+1m | **[v1.1]** Rematch: if another person is also waiting alone for the same time and length (and you have not blocked each other), you are paired; otherwise solo offer at T+3m. The absent partners still get their strike at T+5m |
| User never joins by T+5m | Booking marked NO_SHOW → 1 strike |
| Partner joins late after a rematch | Show "your partner was rematched" + offer rematch / solo |

### 5.5 Cancellation

| When | Result |
|---|---|
| ≥ 1h before start | Free cancel, quota refunded, partner rematched automatically |
| < 1h before start | Allowed but = 1 strike; partner goes back to waiting and is rematched if possible |

## 6. Trust & safety

### 6.1 Strikes

- 1 strike = no-show or late cancel (< 1h).
- 5 strikes within a rolling 30 days → 3-day suspension (can't book).
- Strikes are immutable records; they simply age out after 30 days.

### 6.2 Reports & blocks

- Report reasons: no-show, inappropriate behavior, harassment, spam, other (+ free text).
- Every report also blocks both ways automatically.
- Auto-suspend [A]: 3 reports from 3 different users within 30 days → account suspended until admin review.
- Admin actions: dismiss, warn, suspend X days, ban.

### 6.3 Identity

- Email verification required before the first session (email sign-ups).
- **[v1.1]** No phone or Facebook sign-in. Accounts are email + password (verified) or Google.

### 6.4 Privacy [v1.1]

- "Hide my photo" setting: the calendar and partner previews show initials instead of the photo. The photo still shows inside a matched session.

## 7. Dashboard & account

### 7.1 Dashboard (MVP)

- Upcoming sessions (next 14 days) with status: waiting for partner / matched / starting soon.
- "Book a session" CTA and the calendar with booked people shown.
- Stats: total focus hours, sessions completed, this week vs last week.
- Streak (consecutive days with ≥ 1 completed session).
- Free quota meter: "4 / 6 sessions used this week".
- Favorites list.
- History: past sessions with goal, tasks done, rating.

### 7.2 Settings

Name, photo, **[v1.1]** hide my photo, **[v1.1]** Data saver, timezone, notification preferences, linked login methods, subscription & billing, data export, account deletion.

## 8. Monetization

| Plan | What you get | Price |
|---|---|---|
| Free | 6 sessions/week, all MVP features | $0 |
| Plus (monthly / yearly) | Unlimited sessions | [OPEN] |

- **Timing [v1.1]:** built after the closed beta, live at public launch.
- **International cards (USD):** one provider for all countries. [OPEN] provider choice. Stripe is not available to Egypt-based merchants; options to evaluate: Paymob international card acceptance, Paddle or Lemon Squeezy (merchant of record), or a foreign entity later.
- **Egypt local:** Paymob (cards + mobile wallets). [R] Recurring billing on Paymob is card-based, so wallet payments are sold as prepaid periods (1 or 3 months) instead of auto-renew.
- Webhooks update Subscription.status (signature-verified). Downgrade happens at period end.

## 9. Architecture [v1.1]

### 9.1 Components

| Layer | Choice | Notes |
|---|---|---|
| Web | Next.js 16 (App Router), Tailwind v4, shadcn/ui | `apps/web`, served with `next start` |
| API | Express 5 REST | `apps/api` is the only backend. Zod request and response schemas in `packages/shared-types` |
| Background jobs | pg-boss | Separate worker container from the same image. Jobs live in Postgres (own `pgboss` schema) with retries, backoff and schedules built in. Reconcile at startup + every 15 min |
| Database | PostgreSQL 17 + Prisma 7 | Migrations only, never `db push` |
| Auth | Better Auth | Email/password + Google only. httpOnly cookies |
| Realtime | socket.io | Match, rematch and in-app notifications |
| Video | LiveKit, self-hosted | Own Compose project so app deploys never restart it. TURN/TLS on port 443 |
| Email | Resend | Confirmation, reminders, .ics attachment |
| Push | Web Push (VAPID) + service worker | |
| Reverse proxy | Caddy | Automatic TLS; layer4 SNI routing for TURN |
| Analytics | [R] PostHog (free tier) | |
| Errors | [R] Sentry (free tier) | |

Removed from v1: Vercel, Railway, Supabase, LiveKit Cloud, polling-only realtime (pg-boss is kept). Removed earlier: Cal.com, Stripe. To be removed from the repo: Redis and BullMQ (the current workers in `apps/api/src/queues` and `apps/api/src/workers` are replaced by pg-boss in week 6). Removed from the repo: the oRPC scaffold (`apps/server`, `packages/api`) and the empty `packages/db`.

### 9.2 Deployment (one server)

```
example.com            → Caddy (TLS) → Next.js (apps/web)
example.com/api/*      → Caddy       → apps/api (REST, Better Auth, socket.io)
                                       worker container (pg-boss workers)
rtc.example.com        → Caddy       → LiveKit signaling (WSS)
turn.example.com:443   → Caddy layer4 (SNI) → LiveKit TURN/TLS
UDP + TCP 7881         → LiveKit media (direct)
Postgres 17            → internal network only
```

- The API sits under the same origin (`/api`) to avoid CORS and cross-site cookie problems.
- LiveKit config for production: real keys from env, `use_external_ip: true`, TURN enabled. The dev key and disabled TURN in `infrastructure/livekit/livekit.yaml` are for local use only.
- Provider and region [OPEN]: must be live by ~9 November for the beta.

### 9.3 Realtime

- socket.io pushes match, rematch and notification events; the web app invalidates TanStack Query caches when they arrive.
- When the tab is closed: Web Push + email.
- Inside the session, LiveKit handles media, presence and chat (data channel). LiveKit webhooks record joins and leaves on the server.

### 9.4 Background jobs (pg-boss) [v1.1]

Jobs are stored in Postgres, so they survive restarts and are included in database backups. They are queued right after the booking is saved, outside the Prisma transaction (no raw SQL), so every handler re-checks the booking before acting, and a reconcile step covers a crash between the two.

| Job | Trigger | Idempotency |
|---|---|---|
| reminder | T-24h, T-1h, T-10m per booking | Singleton key per booking + reminder; skipped if booking cancelled |
| no-show-check | T+5m: mark absent user NO_SHOW, add strike | Skipped unless booking is still MATCHED with no join |
| session-close | End + 2 min | Skipped if session already COMPLETED |
| send-email / send-push | Queued by the jobs above and by app events | pg-boss retries with backoff; failures stay visible |
| reconcile | Worker startup + every 15 min | Re-creates missing jobs for future bookings |

- **Rematch (T+1) and solo offer (T+3)** are triggered from the waiting user's room screen; the server checks the partner's presence from LiveKit webhooks before acting.
- **Suspension check** runs inline right after each new strike or report, not on a timer.

### 9.5 LiveKit rules

- Tokens generated server-side only, 2-hour TTL, in-memory on the client.
- Room name = session id. Simulcast (3 layers, up to 720p), adaptiveStream and dynacast on. Data saver caps the publisher at the 360p layer.
- Camera-off and Quiet enforced in the token's permissions (no camera / no microphone source).
- **[v1.1]** Webhooks are signature-verified and are the source of truth for join/leave; presence is stored in Postgres (`SessionParticipant`).

## 10. Data model (Prisma, simplified)

```prisma
model User {
  id             String     @id @default(cuid())
  email          String     @unique          // [v1.1] no phone sign-in
  name           String
  imageUrl       String?
  hidePhoto      Boolean    @default(false)  // [v1.1]
  dataSaver      Boolean    @default(false)  // [v1.1] caps video at 360p
  timezone       String     @default("UTC")
  // gender: added when same-gender matching returns (deferred past the beta)
  role           Role       @default(USER)   // USER / ADMIN
  status         UserStatus @default(ACTIVE) // ACTIVE / SUSPENDED / BANNED
  suspendedUntil DateTime?
  createdAt      DateTime   @default(now())
}

model Booking {             // one row per user per requested slot
  id            String        @id @default(cuid())
  userId        String
  startAt       DateTime
  durationMin   Int           // 25 / 50 / 75
  cameraOn      Boolean       // [v1.1] soft preference
  quiet         Boolean       // [v1.1] soft preference
  taskType      TaskType      // DESK / WALK ("Moving") / ANY ("Anything", the default)
  preferFavorites Boolean     @default(true)
  sameGender    Boolean       @default(false)
  flexible      Boolean       @default(true)
  status        BookingStatus // PENDING / MATCHED / CANCELLED / LATE_CANCELLED / NO_SHOW / SOLO / COMPLETED
  sessionId     String?
  goal          String?
  reflection    String?
  selfRating    Int?
  joinedAt      DateTime?
  leftAt        DateTime?
  countsToQuota Boolean       @default(true)
  relaxedAt     DateTime?     // [v1.1] T-10 relax done
  createdAt     DateTime      @default(now())

  @@index([startAt, durationMin, status])
  @@index([userId, startAt])
}

model FocusSession {        // the pair
  id          String        @id @default(cuid())
  startAt     DateTime
  durationMin Int
  status      SessionStatus // see note below
  livekitRoom String        @unique
  createdAt   DateTime      @default(now())
}

model SessionTask      { id String @id @default(cuid()); bookingId String; text String; done Boolean @default(false) }
model Favorite         { userId String; favoriteId String; createdAt DateTime @default(now()); @@id([userId, favoriteId]) }
model Block            { blockerId String; blockedId String; createdAt DateTime @default(now()); @@id([blockerId, blockedId]) }
model Report           { id String @id @default(cuid()); reporterId String; reportedId String; sessionId String?; reason ReportReason; details String?; chatSnapshot Json?; status ReportStatus @default(OPEN); createdAt DateTime @default(now()) }
model Strike           { id String @id @default(cuid()); userId String; bookingId String; reason StrikeReason; createdAt DateTime @default(now()) }
model Subscription     { id String @id @default(cuid()); userId String @unique; provider String; plan String; status SubStatus; currentPeriodEnd DateTime; createdAt DateTime @default(now()) }
model Notification     { id String @id @default(cuid()); userId String; type String; payload Json; readAt DateTime?; createdAt DateTime @default(now()) }
model PushSubscription { id String @id @default(cuid()); userId String; endpoint String @unique; keys Json }
```

Better Auth adds its own account, session and verification tables. pg-boss keeps its jobs in its own `pgboss` schema, outside Prisma's migrations.

**[v1.1] Note on the current schema:** `apps/api/prisma/schema.prisma` today uses `BookingRequest` + `Session` (user1/user2) and has no migrations yet. Moving to the model above happens in weeks 2–3 through new migrations. The `SessionStatus` and `PlanTier` enums may only change with the founder's explicit approval (AGENTS.md) [OPEN].

## 11. Metrics

| Metric | Definition | Use |
|---|---|---|
| WAU (north star) | Users with ≥ 1 completed session in the week | Target: 100 at launch + 3 months |
| Match rate | Bookings matched with a partner / all bookings | Liquidity health |
| Show-up rate | Bookings where the user joined / matched bookings | Reliability |
| No-show rate | NO_SHOW / matched bookings | Strike policy tuning |
| **[v1.1]** Connection success | Sessions where video connected within 10 s / sessions joined | Video reliability |
| Sessions per WAU | Completed sessions / WAU | Engagement |
| Week-4 retention | Users active in week 4 after sign-up | Habit |
| Free → paid | Paying users / users who hit the 6-session limit | Pricing |

Track events: signup_completed, booking_created, match_found, session_joined, session_completed, no_show, quota_limit_hit, checkout_started, subscription_activated, report_filed. **[v1.1]** Add video_connected (with time-to-connect) and rematch_offered.

### 11.1 Closed beta success [v1.1]

Checked in mid-December 2026:

| Signal | Target |
|---|---|
| Bookings that get a partner | ≥ 80% |
| Sessions where video connects within 10 s | ≥ 95% |
| Beta users who book a 2nd session within 7 days | ≥ 40% |

## 12. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Minors in 1:1 video with adult strangers (decision 23, accepted) | Legal (Egypt PDPL requires guardian consent for children's data), reputational, partner (NTI/ITIDA) and future app-store risk | Accepted for now. One-click report & block, auto-suspend, manual review. Revisit before partnerships, app stores and public launch |
| **[v1.1]** Video fails on restrictive networks | Users can't connect (Egyptian mobile carriers, university and office Wi-Fi) | TURN/TLS on port 443. Test from Vodafone, Orange, e& and WE before the beta |
| **[v1.1]** One server, no backups yet | Outage or data loss affects everyone | Decide backups before beta invites. Uptime monitor |
| Low liquidity (no partners at odd hours) | Users churn | v1.1 cuts pools from 12 to 3 per start time; calendar shows booked people; rematch + solo fallback; beta invites focused on peak hours |
| **[v1.1]** Server bandwidth | Video traffic exceeds the plan's allowance | Up to ~1.3 GB per 50-min HD session (less on weak connections or with Data saver); pick a plan with large included traffic |
| Harassment / inappropriate behavior | Safety | Instant report + block, auto-suspend, manual review |
| **[v1.1]** Screen share with strangers | Private info leaks or inappropriate content | Opt-in only, never auto-start, covered by report |
| Payments from Egypt | Can't use Stripe | Paymob + merchant-of-record provider evaluation |
| Egypt data protection law (compliance from Oct 2026) | Fines | Arabic + English consent, privacy policy, data export and deletion, data-transfer consent (server outside Egypt) |
| Brand: "Focusmate"-like names | Trademark | Pick a distinct name (decision 1) |

## 13. Milestones [v1.1]

| Weeks | Dates | Milestone | Done when |
|---|---|---|---|
| 1 | 5–9 Oct | Cleanup + auth | One backend, baseline migration, shared API contracts, type checks for api + web. Better Auth: email + Google, verification and reset through Resend |
| 2–3 | 12–23 Oct | Booking + matching v2 | New schema (preferences, Favorite, Strike, SessionTask, Notification, PushSubscription), matching per §5, calendar with booked people |
| 4–5 | 26 Oct–6 Nov | Session room | Dynamic video + Data saver, goal/check-out, chat, tasks, screen share, report & block, LiveKit webhooks, reconnect, rematch T+1 / solo T+3 |
| 6 | 9–13 Nov | Jobs + notifications + server | pg-boss replaces BullMQ (Redis removed). Reminders (email + .ics + push), T-10 relax, no-show T+5, strikes. Server and domain live |
| 7 | 16–20 Nov | Dashboard + admin → beta | Stats, streak, history, admin reports queue, analytics events, network tests. **Closed beta Friday 20 Nov** |
| After beta | From 23 Nov | Launch work | Payments (card + Paymob) and quota enforcement, fixes from beta, legal review. Public launch date set after the mid-December review |

## 14. Open questions

| Question | Needed by |
|---|---|
| Server provider + region, and the domain | ~9 November (beta needs a live server) |
| Backups (decision 43) | Before beta invites |
| Product name | Before buying the domain |
| Subscription price (and whether to price per country) | Before payments work |
| International card provider (Paymob international vs Paddle/Lemon Squeezy vs other) | Before payments work |
| Desk/Walk: soft preference or hard filter? (assumed soft) | Week 2 |
| SessionStatus / PlanTier enum changes for the new data model | Week 2 |
| **[v1.1]** Confirm pg-boss runs under Bun; otherwise run the worker container on Node | Week 6 |
| Minors policy | Before partnerships, app stores, public launch |
| What exactly NTI / ITIDA provide in the partnership (users, funding, branding) and what they get | Before beta invites |
| Chat retention: keep "not stored" or store for X days for safety? | Before beta |
| Week definition for the free quota (Mon–Sun local assumed) | Before payments work |
| Auto-suspend threshold for reports (3 assumed) | Before beta |

## Change log

| Version | Date | Changes |
|---|---|---|
| 1.0 | 1 Oct 2026 | First spec from the founder's grill session |
| 1.1 | 2 Oct 2026 | Focusmate experience (camera and Quiet as soft preferences with badges, booked people on calendar, lock at booking, rematch T+1 / solo T+3); sign-in = email + Google only; one-server hosting; REST-only backend, Better Auth, pg-boss (no Redis), socket.io; dynamic video up to 720p with Data saver; beta date and success criteria. Details in `docs/DECISIONS.md` |
| 1.1.1 | 3 Oct 2026 | Room details: keep going +15 min per person, voice notes moved to v2, re-match pairs two lonely people, report text is plain text. See `docs/DECISIONS.md` R1-R11 |
