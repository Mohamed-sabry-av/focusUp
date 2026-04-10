---
name: focusup-sessions
description: "FocusUp session lifecycle — booking flows, matching engine, state machine, timer, goals, reflections. Use when building session features, matching logic, booking UI, or session room components."
---

# FocusUp Sessions & Matching

## Session State Machine
```
PENDING → CONFIRMED → ACTIVE → COMPLETED
                    ↘ CANCELLED
                    ↘ NO_SHOW
```

### State Transition Rules
| From | To | Trigger |
|------|----|---------|
| PENDING | CONFIRMED | Second user matched / direct booking confirmed |
| CONFIRMED | ACTIVE | Both users joined LiveKit room |
| CONFIRMED | CANCELLED | User cancels (≥1h notice) |
| CONFIRMED | NO_SHOW | One user absent at T+5min (BullMQ job) |
| ACTIVE | COMPLETED | Timer ends OR both users leave |

**Critical:** No-show detection at T+5min via BullMQ scheduled job — NEVER on disconnect event.

## Three Booking Flows

### Flow A — Slot Booking & Auto-Pairing (Primary)
1. User opens booking calendar
2. Selects duration (25 / 50 / 75 min)
3. Picks slot (every 15 minutes)
4. System creates booking request
5. Checks for unmatched bookings in same slot + duration
6. **Match found** → create Session, mark both matched, notify both
7. **No match** → booking stays PENDING ("Waiting for partner")

### Flow B — Cal.com Scheduled Booking
1. User visits `/schedule` or shares Cal.com link
2. Partner picks time on Cal.com embed
3. Cal.com fires `BOOKING_CREATED` webhook
4. API creates Session, links both users
5. Email + dashboard card + Google Calendar invite

### Flow C — Direct Partner Booking
1. Visit `/profile/[username]`
2. Click "Book a Focus Session"
3. Select available slot from their calendar
4. System creates CONFIRMED session directly
5. Both notified with email + calendar invite

## Matching Engine Architecture

### Algorithm (MVP — Simple Slot Pairing)
```typescript
async function matchBooking(newBooking: BookingRequest) {
  // 1. Find earliest unmatched booking in same slot + duration
  const match = await prisma.session.findFirst({
    where: {
      scheduledAt: newBooking.scheduledAt,
      durationMin: newBooking.durationMin,
      status: "PENDING",
      user2Id: null,
      // Exclude blocked users
      user1Id: { notIn: await getBlockedUserIds(newBooking.userId) },
      user1: { isActive: true, isBanned: false },
    },
    orderBy: { createdAt: "asc" },
  });

  if (match) {
    // 2. Pair both users
    await prisma.session.update({
      where: { id: match.id },
      data: {
        user2Id: newBooking.userId,
        status: "CONFIRMED",
      },
    });
    // 3. Notify both users
    await notifyBothUsers(match.id);
    return match;
  }

  // 4. No match — create pending session
  return prisma.session.create({
    data: {
      user1Id: newBooking.userId,
      scheduledAt: newBooking.scheduledAt,
      durationMin: newBooking.durationMin,
      livekitRoomName: generateSessionId(),
      status: "PENDING",
    },
  });
}
```

### Matching Rules
- Same time slot + same duration required
- No block relationship between users (bidirectional check)
- Both users must be `isActive: true` and `isBanned: false`
- Categories are for context only — NOT used for matching in MVP
- Odd number of bookings → extra user stays PENDING

## Free Tier Enforcement
```typescript
// Check BEFORE creating booking — NEVER after
const weekStart = startOfWeek(new Date());
const weeklyCount = await prisma.session.count({
  where: {
    OR: [{ user1Id: userId }, { user2Id: userId }],
    status: { not: "CANCELLED" },
    scheduledAt: { gte: weekStart },
  },
});
if (user.planTier === "FREE" && weeklyCount >= 3) {
  throw new ORPCError("FORBIDDEN", { message: "Free tier: 3 sessions/week limit reached" });
}
```

## Live Session Room (`/session/[id]`)

### Entry Rules
- Only booked participants can enter (user1Id or user2Id)
- "Join Session" button activates at scheduled start time
- Verify via server before issuing LiveKit token

### Session Flow
1. **Goal Setting Modal** — 15s timeout → auto-dismissed
   - Text input: "What will you work on?"
   - Saved to `session.user1Goal` / `session.user2Goal`
2. **Focus Phase** — Timer counts down from session duration
   - Video UI: partner tile (main), self tile (bottom-right)
   - Controls: mute, camera, screen share (opt-in), leave
   - 5-min warning toast notification
3. **Reflection Modal** — On session end
   - Text input: "How did it go?"
   - Optional 1–5 star self-rating
   - Saved as Reflection record

### No-Show Detection (BullMQ)
```typescript
// Schedule job when session reaches CONFIRMED
await noShowQueue.add("check-no-show", { sessionId }, {
  delay: (scheduledAt.getTime() + 5 * 60 * 1000) - Date.now(),
  jobId: `no-show-${sessionId}`,
});

// Worker
noShowWorker.process(async (job) => {
  const session = await prisma.session.findUnique({ where: { id: job.data.sessionId } });
  if (session?.status === "CONFIRMED") {
    // Neither user joined within 5 min
    await prisma.session.update({
      where: { id: session.id },
      data: { status: "NO_SHOW" },
    });
    // Increment strike for absent user(s)
    // After 3 strikes → account warning
  }
});
```

## Dashboard Components
- **Upcoming sessions** — next 7 days, with "Join" button
- **Book new session** CTA → matching queue OR Cal.com page
- **Session history** — completion status + reflection snippets
- **Weekly stats** — sessions completed, focus hours, streak
- **Partner history** — previous partners with reconnect option
- **Free tier indicator** — "X / 3 sessions used this week"
