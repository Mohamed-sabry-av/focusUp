---
name: focusup-notifications
description: "FocusUp notification system — email (Resend), in-app (WebSocket), BullMQ queues, reminders. Use when implementing notifications, email templates, WebSocket events, scheduled jobs, or reminder logic."
---

# FocusUp Notifications

## Channels
| Channel | Technology | When |
|---------|-----------|------|
| Email | Resend SDK | Booking confirmations, reminders, no-show, warnings |
| In-App | WebSocket (Socket.IO / ws) | Real-time: match found, 5-min reminder, session updates |
| Google Calendar | Via Cal.com (automatic) | Booking created/cancelled/rescheduled |
| Browser Push | Post-MVP | Future enhancement |

## Event-to-Channel Matrix

| Event | Email | In-App | GCal |
|-------|-------|--------|------|
| Session booked | ✅ | ✅ | ✅ |
| Match found | ✅ | ✅ | — |
| 24h reminder | ✅ | ✅ | ✅ |
| 5-min reminder | — | ✅ | — |
| Partner no-show | ✅ | ✅ | — |
| Session completed | ✅ | ✅ | ✅ |
| Account warning | ✅ | ✅ | — |

## BullMQ Queue Architecture

### Installation
```bash
cd apps/server && bun add bullmq ioredis
```

### Queue Setup
```typescript
// apps/server/src/queues/index.ts
import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const redis = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });

// Notification queue
export const notificationQueue = new Queue("notifications", {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 500,
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

// Scheduled jobs queue (reminders, no-show checks)
export const scheduledQueue = new Queue("scheduled", {
  connection: redis,
});
```

### Scheduling Reminders
```typescript
// When a session is CONFIRMED, schedule reminders
async function scheduleSessionReminders(session: Session) {
  const scheduledTime = session.scheduledAt.getTime();

  // 24h reminder
  await scheduledQueue.add("reminder-24h", { sessionId: session.id }, {
    delay: scheduledTime - 24 * 60 * 60 * 1000 - Date.now(),
    jobId: `reminder-24h-${session.id}`,
  });

  // 5-min reminder (in-app only)
  await scheduledQueue.add("reminder-5min", { sessionId: session.id }, {
    delay: scheduledTime - 5 * 60 * 1000 - Date.now(),
    jobId: `reminder-5min-${session.id}`,
  });

  // No-show check at T+5min
  await scheduledQueue.add("check-no-show", { sessionId: session.id }, {
    delay: scheduledTime + 5 * 60 * 1000 - Date.now(),
    jobId: `no-show-${session.id}`,
  });
}
```

### Workers (Separate Process)
```typescript
// apps/server/src/workers/notification.worker.ts
import { Worker } from "bullmq";

const notificationWorker = new Worker("notifications", async (job) => {
  switch (job.name) {
    case "send-email":
      await sendEmail(job.data);
      break;
    case "send-in-app":
      await sendWebSocketNotification(job.data);
      break;
  }
}, {
  connection: redis,
  concurrency: 5,
});

const scheduledWorker = new Worker("scheduled", async (job) => {
  switch (job.name) {
    case "reminder-24h":
      await sendReminder24h(job.data.sessionId);
      break;
    case "reminder-5min":
      await sendReminder5min(job.data.sessionId);
      break;
    case "check-no-show":
      await checkNoShow(job.data.sessionId);
      break;
  }
}, { connection: redis });
```

## Email Templates (Resend)

### Installation
```bash
cd apps/server && bun add resend
```

### Email Service
```typescript
// packages/api/src/services/email.ts
import { Resend } from "resend";

const resend = new Resend(env.RESEND_API_KEY);

export async function sendSessionBookedEmail(params: {
  to: string;
  partnerName: string;
  scheduledAt: Date;
  duration: number;
  sessionId: string;
}) {
  await resend.emails.send({
    from: "FocusUp <sessions@focusup.app>",
    to: params.to,
    subject: `Focus session with ${params.partnerName} — ${format(params.scheduledAt, "MMM d, h:mm a")}`,
    html: renderSessionBookedTemplate(params),
  });
}

// Template types needed:
// - sessionBooked: Confirmation with partner name, time, duration
// - matchFound: Partner matched, session details
// - reminder24h: Tomorrow's session reminder
// - partnerNoShow: Apology + reschedule CTA
// - sessionCompleted: Summary + reflection prompt
// - accountWarning: Strike notice + policy link
```

## WebSocket Gateway (In-App Notifications)

### Server Setup
```typescript
// apps/server/src/websocket/index.ts
import { Server } from "socket.io";

export function setupWebSocket(httpServer: any) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN },
  });

  io.use(async (socket, next) => {
    // Authenticate WebSocket connection via JWT
    const token = socket.handshake.auth.token;
    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      next();
    } catch {
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    // Join user-specific room for targeted notifications
    socket.join(`user:${socket.data.userId}`);
  });

  return io;
}

// Send notification to specific user
export function sendToUser(io: Server, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
}
```

### Client Hook
```typescript
// apps/web/src/hooks/useNotifications.ts
"use client";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { toast } from "sonner";

export function useNotifications(token: string) {
  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token },
    });

    socket.on("match-found", (data) => {
      toast.success(`Matched with ${data.partnerName}!`);
    });

    socket.on("session-reminder", (data) => {
      toast.info(`Session starting in ${data.minutesUntil} minutes`);
    });

    socket.on("session-cancelled", (data) => {
      toast.warning("Your session has been cancelled");
    });

    return () => { socket.disconnect(); };
  }, [token]);
}
```

## Retry Strategy
- All notification jobs: 3 attempts with exponential backoff (1s, 2s, 4s)
- `removeOnComplete: 100` — keep last 100 completed jobs
- `removeOnFail: 500` — keep last 500 failed jobs for debugging
- Separate worker process from API server — crash isolation

## Hard Rules
- No-show detection: BullMQ scheduled job at T+5min — NEVER on disconnect
- WebSocket authenticated via JWT — same token as API
- Email via Resend only — no direct SMTP
- Schedule reminders when session reaches CONFIRMED state
- Cancel scheduled jobs when session is CANCELLED
- Lightweight job payloads — store only IDs, fetch full data in worker
