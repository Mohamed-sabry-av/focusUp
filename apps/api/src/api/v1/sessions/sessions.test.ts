import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
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
    },
    reflection: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../lib/redis', () => ({
  redis: {
    sadd: vi.fn(),
    scard: vi.fn(),
    expire: vi.fn(),
    del: vi.fn(),
  },
}));

vi.mock('livekit-server-sdk', () => {
  class MockAccessToken {
    identity: string;
    name: string;
    ttl = 0;

    constructor(_apiKey: string, _apiSecret: string, opts: { identity: string; name: string }) {
      this.identity = opts.identity;
      this.name = opts.name;
    }

    addGrant = vi.fn();
    toJwt = vi.fn().mockResolvedValue('mock-livekit-jwt-token');
  }

  return { AccessToken: MockAccessToken };
});

// Silence console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});

// ── Helpers ────────────────────────────────────────────────────────

const SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use';

function authCookie(userId: string): string {
  const token = jwt.sign({ sub: userId }, SECRET);
  return `access_token=${token}`;
}

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
    process.env.LIVEKIT_API_KEY = 'test-api-key';
    process.env.LIVEKIT_API_SECRET = 'test-api-secret';
  });

  // ── Token Generation ───────────────────────────────────────────

  describe('GET /api/v1/sessions/token/:sessionId', () => {
    it('should return a token for a valid participant', async () => {
      // Auth middleware user lookup
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        username: 'userone',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
      } as never);

      // Session lookup in service
      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);

      const res = await request(app)
        .get('/api/v1/sessions/token/session-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBe('mock-livekit-jwt-token');
    });

    it('should return 403 for non-participant', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-3',
        email: 'user3@example.com',
        username: 'userthree',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);

      const res = await request(app)
        .get('/api/v1/sessions/token/session-1')
        .set('Cookie', [authCookie('user-3')]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('You are not a participant in this session');
    });

    it('should return 403 for wrong session status', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        username: 'userone',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        status: 'CANCELLED',
      } as never);

      const res = await request(app)
        .get('/api/v1/sessions/token/session-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Session is not available to join');
    });

    it('should return 404 for non-existent session', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        username: 'userone',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(null);

      const res = await request(app)
        .get('/api/v1/sessions/token/nonexistent')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Session not found');
    });
  });

  // ── Goal Setting ───────────────────────────────────────────────

  describe('PATCH /api/v1/sessions/goal/:sessionId', () => {
    it('should allow user1 to set user1Goal', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        username: 'userone',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
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

  describe('PATCH /api/v1/sessions/join/:sessionId', () => {
    it('should stay CONFIRMED for first user join', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        email: 'user1@example.com',
        username: 'userone',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);
      const { redis } = await import('../../../lib/redis');
      (redis.scard as any).mockResolvedValueOnce(1); // Only 1 user joined

      const res = await request(app)
        .patch('/api/v1/sessions/join/session-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(false);
      expect(redis.sadd).toHaveBeenCalledWith('session:joined:session-1', 'user-1');
    });

    it('should become ACTIVE for second user join', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-2',
        email: 'user2@example.com',
        username: 'usertwo',
        planTier: 'FREE',
        isActive: true,
        isBanned: false,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);
      const { redis } = await import('../../../lib/redis');
      (redis.scard as any).mockResolvedValueOnce(2); // 2 users joined
      (prisma.session.update as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        status: 'ACTIVE',
        startedAt: new Date(),
      } as never);

      const res = await request(app)
        .patch('/api/v1/sessions/join/session-1')
        .set('Cookie', [authCookie('user-2')]);

      expect(res.status).toBe(200);
      expect(res.body.data.isActive).toBe(true);
      expect(prisma.session.update).toHaveBeenCalled();
    });

    it('should return 403 for non-participant', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-3',
        isActive: true,
        isBanned: false,
      } as never);
      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);

      const res = await request(app)
        .patch('/api/v1/sessions/join/session-1')
        .set('Cookie', [authCookie('user-3')]);

      expect(res.status).toBe(403);
    });

    it('should return 400 for non-CONFIRMED session', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
      } as never);
      (prisma.session.findUnique as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        status: 'CANCELLED',
      } as never);

      const res = await request(app)
        .patch('/api/v1/sessions/join/session-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(400);
    });
  });

  // ── Complete logic ───────────────────────────────────────────────

  describe('PATCH /api/v1/sessions/complete/:sessionId', () => {
    it('should complete an ACTIVE session', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        status: 'ACTIVE',
      } as never);

      (prisma.session.update as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        status: 'COMPLETED',
      } as never);

      const res = await request(app)
        .patch('/api/v1/sessions/complete/session-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.session.status).toBe('COMPLETED');
    });

    it('should return 400 for non-ACTIVE session', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
      } as never);

      (prisma.session.findUnique as any).mockResolvedValueOnce(BASE_SESSION as never);

      const res = await request(app)
        .patch('/api/v1/sessions/complete/session-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(400);
    });

    it('should return 403 for non-participant', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-3',
        isActive: true,
        isBanned: false,
      } as never);
      (prisma.session.findUnique as any).mockResolvedValueOnce({
        ...BASE_SESSION,
        status: 'ACTIVE',
      } as never);

      const res = await request(app)
        .patch('/api/v1/sessions/complete/session-1')
        .set('Cookie', [authCookie('user-3')]);

      expect(res.status).toBe(403);
    });
  });

  // ── Reflections ──────────────────────────────────────────────────

  describe('POST /api/v1/sessions/reflections', () => {
    it('should create reflection for completed session', async () => {
      (prisma.user.findUnique as any).mockResolvedValueOnce({
        id: 'user-1',
        isActive: true,
        isBanned: false,
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
      } as any);

      (prisma.session.findMany as any).mockResolvedValue([
        {
          ...BASE_SESSION,
          user1Id: 'user-1',
          user2Id: 'user-2',
          scheduledAt: new Date(Date.now() + 3600000), // 1 hour later
        },
      ] as any);

      const res = await request(app)
        .get('/api/v1/sessions/upcoming')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].partner.id).toBe('user-2');
    });

    it('should only return sessions within 7 days', async () => {
       (prisma.user.findUnique as any).mockResolvedValue({
        id: 'user-1',
        isActive: true,
        isBanned: false,
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
