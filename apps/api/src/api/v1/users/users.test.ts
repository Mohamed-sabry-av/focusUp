import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../lib/prisma';
import { PlanTier } from '@prisma/client';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    bookingRequest: {
      count: vi.fn(),
    },
    strike: {
      count: vi.fn(),
    },
  },
}));

import { authCookie } from '../../../test/auth-mock';

// Stand-in for Better Auth's session lookup (see test/auth-mock.ts).
vi.mock('../../../lib/auth', async () => (await import('../../../test/auth-mock')).authModuleMock);

describe('Users Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/users/me', () => {
    it('should return the current user', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        planTier: PlanTier.FREE,
        isActive: true,
        isBanned: false,
        emailVerified: true,
      };

      (prisma.user.findUnique as any).mockResolvedValue(mockUser as any);

      const res = await request(app)
        .get('/api/v1/users/me')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe('user-1');
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('PATCH /api/v1/users/me (privacy settings)', () => {
    it('saves hidePhoto and dataSaver', async () => {
      const user = { id: 'user-1', isActive: true, isBanned: false, emailVerified: true };
      (prisma.user.findUnique as any).mockResolvedValueOnce(user as any);
      (prisma.user.update as any).mockResolvedValueOnce({ ...user, hidePhoto: true, dataSaver: true } as any);

      const res = await request(app)
        .patch('/api/v1/users/me')
        .set('Cookie', [authCookie('user-1')])
        .send({ hidePhoto: true, dataSaver: true });

      expect(res.status).toBe(200);
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { hidePhoto: true, dataSaver: true } }),
      );
    });

    it('can switch a setting off again (false is not ignored)', async () => {
      const user = { id: 'user-1', isActive: true, isBanned: false, emailVerified: true };
      (prisma.user.findUnique as any).mockResolvedValueOnce(user as any);
      (prisma.user.update as any).mockResolvedValueOnce({ ...user, hidePhoto: false } as any);

      await request(app)
        .patch('/api/v1/users/me')
        .set('Cookie', [authCookie('user-1')])
        .send({ hidePhoto: false });

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { hidePhoto: false } }),
      );
    });
  });

  describe('GET /api/v1/users/me/stats', () => {
    it('should return correct stats for FREE user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        planTier: PlanTier.FREE,
        timezone: 'Africa/Cairo',
        isActive: true,
        isBanned: false,
      } as any);

      // sessions used this week (bookings that count toward the free allowance)
      (prisma.bookingRequest.count as any).mockResolvedValueOnce(4);
      (prisma.strike.count as any).mockResolvedValueOnce(2);

      // sessionsThisWeek count
      (prisma.session.count as any).mockResolvedValueOnce(2);
      // focusHoursThisWeek findMany
      (prisma.session.findMany as any).mockResolvedValueOnce([
        { durationMin: 50 },
        { durationMin: 25 },
      ] as any);
      // currentStreak count (mocking today has sessions)
      (prisma.session.count as any).mockResolvedValueOnce(1); // today
      (prisma.session.count as any).mockResolvedValueOnce(0); // yesterday (breaking streak)

      const res = await request(app)
        .get('/api/v1/users/me/stats')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.sessionsThisWeek).toBe(2);
      expect(res.body.data.focusHoursThisWeek).toBe(1.3); // (50+25)/60 = 1.25 -> 1.3
      // The free weekly limit is switched off during the beta, so there is no limit to show
      expect(res.body.data.sessionLimit).toBeNull();
      expect(res.body.data.sessionsUsedThisWeek).toBe(4);
      expect(res.body.data.strikesInLast30Days).toBe(2);
      expect(res.body.data.planTier).toBe(PlanTier.FREE);
    });

    it('should return sessionLimit=null for PRO user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        planTier: PlanTier.PRO,
        timezone: 'UTC',
        isActive: true,
        isBanned: false,
      } as any);

      (prisma.session.count as any).mockResolvedValue(0);
      (prisma.session.findMany as any).mockResolvedValue([]);
      (prisma.bookingRequest.count as any).mockResolvedValue(0);
      (prisma.strike.count as any).mockResolvedValue(0);

      const res = await request(app)
        .get('/api/v1/users/me/stats')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.sessionLimit).toBeNull();
      expect(res.body.data.planTier).toBe(PlanTier.PRO);
    });
  });
});
