import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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
  },
}));

const SECRET = 'fallback_secret_do_not_use';

function authCookie(userId: string): string {
  const token = jwt.sign({ sub: userId }, SECRET);
  return `access_token=${token}`;
}

describe('Users Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/v1/users/me', () => {
    it('should return current user without passwordHash', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        passwordHash: 'hashed-password',
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
      expect(res.body.data.user.passwordHash).toBeUndefined();
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/users/me');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/v1/users/me/stats', () => {
    it('should return correct stats for FREE user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        planTier: PlanTier.FREE,
        isActive: true,
        isBanned: false,
      } as any);

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
      expect(res.body.data.sessionLimit).toBe(3);
      expect(res.body.data.planTier).toBe(PlanTier.FREE);
    });

    it('should return sessionLimit=null for PRO user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        planTier: PlanTier.PRO,
        isActive: true,
        isBanned: false,
      } as any);

      (prisma.session.count as any).mockResolvedValue(0);
      (prisma.session.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/users/me/stats')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.sessionLimit).toBeNull();
      expect(res.body.data.planTier).toBe(PlanTier.PRO);
    });
  });
});
