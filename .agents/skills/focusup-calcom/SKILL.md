---
name: focusup-calcom
description: "FocusUp Cal.com self-hosted integration — Docker setup, webhook handling, embed, booking pages. Use when configuring Cal.com, handling webhooks, embedding booking UI, or managing event types."
---

# FocusUp Cal.com Integration

## Architecture
- Cal.com runs as a **separate Docker service** — NEVER couple its DB to ours
- Communication is **webhook-only** (Cal.com → our API)
- Store `calcomBookingId` on our Session model for idempotency

## Docker Compose Setup
```yaml
# infrastructure/docker-compose.yml
calcom:
  image: calcom/cal.com:latest
  environment:
    DATABASE_URL: ${CALCOM_DATABASE_URL}      # Separate DB from ours
    NEXTAUTH_URL: http://calcom:3000
    NEXTAUTH_SECRET: ${CALCOM_SECRET}
    CALENDSO_ENCRYPTION_KEY: ${CALCOM_ENCRYPTION_KEY}
  ports:
    - "3001:3000"
  depends_on:
    - calcom-db

calcom-db:
  image: postgres:17
  environment:
    POSTGRES_DB: calcom
    POSTGRES_USER: calcom
    POSTGRES_PASSWORD: ${CALCOM_DB_PASSWORD}
  volumes:
    - calcom_data:/var/lib/postgresql/data
```

## Webhook Events

### Payload Interface
```typescript
interface CalcomWebhookPayload {
  triggerEvent: "BOOKING_CREATED" | "BOOKING_CANCELLED" | "BOOKING_RESCHEDULED";
  payload: {
    uid: string;           // → our calcomBookingId
    startTime: string;     // ISO 8601
    endTime: string;
    duration: number;      // minutes
    organizer: { email: string };
    attendees: Array<{ email: string; name: string }>;
    metadata: { focusCategory?: string };
  };
}
```

### Webhook Handler (oRPC)
```typescript
// packages/api/src/routers/webhooks.ts
import { publicProcedure } from "../index";
import crypto from "crypto";

// Signature verification middleware
const calcomWebhookGuard = o.middleware(async ({ context, next }) => {
  const signature = context.req?.headers["x-cal-signature-256"] as string;
  const body = JSON.stringify(context.req?.body);
  const expected = crypto
    .createHmac("sha256", env.CALCOM_WEBHOOK_SECRET)
    .update(body)
    .digest("hex");

  if (signature !== expected) {
    throw new ORPCError("UNAUTHORIZED", { message: "Invalid webhook signature" });
  }
  return next();
});

export const webhooksRouter = {
  calcom: publicProcedure
    .use(calcomWebhookGuard)
    .handler(async ({ context }) => {
      const payload = context.req?.body as CalcomWebhookPayload;

      switch (payload.triggerEvent) {
        case "BOOKING_CREATED":
          return sessionsService.createFromCalcom(payload);
        case "BOOKING_CANCELLED":
          return sessionsService.cancelFromCalcom(payload.payload.uid);
        case "BOOKING_RESCHEDULED":
          return sessionsService.rescheduleFromCalcom(payload);
      }
    }),
};
```

### Idempotency Check
```typescript
async function createFromCalcom(payload: CalcomWebhookPayload) {
  // Check if already processed (prevents duplicate processing on webhook retry)
  const existing = await prisma.session.findUnique({
    where: { calcomBookingId: payload.payload.uid },
  });
  if (existing) return existing;

  // Look up users by email
  const organizer = await prisma.user.findUniqueOrThrow({
    where: { email: payload.payload.organizer.email },
  });
  const attendee = await prisma.user.findUniqueOrThrow({
    where: { email: payload.payload.attendees[0].email },
  });

  // Create CONFIRMED session (both users already known)
  return prisma.session.create({
    data: {
      user1Id: organizer.id,
      user2Id: attendee.id,
      durationMin: payload.payload.duration,
      scheduledAt: new Date(payload.payload.startTime),
      calcomBookingId: payload.payload.uid,
      livekitRoomName: cuid(),
      status: "CONFIRMED",
      category: payload.payload.metadata.focusCategory as Category | undefined,
    },
  });
}
```

## Frontend Embed (`/schedule`)

### Installation
```bash
cd apps/web && bun add @calcom/embed-react
```

### Booking Page Component
```tsx
"use client";
import Cal, { getCalApi } from "@calcom/embed-react";
import { useEffect } from "react";

export function BookingEmbed({ calcomUsername }: { calcomUsername: string }) {
  useEffect(() => {
    (async () => {
      const cal = await getCalApi({ namespace: "focus-session" });
      cal("ui", {
        theme: "dark",
        styles: { branding: { brandColor: "#6366f1" } },
        hideEventTypeDetails: false,
        layout: "month_view",
      });
    })();
  }, []);

  return (
    <Cal
      namespace="focus-session"
      calLink={calcomUsername}
      style={{ width: "100%", height: "100%", overflow: "scroll" }}
      config={{
        layout: "month_view",
        theme: "dark",
      }}
    />
  );
}
```

## User Registration → Cal.com Setup
On user registration:
1. Create Cal.com user via Cal.com API (or admin panel)
2. Create 3 event types: 25-min, 50-min, 75-min focus sessions
3. Store `calcomUserId` and `calcomUsername` on our User record
4. Configure webhook on Cal.com to point to our `/api/webhooks/calcom`

## Event Types Configuration
| Event Type | Duration | Slug |
|-----------|----------|------|
| Quick Focus | 25 min | `focus-25` |
| Standard Focus | 50 min | `focus-50` |
| Deep Focus | 75 min | `focus-75` |

## Business Rules
- Cancellation requires ≥1 hour notice to avoid strike
- Free tier: max 3 bookings/week enforced BEFORE Cal.com booking
- Partner can be specific user by username OR "any available" via queue
- Cal.com sends Google Calendar invite automatically

## Hard Rules
- NEVER couple Cal.com's DB to ours — separate PostgreSQL instances
- ALWAYS verify webhook signatures via HMAC (X-Cal-Signature-256)
- ALWAYS store `calcomBookingId` for idempotency
- Return 200 OK quickly from webhook handler — process async if heavy
- Communication is webhook-only — never query Cal.com's DB directly
