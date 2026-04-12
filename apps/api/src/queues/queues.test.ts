import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock ioredis before any imports that use it
vi.mock("ioredis", () => {
  return {
    default: class {
      constructor() {}
    },
  };
});

// Track jobs added to each queue
const addedJobs: {
  queueName: string;
  name: string;
  data: Record<string, unknown>;
  opts: Record<string, unknown>;
}[] = [];

// Track jobs available for removal
const jobStore = new Map<string, { remove: () => void }>();

function createMockQueue(queueName: string) {
  return {
    add: vi.fn(
      async (
        name: string,
        data: Record<string, unknown>,
        opts: Record<string, unknown>,
      ) => {
        const jobId = opts?.jobId as string | undefined;
        addedJobs.push({ queueName, name, data, opts });
        if (jobId) {
          jobStore.set(jobId, { remove: vi.fn() });
        }
      },
    ),
    getJob: vi.fn(async (jobId: string) => {
      return jobStore.get(jobId) ?? null;
    }),
    getJobCounts: vi.fn(async () => ({
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      waiting: 0,
    })),
  };
}

vi.mock("bullmq", () => {
  return {
    Queue: class {
      constructor(queueName: string) {
        const mock = createMockQueue(queueName);
        Object.assign(this, mock);
      }
    },
    Worker: class {
      close = vi.fn(async () => {});
    },
  };
});

// Import after mocks are set up
import {
  scheduleNoshowCheck,
  scheduleReminders,
  scheduleBookingExpiry,
  removeJob,
} from "./helpers";

beforeEach(() => {
  addedJobs.length = 0;
  jobStore.clear();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-01-01T12:00:00Z"));
});

describe("scheduleNoshowCheck", () => {
  it("adds job with correct delay (scheduledAt + 5min - now)", async () => {
    const scheduledAt = new Date("2025-01-01T13:00:00Z"); // 1h from now
    await scheduleNoshowCheck("session-123", scheduledAt);

    expect(addedJobs).toHaveLength(1);
    const job = addedJobs[0]!;
    expect(job.queueName).toBe("session-noshow");
    expect(job.data).toEqual({ sessionId: "session-123" });
    expect(job.opts.jobId).toBe("noshow-session-123");
    expect(job.opts.delay).toBe(65 * 60 * 1000); // 1h + 5min
    expect(job.opts.attempts).toBe(3);
    expect(job.opts.backoff).toEqual({ type: "exponential", delay: 5000 });
  });

  it("skips if delay would be negative", async () => {
    const scheduledAt = new Date("2025-01-01T11:00:00Z"); // 1h in the past
    await scheduleNoshowCheck("session-123", scheduledAt);
    expect(addedJobs).toHaveLength(0);
  });
});

describe("scheduleReminders", () => {
  it("adds 2 jobs when >24h away", async () => {
    const scheduledAt = new Date("2025-01-03T12:00:00Z"); // 48h from now
    await scheduleReminders("session-456", scheduledAt);

    expect(addedJobs).toHaveLength(2);
    const jobs = addedJobs.filter((j) => j.queueName === "session-reminder");
    expect(jobs).toHaveLength(2);

    const job24h = jobs.find(
      (j) => j.opts.jobId === "reminder-24h-session-456",
    );
    expect(job24h).toBeDefined();
    expect(job24h!.opts.delay).toBe(24 * 60 * 60 * 1000); // 24h from now

    const job5m = jobs.find((j) => j.opts.jobId === "reminder-5m-session-456");
    expect(job5m).toBeDefined();
    expect(job5m!.opts.delay).toBe(47 * 60 * 60 * 1000 + 55 * 60 * 1000); // 48h - 5min
  });

  it("adds only 5min job when <24h away", async () => {
    const scheduledAt = new Date("2025-01-01T18:00:00Z"); // 6h from now
    await scheduleReminders("session-789", scheduledAt);

    const jobs = addedJobs.filter((j) => j.queueName === "session-reminder");
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.opts.jobId).toBe("reminder-5m-session-789");
  });
});

describe("scheduleBookingExpiry", () => {
  it("adds job with correct delay", async () => {
    const slotTime = new Date("2025-01-01T14:00:00Z"); // 2h from now
    await scheduleBookingExpiry("br-001", slotTime);

    expect(addedJobs).toHaveLength(1);
    const job = addedJobs[0]!;
    expect(job.queueName).toBe("booking-expiry");
    expect(job.data).toEqual({ bookingRequestId: "br-001" });
    expect(job.opts.jobId).toBe("expiry-br-001");
    expect(job.opts.delay).toBe(2 * 60 * 60 * 1000);
  });

  it("skips if slotTime is in the past", async () => {
    const slotTime = new Date("2025-01-01T10:00:00Z"); // 2h ago
    await scheduleBookingExpiry("br-002", slotTime);
    expect(addedJobs).toHaveLength(0);
  });
});

describe("removeJob", () => {
  it("removes an existing job without error", async () => {
    // First add a job so it exists in jobStore
    await scheduleNoshowCheck(
      "session-remove-test",
      new Date("2025-01-01T13:00:00Z"),
    );
    const job = jobStore.get("noshow-session-remove-test");
    expect(job).toBeDefined();

    await removeJob("session-noshow", "noshow-session-remove-test");
    // Should not throw
  });

  it("handles non-existent job without error", async () => {
    await expect(
      removeJob("session-noshow", "noshow-nonexistent"),
    ).resolves.toBeUndefined();
  });

  it("handles unknown queue name without error", async () => {
    await expect(
      removeJob("unknown-queue", "some-job"),
    ).resolves.toBeUndefined();
  });
});
