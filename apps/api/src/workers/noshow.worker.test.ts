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
const mockPrisma = {
  session: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
};
vi.mock("../lib/prisma", () => ({ prisma: mockPrisma }));

// ── Redis ───────────────────────────────────────────────────────────────────
const mockRedis = {
  smembers: vi.fn(),
};
vi.mock("../lib/redis", () => ({ redis: mockRedis }));

// ── NotificationService ─────────────────────────────────────────────────────
const mockNotificationService = {
  notifyNoShow: vi.fn(),
};
vi.mock("../services/notification.service", () => ({
  NotificationService: mockNotificationService,
}));

// ── EmailService ────────────────────────────────────────────────────────────
const mockEmailService = {
  sendStrikeWarning: vi.fn(),
  sendBanNotification: vi.fn(),
  sendPartnerNoShowNotification: vi.fn(),
};
vi.mock("../services/email.service", () => ({
  EmailService: mockEmailService,
}));

// ── Queue helpers ───────────────────────────────────────────────────────────
const mockRemoveJob = vi.fn();
vi.mock("../queues/helpers", () => ({
  removeJob: mockRemoveJob,
  scheduleNoshowCheck: vi.fn(),
  scheduleReminders: vi.fn(),
  scheduleBookingExpiry: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Real imports — resolved AFTER the mock registry is fully populated above.
// ---------------------------------------------------------------------------
import { processNoshowJob } from "./noshow.worker";
import type { NoshowJobData } from "./noshow.worker";

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
  status: SessionStatus;
  scheduledAt: Date;
  durationMin: number;
  user1: FakeUser;
  user2: FakeUser | null;
}

function makeSession(overrides: Partial<FakeSession> = {}): FakeSession {
  return {
    id: "sess-001",
    user1Id: "user-1",
    user2Id: "user-2",
    status: "CONFIRMED",
    scheduledAt: new Date("2025-01-01T10:00:00Z"),
    durationMin: 50,
    user1: { id: "user-1", email: "u1@test.com", displayName: "User One" },
    user2: { id: "user-2", email: "u2@test.com", displayName: "User Two" },
    ...overrides,
  };
}

function makeJob(data: NoshowJobData): Job<NoshowJobData> {
  return { data } as unknown as Job<NoshowJobData>;
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
});

describe("processNoshowJob", () => {
  // ── 1. Session not found ─────────────────────────────────────────────────
  it("skips if session not found", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.session.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // ── 2. Session already ACTIVE ────────────────────────────────────────────
  it("skips if session is ACTIVE", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(
      makeSession({ status: "ACTIVE" }),
    );

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.session.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // ── 3. Session already CANCELLED ─────────────────────────────────────────
  it("skips if session is CANCELLED", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(
      makeSession({ status: "CANCELLED" }),
    );

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.session.update).not.toHaveBeenCalled();
    expect(mockPrisma.user.update).not.toHaveBeenCalled();
  });

  // ── 4. Happy path: marks session NO_SHOW ─────────────────────────────────
  it("marks CONFIRMED session as NO_SHOW", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    mockPrisma.user.update.mockResolvedValue({ strikeCount: 1, isBanned: false });

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.session.update).toHaveBeenCalledWith({
      where: { id: "sess-001" },
      data: { status: "NO_SHOW" },
    });
  });

  // ── 5. Strike increments for both absent users ───────────────────────────
  it("increments strikeCount for absent users", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    // Both users absent — two separate increment calls expected
    mockPrisma.user.update.mockResolvedValue({ strikeCount: 1, isBanned: false });

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { strikeCount: { increment: 1 } },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-2" },
      data: { strikeCount: { increment: 1 } },
    });
  });

  // ── 6. Strike-warning email at strikeCount === 3 ─────────────────────────
  it("sends strike warning email when strikeCount reaches 3", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    // user-1 hits exactly 3 strikes; user-2 is at 1
    mockPrisma.user.update
      .mockResolvedValueOnce({ strikeCount: 3, isBanned: false }) // user-1 increment
      .mockResolvedValueOnce({ strikeCount: 1, isBanned: false }); // user-2 increment

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockEmailService.sendStrikeWarning).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendStrikeWarning).toHaveBeenCalledWith({
      to: "u1@test.com",
      strikeCount: 3,
    });
  });

  // ── 7. No warning email when strikeCount is not exactly 3 ────────────────
  it("does not send warning email when strikeCount is not 3", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    mockPrisma.user.update.mockResolvedValue({ strikeCount: 2, isBanned: false });

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockEmailService.sendStrikeWarning).not.toHaveBeenCalled();
  });

  // ── 8. Ban at strikeCount >= 5 ────────────────────────────────────────────
  it("bans user and sends ban email when strikeCount reaches 5", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    mockPrisma.user.update
      .mockResolvedValueOnce({ strikeCount: 5, isBanned: false }) // user-1 increment → triggers ban
      .mockResolvedValueOnce({ strikeCount: 5, isBanned: true })  // user-1 isBanned: true update
      .mockResolvedValueOnce({ strikeCount: 1, isBanned: false }); // user-2 increment

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { isBanned: true },
    });
    expect(mockEmailService.sendBanNotification).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendBanNotification).toHaveBeenCalledWith({
      to: "u1@test.com",
    });
  });

  // ── 9. Both absent users accumulate strikes ───────────────────────────────
  it("both absent users get strikes", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    mockPrisma.user.update.mockResolvedValue({ strikeCount: 1, isBanned: false });

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    // One increment call per absent user
    expect(mockPrisma.user.update).toHaveBeenCalledTimes(2);
    // No WebSocket or email notification — nobody was present to receive one
    expect(mockNotificationService.notifyNoShow).not.toHaveBeenCalled();
  });

  // ── 10. Present user notified of partner no-show ──────────────────────────
  it("notifies present user of partner no-show", async () => {
    const session = makeSession();
    mockPrisma.session.findUnique.mockResolvedValue(session);
    // user-1 joined; user-2 is absent
    mockRedis.smembers.mockResolvedValue(["user-1"]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    // Only user-2 gets a strike increment
    mockPrisma.user.update.mockResolvedValue({ strikeCount: 1, isBanned: false });
    mockNotificationService.notifyNoShow.mockResolvedValue(undefined);
    mockEmailService.sendPartnerNoShowNotification.mockResolvedValue(undefined);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockNotificationService.notifyNoShow).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.notifyNoShow).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sess-001" }),
      "user-1",
    );
    expect(mockEmailService.sendPartnerNoShowNotification).toHaveBeenCalledTimes(1);
    expect(mockEmailService.sendPartnerNoShowNotification).toHaveBeenCalledWith({
      to: "u1@test.com",
      sessionId: "sess-001",
    });
  });

  // ── 11. Reminder jobs cleaned up ─────────────────────────────────────────
  it("removes reminder jobs after marking no-show", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    mockPrisma.user.update.mockResolvedValue({ strikeCount: 1, isBanned: false });
    mockRemoveJob.mockResolvedValue(undefined);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockRemoveJob).toHaveBeenCalledWith(
      "session-reminder",
      "reminder-24h-sess-001",
    );
    expect(mockRemoveJob).toHaveBeenCalledWith(
      "session-reminder",
      "reminder-5m-sess-001",
    );
  });

  // ── 12. No notifications when both users absent ───────────────────────────
  it("does not notify anyone if both users absent", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockPrisma.session.update.mockResolvedValue(undefined);
    mockPrisma.user.update.mockResolvedValue({ strikeCount: 1, isBanned: false });

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockNotificationService.notifyNoShow).not.toHaveBeenCalled();
    expect(mockEmailService.sendPartnerNoShowNotification).not.toHaveBeenCalled();
  });
});
