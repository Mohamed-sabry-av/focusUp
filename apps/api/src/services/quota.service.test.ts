import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockEnv, count } = vi.hoisted(() => ({
  mockEnv: { QUOTA_ENFORCED: false },
  count: vi.fn(),
}));

vi.mock('@focusUp/env/server', () => ({ env: mockEnv }));
vi.mock('../lib/prisma', () => ({ prisma: { bookingRequest: { count } } }));

import { getQuotaStatus, isOverQuota } from './quota.service';

const free = { id: 'u1', timezone: 'Africa/Cairo', planTier: 'FREE' };
const paid = { id: 'u2', timezone: 'Africa/Cairo', planTier: 'PRO' };
const slot = new Date('2026-10-07T15:00:00Z');

describe('quota service', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockEnv.QUOTA_ENFORCED = false;
  });

  describe('while the quota is switched off (free beta)', () => {
    it('reports usage but no limit', async () => {
      count.mockResolvedValue(5);
      expect(await getQuotaStatus(free, slot)).toEqual({ used: 5, limit: null });
    });

    it('never blocks a booking, even far over 6', async () => {
      count.mockResolvedValue(20);
      expect(await isOverQuota(free, slot)).toBe(false);
    });
  });

  describe('once the quota is switched on', () => {
    beforeEach(() => {
      mockEnv.QUOTA_ENFORCED = true;
    });

    it('limits free users to 6 sessions a week', async () => {
      count.mockResolvedValue(3);
      expect(await getQuotaStatus(free, slot)).toEqual({ used: 3, limit: 6 });
    });

    it('blocks the 7th session but allows the 6th', async () => {
      count.mockResolvedValue(5);
      expect(await isOverQuota(free, slot)).toBe(false);
      count.mockResolvedValue(6);
      expect(await isOverQuota(free, slot)).toBe(true);
    });

    it('has no limit for paid users', async () => {
      count.mockResolvedValue(30);
      expect(await getQuotaStatus(paid, slot)).toEqual({ used: 30, limit: null });
      expect(await isOverQuota(paid, slot)).toBe(false);
    });

    it('only counts bookings that use up a session, inside the user\'s week', async () => {
      count.mockResolvedValue(0);
      await getQuotaStatus(free, slot);
      const where = count.mock.calls[0]?.[0].where;
      expect(where.countsToQuota).toBe(true);
      expect(where.status.in).toEqual(['PENDING', 'MATCHED', 'COMPLETED', 'LATE_CANCELLED', 'NO_SHOW']);
      // Wednesday 7 Oct 2026 in Cairo (UTC+3): the week starts Monday 5 Oct 00:00 Cairo
      expect(where.slotTime.gte.toISOString()).toBe('2026-10-04T21:00:00.000Z');
      expect(where.slotTime.lt.toISOString()).toBe('2026-10-11T21:00:00.000Z');
    });
  });
});
