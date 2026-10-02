import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../lib/prisma';
import {
  scheduleNoshowCheck,
  scheduleReminders,
  scheduleBookingExpiry,
  removeJob,
} from '../../../queues/helpers';

// ── Mocks ──────────────────────────────────────────────────────────

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(),
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    bookingRequest: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    block: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('../../../queues/helpers', () => ({
  scheduleNoshowCheck: vi.fn().mockResolvedValue(undefined),
  scheduleReminders: vi.fn().mockResolvedValue(undefined),
  scheduleBookingExpiry: vi.fn().mockResolvedValue(undefined),
  removeJob: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../services/notification.service', () => ({
  NotificationService: {
    notifyMatch: vi.fn().mockResolvedValue(undefined),
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
    constructor(_k: string, _s: string, o: { identity: string; name: string }) {
      this.identity = o.identity;
      this.name = o.name;
    }
    addGrant = vi.fn();
    toJwt = vi.fn().mockResolvedValue('mock-jwt');
  }
  return { AccessToken: MockAccessToken };
});

// Silence console output during tests
vi.spyOn(console, 'log').mockImplementation(() => {});
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'warn').mockImplementation(() => {});

// ── Helpers ────────────────────────────────────────────────────────

import { authCookie } from '../../../test/auth-mock';

// Stand-in for Better Auth's session lookup (see test/auth-mock.ts).
vi.mock('../../../lib/auth', async () => (await import('../../../test/auth-mock')).authModuleMock);

/** Returns a slot time 2 hours from now, on a 15-minute boundary */
function futureSlot(): Date {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
  return d;
}

const AUTH_USER = {
  id: 'user-1',
  email: 'user1@test.com',
  username: 'userone',
  planTier: 'FREE',
  isActive: true,
  isBanned: false,
  emailVerified: true,
};

const AUTH_USER_2 = {
  id: 'user-2',
  email: 'user2@test.com',
  username: 'usertwo',
  planTier: 'FREE',
  isActive: true,
  isBanned: false,
  emailVerified: true,
};

const FULL_USER = {
  ...AUTH_USER,
  displayName: 'User One',
  avatarUrl: null,
  timezone: 'UTC',
  categories: [],
  preferredLength: [25, 50],
  stripeCustomerId: null,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ── Tests ──────────────────────────────────────────────────────────

describe('Bookings & Matching', () => {
  beforeEach(() => {
    vi.resetAllMocks();

    // Re-silence console after reset
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});

    // Default: $transaction calls the callback with the mock prisma
    (prisma.$transaction as ReturnType<typeof vi.fn>).mockImplementation(
      async (fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma)
    );

    // Re-establish queue helpers defaults after resetAllMocks
    (scheduleNoshowCheck as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (scheduleReminders as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (scheduleBookingExpiry as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    (removeJob as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  // ================================================================
  // MATCHING SERVICE — Unit Tests
  // ================================================================

  // ================================================================
  // POST /api/v1/bookings — Create Booking
  // ================================================================

  describe('POST /api/v1/bookings', () => {
    it('should return 403 when the email is not verified', async () => {
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...AUTH_USER,
        emailVerified: false,
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: futureSlot().toISOString(), durationMin: 50 });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Please verify your email first');
      expect(prisma.bookingRequest.create).not.toHaveBeenCalled();
    });

    it('should return 400 for invalid slotTime (not 15-minute boundary)', async () => {
      // Create a time that's NOT on a 15-min boundary
      const slot = futureSlot();
      slot.setMinutes(slot.getMinutes() + 7); // Now at :07, :22, :37, or :52

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);
      // Service user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(FULL_USER);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('15-minute boundary');
    });

    it('should return 400 for past slotTime', async () => {
      const past = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      past.setMinutes(0, 0, 0); // On 15-min boundary

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);
      // Service user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(FULL_USER);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: past.toISOString(), durationMin: 25 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('at least 5 minutes in the future');
    });

    it('should return 400 for a booking more than 14 days ahead', async () => {
      const far = new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);
      far.setUTCMinutes(0, 0, 0);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: far.toISOString(), durationMin: 50 });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('14 days');
      expect(prisma.bookingRequest.create).not.toHaveBeenCalled();
    });

    it('should return 403 while the account is suspended', async () => {
      const until = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...FULL_USER,
        suspendedUntil: until,
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: futureSlot().toISOString(), durationMin: 50 });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('suspended until');
      expect(prisma.bookingRequest.create).not.toHaveBeenCalled();
    });

    it('should return 403 for unverified email', async () => {
      const slot = futureSlot();

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...AUTH_USER,
        emailVerified: false,
      });
      // Service user lookup — NOT verified
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...FULL_USER,
        emailVerified: false,
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 25 });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('verify your email');
    });

  });

  // ================================================================
  // GET /api/v1/bookings — List Bookings
  // ================================================================

  describe('GET /api/v1/bookings', () => {
    it('should list booking requests with pagination', async () => {
      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      (prisma.bookingRequest.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(15);
      (prisma.bookingRequest.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: 'booking-1',
          userId: 'user-1',
          slotTime: futureSlot(),
          durationMin: 50,
          status: 'PENDING',
          sessionId: null,
          session: null,
        },
      ]);

      const res = await request(app)
        .get('/api/v1/bookings?page=1&limit=10')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(15);
      expect(res.body.totalPages).toBe(2);
    });
  });

  // ================================================================
  // DELETE /api/v1/bookings/:id — Cancel Booking
  // ================================================================

  describe('DELETE /api/v1/bookings/:id', () => {
    it('should cancel a PENDING booking', async () => {
      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Find booking
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-1',
        userId: 'user-1',
        slotTime: futureSlot(),
        durationMin: 50,
        status: 'PENDING',
        sessionId: null,
      });

      // Update status
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-1',
        status: 'CANCELLED',
      });


      const res = await request(app)
        .delete('/api/v1/bookings/booking-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);
      expect(removeJob).toHaveBeenCalledWith('booking-expiry', 'expiry-booking-1');
    });

    it('should return 403 for non-owner trying to cancel', async () => {
      // Auth as user-1
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Booking belongs to user-2
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-other',
        userId: 'user-2', // different from authenticated user
        slotTime: futureSlot(),
        durationMin: 50,
        status: 'PENDING',
        sessionId: null,
      });

      const res = await request(app)
        .delete('/api/v1/bookings/booking-other')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Not authorized');
    });

    it('should return 400 for already cancelled booking', async () => {
      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Already cancelled
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-cancelled',
        userId: 'user-1',
        slotTime: futureSlot(),
        durationMin: 50,
        status: 'CANCELLED',
        sessionId: null,
      });

      const res = await request(app)
        .delete('/api/v1/bookings/booking-cancelled')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('already cancelled or expired');
    });
  });
});
