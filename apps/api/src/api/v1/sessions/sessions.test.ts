import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../lib/prisma';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    bookingRequest: {
      findMany: vi.fn(),
    },
    favorite: {
      findMany: vi.fn(),
    },
    reflection: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

// Silence console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// ── Helpers ────────────────────────────────────────────────────────

import { authCookie } from '../../../test/auth-mock';

// Stand-in for Better Auth's session lookup (see test/auth-mock.ts).
vi.mock('../../../lib/auth', async () => (await import('../../../test/auth-mock')).authModuleMock);

const BASE_SESSION = {
  id: 'session-1',
  user1Id: 'user-1',
  user2Id: 'user-2',
  durationMin: 50,
  status: 'CONFIRMED',
  scheduledAt: new Date('2026-05-01T10:00:00Z'),
  livekitRoomName: 'session-1',
  category: null,
  user1Goal: null,
  user2Goal: null,
  user1: {
    id: 'user-1',
    email: 'user1@example.com',
    displayName: 'User One',
    username: 'userone',
  },
  user2: {
    id: 'user-2',
    email: 'user2@example.com',
    displayName: 'User Two',
    username: 'usertwo',
  },
};

// ── Tests ──────────────────────────────────────────────────────────

describe('Sessions Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Token Generation ───────────────────────────────────────────

  describe('room routes need a verified email', () => {
    it.each([
      ['GET', '/api/v1/sessions/session-1/token'],
      ['GET', '/api/v1/sessions/token/session-1'],
      ['PATCH', '/api/v1/sessions/join/session-1'],
    ])('%s %s returns 403 when the email is not verified', async (method, path) => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: false,
      } as never);

      const agent = request(app);
      const call = method === 'GET' ? agent.get(path) : agent.patch(path);
      const res = await call.set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Please verify your email first');
      expect(prisma.session.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('PATCH /api/v1/sessions/goal/:sessionId', () => {
    it('should allow user1 to set user1Goal', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        username: 'userone',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);
      (prisma.session.update as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        user1Goal: 'Finish API implementation',
      } as never);

      const res = await request(app)
        .patch('/api/v1/sessions/goal/session-1')
        .set('Cookie', [authCookie('user-1')])
        .send({ goal: 'Finish API implementation' });

      expect(res.status).toBe(200);
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { user1Goal: 'Finish API implementation' },
        })
      );
    });

    it('should allow user2 to set user2Goal', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-2',
        email: 'user2@example.com',
        username: 'usertwo',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);
      (prisma.session.update as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        user2Goal: 'Study for exams',
      } as never);

      const res = await request(app)
        .patch('/api/v1/sessions/goal/session-1')
        .set('Cookie', [authCookie('user-2')])
        .send({ goal: 'Study for exams' });

      expect(res.status).toBe(200);
      expect(prisma.session.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { user2Goal: 'Study for exams' },
        })
      );
    });

    it('should return 403 for non-participant setting goal', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-3',
        email: 'user3@example.com',
        username: 'userthree',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);

      const res = await request(app)
        .patch('/api/v1/sessions/goal/session-1')
        .set('Cookie', [authCookie('user-3')])
        .send({ goal: 'My goal' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not a participant');
    });
  });

  // ── Join logic ───────────────────────────────────────────────────

  // ── Reflections ──────────────────────────────────────────────────

  describe('POST /api/v1/sessions/reflections', () => {
    it('should create reflection for completed session', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        status: 'COMPLETED',
      } as never);

      (prisma.reflection.findFirst as any).mockResolvedValueOnce(null);

      (prisma.reflection.create as any).mockResolvedValueOnce({
        id: 'ref-1',
        sessionId: 'session-1',
        userId: 'user-1',
        text: 'Great session',
        rating: 5,
        createdAt: new Date(),
      } as never);

      const res = await request(app)
        .post('/api/v1/sessions/reflections')
        .set('Cookie', [authCookie('user-1')])
        .send({ sessionId: 'session-1', text: 'Great session', rating: 5 });

      expect(res.status).toBe(200);
      expect(res.body.data.text).toBe('Great session');
      // sanitize-html is inside the test environment but it should just return the input here
    });

    it('should return 400 for non-COMPLETED session', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never); // CONFIRMED status

      const res = await request(app)
        .post('/api/v1/sessions/reflections')
        .set('Cookie', [authCookie('user-1')])
        .send({ sessionId: 'session-1', text: 'Great session' });

      expect(res.status).toBe(400);
    });

    it('should return 403 for non-participant', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-3',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce({ ...BASE_SESSION, status: 'COMPLETED' } as never);

      const res = await request(app)
        .post('/api/v1/sessions/reflections')
        .set('Cookie', [authCookie('user-3')])
        .send({ sessionId: 'session-1', text: 'Great session' });

      expect(res.status).toBe(403);
    });

    it('should return 409 for duplicate reflection', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce({ ...BASE_SESSION, status: 'COMPLETED' } as never);
      (prisma.reflection.findFirst as any).mockResolvedValueOnce({ id: 'existing' } as never);

      const res = await request(app)
        .post('/api/v1/sessions/reflections')
        .set('Cookie', [authCookie('user-1')])
        .send({ sessionId: 'session-1', text: 'Great session' });

      expect(res.status).toBe(409);
    });

    it('should validate rating correctly', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce({ ...BASE_SESSION, status: 'COMPLETED' } as never);
      (prisma.reflection.findFirst as any).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/sessions/reflections')
        .set('Cookie', [authCookie('user-1')])
        .send({ sessionId: 'session-1', text: 'Great session', rating: 6 }); // Invalid rating

      expect(res.status).toBe(400);
    });
  });

  // ── Upcoming Sessions ──────────────────────────────────────────
  describe('GET /api/v1/sessions/upcoming', () => {
    it('should return future sessions for the user', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as any);

      (prisma.session.findMany as any).mockResolvedValue([
        {
          ...BASE_SESSION,
          user1Id: 'user-1',
          user2Id: 'user-2',
          scheduledAt: new Date(Date.now() + 3600000), // 1 hour later
        },
      ] as any);

      (prisma.bookingRequest.findMany as any).mockResolvedValue([
        { id: 'booking-1', sessionId: 'session-1', quiet: true, taskType: 'WALK' },
      ]);
      (prisma.favorite.findMany as any).mockResolvedValue([{ favoriteId: 'user-2' }]);
      (prisma.session.groupBy as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/sessions/upcoming')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0]).toMatchObject({
        id: 'session-1',
        bookingId: 'booking-1',
        quiet: true,
        taskType: 'WALK',
        partner: { id: 'user-2', displayName: 'User T.', isFavorite: true, completedSessions: 0 },
      });
    });

    it('never sends the full name, username or e-mail of the partner', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as any);
      (prisma.session.findMany as any).mockResolvedValue([
        { ...BASE_SESSION, scheduledAt: new Date(Date.now() + 3600000) },
      ] as any);
      (prisma.bookingRequest.findMany as any).mockResolvedValue([]);
      (prisma.favorite.findMany as any).mockResolvedValue([]);
      (prisma.session.groupBy as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/sessions/upcoming')
        .set('Cookie', [authCookie('user-1')]);

      const body = JSON.stringify(res.body);
      expect(body).not.toContain('User Two');
      expect(body).not.toContain('usertwo');
      expect(body).not.toContain('user2@example.com');
    });

    it('should only return sessions within 7 days', async () => {
       (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as any);

      (prisma.session.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/v1/sessions/upcoming')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(prisma.session.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              expect.objectContaining({
                scheduledAt: expect.objectContaining({
                  lt: expect.any(Date),
                }),
              }),
            ]),
          }),
        })
      );
    });
  });

  // ── Session History ────────────────────────────────────────────
  describe('GET /api/v1/sessions/history', () => {
    it('should return paginated history with partner info and reflection snippet', async () => {
      (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        isActive: true,
        isBanned: false,
        emailVerified: true,
      } as any);

      (prisma.session.count as any).mockResolvedValue(15);
      (prisma.session.findMany as any).mockResolvedValue([
        {
          ...BASE_SESSION,
          user1Id: 'user-1',
          user2Id: 'user-2',
          status: 'COMPLETED',
          reflections: [{ text: 'This is a long reflection that should be truncated because it exceeds one hundred characters by a significant margin.' }],
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/sessions/history?page=1&limit=10')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(15);
      expect(res.body.totalPages).toBe(2);
      expect(res.body.data[0].partner.id).toBe('user-2');
      expect(res.body.data[0].reflectionSnippet).toContain('...');
      expect(res.body.data[0].reflectionSnippet.length).toBeLessThanOrEqual(103); // 100 + "..."
    });
  });
});
