import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPrisma, mockEmail } = vi.hoisted(() => {
  const tx = {
    strike: { findUnique: vi.fn(), create: vi.fn(), count: vi.fn() },
    user: { findUnique: vi.fn(), findUniqueOrThrow: vi.fn(), update: vi.fn() },
  };
  return {
    mockPrisma: {
      tx,
      $transaction: vi.fn(async (run: (t: typeof tx) => unknown) => run(tx)),
      user: { findUnique: vi.fn() },
      strike: { count: vi.fn() },
    },
    mockEmail: {
      sendStrikeWarning: vi.fn(),
      sendSuspensionNotification: vi.fn(),
    },
  };
});

vi.mock('../lib/prisma', () => ({ prisma: mockPrisma }));
vi.mock('./email.service', () => ({ EmailService: mockEmail }));

import { addStrike, countRecentStrikes } from './strikes.service';

const now = new Date('2026-10-05T10:00:00Z');
const tx = mockPrisma.tx;

function arrange(options: { strikesAfter: number; suspendedUntil?: Date | null; existing?: boolean }) {
  tx.strike.findUnique.mockResolvedValue(options.existing ? { id: 's1' } : null);
  tx.strike.count.mockResolvedValue(options.strikesAfter);
  tx.user.findUnique.mockResolvedValue({ suspendedUntil: options.suspendedUntil ?? null });
  tx.user.findUniqueOrThrow.mockResolvedValue({ suspendedUntil: options.suspendedUntil ?? null });
  mockPrisma.user.findUnique.mockResolvedValue({ email: 'user@test.com' });
}

describe('addStrike', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (run: (t: typeof tx) => unknown) => run(tx));
  });

  it('records the strike and does not suspend below 5', async () => {
    arrange({ strikesAfter: 2 });

    const result = await addStrike({ userId: 'u1', reason: 'NO_SHOW', bookingRequestId: 'b1' }, now);

    expect(tx.strike.create).toHaveBeenCalledWith({
      data: { userId: 'u1', reason: 'NO_SHOW', bookingRequestId: 'b1', note: null },
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(result).toEqual({ added: true, strikesInWindow: 2, suspendedUntil: null });
    expect(mockEmail.sendStrikeWarning).not.toHaveBeenCalled();
  });

  it('counts only the last 30 days', async () => {
    arrange({ strikesAfter: 1 });

    await addStrike({ userId: 'u1', reason: 'LATE_CANCEL' }, now);

    expect(tx.strike.count).toHaveBeenCalledWith({
      where: { userId: 'u1', createdAt: { gte: new Date('2026-09-05T10:00:00Z') } },
    });
  });

  it('sends a warning email at the 3rd strike', async () => {
    arrange({ strikesAfter: 3 });

    await addStrike({ userId: 'u1', reason: 'NO_SHOW', bookingRequestId: 'b3' }, now);

    expect(mockEmail.sendStrikeWarning).toHaveBeenCalledWith({ to: 'user@test.com', strikeCount: 3 });
  });

  it('suspends for 3 days at the 5th strike and emails the user', async () => {
    arrange({ strikesAfter: 5 });

    const result = await addStrike({ userId: 'u1', reason: 'NO_SHOW', bookingRequestId: 'b5' }, now);

    const until = new Date('2026-10-08T10:00:00Z');
    expect(tx.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { suspendedUntil: until } });
    expect(result.suspendedUntil).toEqual(until);
    expect(mockEmail.sendSuspensionNotification).toHaveBeenCalledWith({ to: 'user@test.com', until });
  });

  it('does not restart a suspension that is already running', async () => {
    const running = new Date('2026-10-07T10:00:00Z');
    arrange({ strikesAfter: 6, suspendedUntil: running });

    const result = await addStrike({ userId: 'u1', reason: 'ADMIN', note: 'abuse' }, now);

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(result.suspendedUntil).toEqual(running);
    expect(mockEmail.sendSuspensionNotification).not.toHaveBeenCalled();
  });

  it('suspends again after an earlier suspension has ended', async () => {
    arrange({ strikesAfter: 5, suspendedUntil: new Date('2026-10-01T10:00:00Z') });

    await addStrike({ userId: 'u1', reason: 'NO_SHOW', bookingRequestId: 'b9' }, now);

    expect(tx.user.update).toHaveBeenCalled();
  });

  it('does nothing twice for the same booking and reason (a retried job)', async () => {
    arrange({ strikesAfter: 4, existing: true });

    const result = await addStrike({ userId: 'u1', reason: 'NO_SHOW', bookingRequestId: 'b1' }, now);

    expect(tx.strike.create).not.toHaveBeenCalled();
    expect(result.added).toBe(false);
    expect(mockEmail.sendStrikeWarning).not.toHaveBeenCalled();
    expect(mockEmail.sendSuspensionNotification).not.toHaveBeenCalled();
  });
});

describe('countRecentStrikes', () => {
  it('asks for strikes from the last 30 days only', async () => {
    mockPrisma.strike.count.mockResolvedValue(4);

    expect(await countRecentStrikes('u1', now)).toBe(4);
    expect(mockPrisma.strike.count).toHaveBeenCalledWith({
      where: { userId: 'u1', createdAt: { gte: new Date('2026-09-05T10:00:00Z') } },
    });
  });
});
