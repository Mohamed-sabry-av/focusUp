import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";

// ---------------------------------------------------------------------------
// ALL vi.mock() calls are hoisted by Vitest to the top of the module, so
// every mock declaration must appear before the real imports below.
// ---------------------------------------------------------------------------

vi.mock("ioredis", () => ({
  default: class {
    constructor() {}
  },
}));

vi.mock("bullmq", () => ({
  Worker: class {
    constructor() {}
    close = vi.fn(async () => {});
  },
}));

vi.mock("../queues/connection", () => ({ connection: {} }));

// ── Prisma ──────────────────────────────────────────────────────────────────
const { mockPrisma, mockNotificationService, mockEmailService } = vi.hoisted(
  () => ({
    mockPrisma: {
      session: {
        findUnique: vi.fn(),
      },
    },
    mockNotificationService: {
      notifySessionReminder: vi.fn(),
    },
    mockEmailService: {
      sendSessionReminder: vi.fn(),
    },
  }),
);
vi.mock("../lib/prisma", () => ({ prisma: mockPrisma }));

// ── NotificationService ─────────────────────────────────────────────────────
vi.mock("../services/notification.service", () => ({
  NotificationService: mockNotificationService,
}));

// ── EmailService ────────────────────────────────────────────────────────────
vi.mock("../services/email.service", () => ({
  EmailService: mockEmailService,
}));

// ---------------------------------------------------------------------------
// Real imports — resolved AFTER the mock registry is fully populated above.
// ---------------------------------------------------------------------------
import { processReminderJob } from "./reminder.worker";
import type { ReminderJobData } from "./reminder.worker";

// ---------------------------------------------------------------------------
// Shared types & helpers
// ---------------------------------------------------------------------------

type SessionStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "COMPLETED"
  | "NO_SHOW"
  | "CANCELLED";

interface FakeUser {
  id: string;
  email: string;
  displayName: string;
}

interface FakeSession {
  id: string;
  user1Id: string;
  user2Id: string | null;
  scheduledAt: Date;
  durationMin: number;
  status: SessionStatus;
  user1: FakeUser;
  user2: FakeUser | null;
}

function makeSession(overrides: Partial<FakeSession> = {}): FakeSession {
  return {
    id: "sess-001",
    user1Id: "user-1",
    user2Id: "user-2",
    scheduledAt: new Date("2025-01-01T10:00:00Z"),
    durationMin: 50,
    status: "CONFIRMED",
    user1: { id: "user-1", email: "u1@test.com", displayName: "User One" },
    user2: { id: "user-2", email: "u2@test.com", displayName: "User Two" },
    ...overrides,
  };
}

function makeJob(data: ReminderJobData): Job<ReminderJobData> {
  return { data } as unknown as Job<ReminderJobData>;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processReminderJob", () => {
  // ── 1. Session not found ─────────────────────────────────────────────────
  it("skips if session not found", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null);

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "24h" }));

    expect(
      mockNotificationService.notifySessionReminder,
    ).not.toHaveBeenCalled();
    expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled();
  });

  // ── 2. Session is CANCELLED ──────────────────────────────────────────────
  it("skips if session is CANCELLED", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(
      makeSession({ status: "CANCELLED" }),
    );

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "24h" }));

    expect(
      mockNotificationService.notifySessionReminder,
    ).not.toHaveBeenCalled();
    expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled();
  });

  // ── 3. Session is COMPLETED ──────────────────────────────────────────────
  it("skips if session is COMPLETED", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(
      makeSession({ status: "COMPLETED" }),
    );

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "24h" }));

    expect(
      mockNotificationService.notifySessionReminder,
    ).not.toHaveBeenCalled();
    expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled();
  });

  // ── 4. Session is NO_SHOW ────────────────────────────────────────────────
  it("skips if session is NO_SHOW", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(
      makeSession({ status: "NO_SHOW" }),
    );

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "24h" }));

    expect(
      mockNotificationService.notifySessionReminder,
    ).not.toHaveBeenCalled();
    expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled();
  });

  // ── 5. 24h reminder: WebSocket + emails to both users ───────────────────
  it("24h reminder: sends WebSocket + emails to both users", async () => {
    const session = makeSession();
    mockPrisma.session.findUnique.mockResolvedValue(session);
    mockNotificationService.notifySessionReminder.mockResolvedValue(undefined);
    mockEmailService.sendSessionReminder.mockResolvedValue(undefined);

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "24h" }));

    // WebSocket notification sent once with the full session + type
    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledTimes(
      1,
    );
    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledWith(
      session,
      "24h",
    );

    // Email sent to both participants
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledTimes(2);

    // user1 email — partner is user2
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledWith({
      to: "u1@test.com",
      partnerName: "User Two",
      sessionTime: session.scheduledAt,
      sessionId: "sess-001",
    });

    // user2 email — partner is user1
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledWith({
      to: "u2@test.com",
      partnerName: "User One",
      sessionTime: session.scheduledAt,
      sessionId: "sess-001",
    });
  });

  // ── 6. 24h reminder: single email when user2 is absent ──────────────────
  it("24h reminder: sends only one email if no user2", async () => {
    const session = makeSession({ user2Id: null, user2: null });
    mockPrisma.session.findUnique.mockResolvedValue(session);
    mockNotificationService.notifySessionReminder.mockResolvedValue(undefined);
    mockEmailService.sendSessionReminder.mockResolvedValue(undefined);

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "24h" }));

    // Only user1's email is sent — no user2 to notify
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendSessionReminder).toHaveBeenCalledWith({
      to: "u1@test.com",
      partnerName: "your partner",
      sessionTime: session.scheduledAt,
      sessionId: "sess-001",
    });
  });

  // ── 7. 5min reminder: WebSocket only, no email ───────────────────────────
  it("5min reminder: sends WebSocket only (no email)", async () => {
    const session = makeSession();
    mockPrisma.session.findUnique.mockResolvedValue(session);
    mockNotificationService.notifySessionReminder.mockResolvedValue(undefined);

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "5min" }));

    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledTimes(
      1,
    );
    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledWith(
      session,
      "5min",
    );
    expect(mockEmailService.sendSessionReminder).not.toHaveBeenCalled();
  });

  // ── 8. ACTIVE session is NOT skipped ─────────────────────────────────────
  it("ACTIVE session still gets reminder (session started, reminder is fine)", async () => {
    const session = makeSession({ status: "ACTIVE" });
    mockPrisma.session.findUnique.mockResolvedValue(session);
    mockNotificationService.notifySessionReminder.mockResolvedValue(undefined);

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "5min" }));

    // ACTIVE is not in the skip list — reminder must go through
    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledTimes(
      1,
    );
    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledWith(
      session,
      "5min",
    );
  });

  // ── 9. PENDING session is NOT skipped ────────────────────────────────────
  it("PENDING session still gets reminder", async () => {
    const session = makeSession({ status: "PENDING" });
    mockPrisma.session.findUnique.mockResolvedValue(session);
    mockNotificationService.notifySessionReminder.mockResolvedValue(undefined);
    mockEmailService.sendSessionReminder.mockResolvedValue(undefined);

    await processReminderJob(makeJob({ sessionId: "sess-001", type: "24h" }));

    // PENDING is not in the skip list — reminder must go through
    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledTimes(
      1,
    );
    expect(mockNotificationService.notifySessionReminder).toHaveBeenCalledWith(
      session,
      "24h",
    );
  });
});
