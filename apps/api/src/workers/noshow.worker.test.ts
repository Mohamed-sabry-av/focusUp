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

const {
  mockPrisma,
  mockRedis,
  mockNotificationService,
  mockEmailService,
  mockRemoveJob,
  mockAddStrike,
} = vi.hoisted(() => ({
  mockPrisma: {
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    bookingRequest: {
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  mockRedis: {
    smembers: vi.fn(),
  },
  mockNotificationService: {
    notifyNoShow: vi.fn(),
  },
  mockEmailService: {
    sendPartnerNoShowNotification: vi.fn(),
  },
  mockRemoveJob: vi.fn(),
  mockAddStrike: vi.fn(),
}));
vi.mock("../lib/prisma", () => ({ prisma: mockPrisma }));
vi.mock("../lib/redis", () => ({ redis: mockRedis }));
vi.mock("../services/notification.service", () => ({
  NotificationService: mockNotificationService,
}));
vi.mock("../services/email.service", () => ({
  EmailService: mockEmailService,
}));
vi.mock("../services/strikes.service", () => ({ addStrike: mockAddStrike }));
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

beforeEach(() => {
  vi.resetAllMocks();
  // Each user has a booking for the session: "booking-of-<userId>"
  mockPrisma.bookingRequest.findFirst.mockImplementation(
    async ({ where }: { where: { userId: string } }) => ({ id: `booking-of-${where.userId}` }),
  );
  mockAddStrike.mockResolvedValue({ added: true, strikesInWindow: 1, suspendedUntil: null });
});

describe("processNoshowJob", () => {
  it("skips if session not found", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(null);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.session.update).not.toHaveBeenCalled();
    expect(mockAddStrike).not.toHaveBeenCalled();
  });

  it.each(["ACTIVE", "CANCELLED", "COMPLETED", "NO_SHOW"] as const)(
    "skips if session is already %s",
    async (status) => {
      mockPrisma.session.findUnique.mockResolvedValue(makeSession({ status }));

      await processNoshowJob(makeJob({ sessionId: "sess-001" }));

      expect(mockPrisma.session.update).not.toHaveBeenCalled();
      expect(mockAddStrike).not.toHaveBeenCalled();
    },
  );

  it("marks a CONFIRMED session as NO_SHOW", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.session.update).toHaveBeenCalledWith({
      where: { id: "sess-001" },
      data: { status: "NO_SHOW" },
    });
  });

  it("gives each absent user a NO_SHOW booking and one strike tied to that booking", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockPrisma.bookingRequest.update).toHaveBeenCalledWith({
      where: { id: "booking-of-user-1" },
      data: { status: "NO_SHOW" },
    });
    expect(mockPrisma.bookingRequest.update).toHaveBeenCalledWith({
      where: { id: "booking-of-user-2" },
      data: { status: "NO_SHOW" },
    });
    expect(mockAddStrike).toHaveBeenCalledTimes(2);
    expect(mockAddStrike).toHaveBeenCalledWith({
      userId: "user-1",
      reason: "NO_SHOW",
      bookingRequestId: "booking-of-user-1",
    });
    expect(mockAddStrike).toHaveBeenCalledWith({
      userId: "user-2",
      reason: "NO_SHOW",
      bookingRequestId: "booking-of-user-2",
    });
  });

  it("only strikes the user who did not join, and gives the present user their session back", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue(["user-1"]); // user-1 joined, user-2 did not
    mockNotificationService.notifyNoShow.mockResolvedValue(undefined);
    mockEmailService.sendPartnerNoShowNotification.mockResolvedValue(undefined);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockAddStrike).toHaveBeenCalledTimes(1);
    expect(mockAddStrike).toHaveBeenCalledWith(
      expect.objectContaining({ userId: "user-2", reason: "NO_SHOW" }),
    );
    // The present user's session does not count toward their weekly quota
    expect(mockPrisma.bookingRequest.updateMany).toHaveBeenCalledWith({
      where: { sessionId: "sess-001", userId: { in: ["user-1"] } },
      data: { countsToQuota: false },
    });
  });

  it("notifies the present user that their partner did not show", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue(["user-1"]);
    mockNotificationService.notifyNoShow.mockResolvedValue(undefined);
    mockEmailService.sendPartnerNoShowNotification.mockResolvedValue(undefined);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockNotificationService.notifyNoShow).toHaveBeenCalledTimes(1);
    expect(mockNotificationService.notifyNoShow).toHaveBeenCalledWith(
      expect.objectContaining({ id: "sess-001" }),
      "user-1",
    );
    expect(mockEmailService.sendPartnerNoShowNotification).toHaveBeenCalledWith({
      to: "u1@test.com",
      sessionId: "sess-001",
    });
  });

  it("notifies nobody and refunds nobody when both users are absent", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockNotificationService.notifyNoShow).not.toHaveBeenCalled();
    expect(mockEmailService.sendPartnerNoShowNotification).not.toHaveBeenCalled();
    expect(mockPrisma.bookingRequest.updateMany).not.toHaveBeenCalled();
  });

  it("removes the reminder jobs after marking the no-show", async () => {
    mockPrisma.session.findUnique.mockResolvedValue(makeSession());
    mockRedis.smembers.mockResolvedValue([]);
    mockRemoveJob.mockResolvedValue(undefined);

    await processNoshowJob(makeJob({ sessionId: "sess-001" }));

    expect(mockRemoveJob).toHaveBeenCalledWith("session-reminder", "reminder-24h-sess-001");
    expect(mockRemoveJob).toHaveBeenCalledWith("session-reminder", "reminder-5m-sess-001");
  });
});
