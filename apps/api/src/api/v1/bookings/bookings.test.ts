import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../../../app';
import { prisma } from '../../../lib/prisma';
import { MatchingService } from '../matching/matching.service';
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

const SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use';

function authCookie(userId: string): string {
  const token = jwt.sign({ sub: userId }, SECRET);
  return `access_token=${token}`;
}

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
  passwordHash: null,
  displayName: 'User One',
  avatarUrl: null,
  timezone: 'UTC',
  categories: [],
  preferredLength: [25, 50],
  stripeCustomerId: null,
  strikeCount: 0,
  isAdmin: false,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const FULL_USER_2 = {
  ...AUTH_USER_2,
  passwordHash: null,
  displayName: 'User Two',
  avatarUrl: null,
  timezone: 'UTC',
  categories: [],
  preferredLength: [25, 50],
  stripeCustomerId: null,
  strikeCount: 0,
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

  describe('MatchingService', () => {
    it('should match two users booking same slot and duration', async () => {
      const slot = futureSlot();

      // tx.bookingRequest.findUnique — the requesting booking
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-1',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
      });

      // tx.block.findMany — no blocks
      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      // tx.bookingRequest.findFirst — another user's PENDING booking
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-2',
        userId: 'user-2',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
        user: FULL_USER_2,
      });

      // tx.session.create
      (prisma.session.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'session-1',
        user1Id: 'user-2',
        user2Id: 'user-1',
        durationMin: 50,
        status: 'CONFIRMED',
        scheduledAt: slot,
        livekitRoomName: 'pending-temp',
        user1: FULL_USER_2,
        user2: FULL_USER,
      });

      // tx.session.update — set livekitRoomName = session.id
      (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'session-1',
        user1Id: 'user-2',
        user2Id: 'user-1',
        durationMin: 50,
        status: 'CONFIRMED',
        scheduledAt: slot,
        livekitRoomName: 'session-1',
        user1: FULL_USER_2,
        user2: FULL_USER,
      });

      // tx.bookingRequest.update x2 (match + requesting)
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const result = await MatchingService.matchBookingRequest('booking-1');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('session-1');
      expect(result?.livekitRoomName).toBe('session-1');
      expect(result?.status).toBe('CONFIRMED');
      expect(result?.user1Id).toBe('user-2'); // earlier booking = user1
      expect(result?.user2Id).toBe('user-1'); // current booking = user2
    });

    it('should return null when no match is available (third user stays PENDING)', async () => {
      const slot = futureSlot();

      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-3',
        userId: 'user-3',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
      });

      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      // No other PENDING bookings available
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await MatchingService.matchBookingRequest('booking-3');

      expect(result).toBeNull();
    });

    it('should not match blocked users', async () => {
      const slot = futureSlot();

      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-1',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
      });

      // user-1 has blocked user-2
      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { blockerId: 'user-1', blockedId: 'user-2' },
      ]);

      // findFirst excludes blocked users — returns null (no other users)
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await MatchingService.matchBookingRequest('booking-1');

      expect(result).toBeNull();

      // Verify that notIn includes the blocked user
      expect(prisma.bookingRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: expect.objectContaining({
              notIn: expect.arrayContaining(['user-2']),
            }),
          }),
        })
      );
    });

    it('should exclude banned users from matching', async () => {
      const slot = futureSlot();

      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-1',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
      });

      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      // No match because only matching user is banned
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const result = await MatchingService.matchBookingRequest('booking-1');

      expect(result).toBeNull();

      // Verify the user filter includes isBanned: false
      expect(prisma.bookingRequest.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user: expect.objectContaining({
              isBanned: false,
              isActive: true,
            }),
          }),
        })
      );
    });

    it('should handle concurrent matching — exactly 1 pair from 3 bookings', async () => {
      const slot = futureSlot();

      // First call: booking-A finds booking-B as match
      const setupFirstCall = () => {
        (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: 'booking-A',
          userId: 'user-A',
          slotTime: slot,
          durationMin: 25,
          status: 'PENDING',
        });
        (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
        (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: 'booking-B',
          userId: 'user-B',
          slotTime: slot,
          durationMin: 25,
          status: 'PENDING',
          user: { id: 'user-B', displayName: 'User B' },
        });
        (prisma.session.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: 'session-AB',
          user1Id: 'user-B',
          user2Id: 'user-A',
          durationMin: 25,
          status: 'CONFIRMED',
          scheduledAt: slot,
          livekitRoomName: 'pending',
          user1: { id: 'user-B' },
          user2: { id: 'user-A' },
        });
        (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: 'session-AB',
          user1Id: 'user-B',
          user2Id: 'user-A',
          durationMin: 25,
          status: 'CONFIRMED',
          scheduledAt: slot,
          livekitRoomName: 'session-AB',
          user1: { id: 'user-B' },
          user2: { id: 'user-A' },
        });
        (prisma.bookingRequest.update as ReturnType<typeof vi.fn>)
          .mockResolvedValueOnce({})
          .mockResolvedValueOnce({});
      };

      // Second call: booking-C finds no match (B is already MATCHED)
      const setupSecondCall = () => {
        (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          id: 'booking-C',
          userId: 'user-C',
          slotTime: slot,
          durationMin: 25,
          status: 'PENDING',
        });
        (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
        (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      };

      setupFirstCall();
      setupSecondCall();

      // Run both in parallel
      const [resultA, resultC] = await Promise.all([
        MatchingService.matchBookingRequest('booking-A'),
        MatchingService.matchBookingRequest('booking-C'),
      ]);

      // Exactly one pair matched, one stays PENDING
      expect(resultA).not.toBeNull();
      expect(resultA?.id).toBe('session-AB');
      expect(resultC).toBeNull();
    });
  });

  // ================================================================
  // POST /api/v1/bookings — Create Booking
  // ================================================================

  describe('POST /api/v1/bookings', () => {
    it('should create a booking request successfully', async () => {
      const slot = futureSlot();

      // Auth middleware user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Service: user lookup for email verification
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(FULL_USER);

      // Free tier: session count + booking count
      (prisma.session.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);
      (prisma.bookingRequest.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);

      // Duplicate check
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      // Overlap check
      (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      // Create booking
      const createdBooking = {
        id: 'booking-new',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
        sessionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.bookingRequest.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdBooking);

      // Matching: booking findUnique inside transaction
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdBooking);
      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      // No match available
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 50 });

      expect(res.status).toBe(201);
      expect(res.body.data.bookingRequest.id).toBe('booking-new');
      expect(res.body.data.session).toBeNull();
    });

    it('should return session when immediate match is found', async () => {
      const slot = futureSlot();

      // Auth middleware
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Service: user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(FULL_USER);

      // Free tier counts
      (prisma.session.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);
      (prisma.bookingRequest.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);

      // No duplicate
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      // No overlap
      (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      // Create booking
      const createdBooking = {
        id: 'booking-1',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
        sessionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.bookingRequest.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdBooking);

      // Matching transaction:
      // tx.bookingRequest.findUnique
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdBooking);
      // tx.block.findMany
      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      // tx.bookingRequest.findFirst — found match!
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-2',
        userId: 'user-2',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
        user: FULL_USER_2,
      });

      const matchedSession = {
        id: 'session-matched',
        user1Id: 'user-2',
        user2Id: 'user-1',
        durationMin: 50,
        status: 'CONFIRMED',
        scheduledAt: slot,
        livekitRoomName: 'session-matched',
        user1: FULL_USER_2,
        user2: FULL_USER,
      };

      // tx.session.create
      (prisma.session.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...matchedSession,
        livekitRoomName: 'pending-temp',
      });
      // tx.session.update
      (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce(matchedSession);
      // tx.bookingRequest.update x2
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      // After match: re-fetch updated booking
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...createdBooking,
        status: 'MATCHED',
        sessionId: 'session-matched',
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 50 });

      expect(res.status).toBe(201);
      expect(res.body.data.session).not.toBeNull();
      expect(res.body.data.session.id).toBe('session-matched');
      expect(res.body.data.session.status).toBe('CONFIRMED');
      expect(res.body.data.bookingRequest.status).toBe('MATCHED');
    });

    it('should return 403 for free tier limit exceeded', async () => {
      const slot = futureSlot();

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);
      // Service user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(FULL_USER);

      // Free tier: 2 completed + 1 matched = 3 (at limit)
      (prisma.session.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(2);
      (prisma.bookingRequest.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(1);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 50 });

      expect(res.status).toBe(403);
      expect(res.body.error).toContain('Free tier limit reached');
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

    it('should return 409 for duplicate booking', async () => {
      const slot = futureSlot();

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);
      // Service user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(FULL_USER);

      // Free tier counts
      (prisma.session.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);
      (prisma.bookingRequest.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);

      // Duplicate found!
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'existing-booking',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
      });

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 50 });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already have a booking');
    });

    it('should return 409 for overlapping session', async () => {
      const slot = futureSlot();

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);
      // Service user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(FULL_USER);

      // Free tier
      (prisma.session.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);
      (prisma.bookingRequest.count as ReturnType<typeof vi.fn>).mockResolvedValueOnce(0);

      // No duplicate
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      // Overlapping session exists (starts 10 minutes before our slot, 50 min duration)
      const overlapStart = new Date(slot.getTime() - 10 * 60 * 1000);
      (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          id: 'overlap-session',
          user1Id: 'user-1',
          durationMin: 50,
          status: 'CONFIRMED',
          scheduledAt: overlapStart,
        },
      ]);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 50 });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('overlapping session');
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

    it('should allow PRO tier user to bypass free limit', async () => {
      const slot = futureSlot();

      const proUser = { ...AUTH_USER, planTier: 'PRO' };
      const fullProUser = { ...FULL_USER, planTier: 'PRO' };

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(proUser);
      // Service user lookup
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(fullProUser);

      // PRO user skips free tier check — no session.count / bookingRequest.count calls

      // No duplicate
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);
      // No overlap
      (prisma.session.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      // Create booking
      const createdBooking = {
        id: 'pro-booking',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
        sessionId: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      (prisma.bookingRequest.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdBooking);

      // Matching — no match
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(createdBooking);
      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/v1/bookings')
        .set('Cookie', [authCookie('user-1')])
        .send({ slotTime: slot.toISOString(), durationMin: 50 });

      expect(res.status).toBe(201);
      // PRO user: session.count and bookingRequest.count should NOT have been called
      expect(prisma.session.count).not.toHaveBeenCalled();
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

    it('should cancel MATCHED booking and revert partner to PENDING', async () => {
      const slot = new Date(Date.now() + 3 * 60 * 60 * 1000); // 3 hours ahead (> 1 hour, no strike)
      slot.setMinutes(0, 0, 0);

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Find booking — MATCHED
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-1',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'MATCHED',
        sessionId: 'session-1',
      });

      // Inside transaction:
      // Update this booking
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
      // Update session
      (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
      // Find partner booking
      const partnerBooking = {
        id: 'booking-2',
        userId: 'user-2',
        slotTime: slot,
        durationMin: 50,
        status: 'MATCHED',
        sessionId: 'session-1',
      };
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(partnerBooking);
      // Update partner booking
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      // Re-trigger matching for partner:
      // tx.bookingRequest.findUnique
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...partnerBooking,
        status: 'PENDING',
        sessionId: null,
      });
      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null); // No new match


      const res = await request(app)
        .delete('/api/v1/bookings/booking-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      expect(res.body.data.success).toBe(true);

      // Verify jobs removed
      expect(removeJob).toHaveBeenCalledWith('session-noshow', 'noshow-session-1');
      expect(removeJob).toHaveBeenCalledWith('session-reminder', 'reminder-24h-session-1');
      expect(removeJob).toHaveBeenCalledWith('session-reminder', 'reminder-5m-session-1');
    });

    it('should trigger re-matching for partner after cancel', async () => {
      const slot = new Date(Date.now() + 3 * 60 * 60 * 1000);
      slot.setMinutes(0, 0, 0);

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Find booking — MATCHED
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-1',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'MATCHED',
        sessionId: 'session-1',
      });

      // Transaction mocks
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
      (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      const partnerBooking = {
        id: 'booking-2',
        userId: 'user-2',
        slotTime: slot,
        durationMin: 50,
        status: 'MATCHED',
        sessionId: 'session-1',
      };
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(partnerBooking);
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});

      // Re-matching for partner — finds a new match (user-3)
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...partnerBooking,
        status: 'PENDING',
        sessionId: null,
      });
      (prisma.block.findMany as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-3',
        userId: 'user-3',
        slotTime: slot,
        durationMin: 50,
        status: 'PENDING',
        user: { id: 'user-3', displayName: 'User 3' },
      });
      (prisma.session.create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'session-new',
        user1Id: 'user-3',
        user2Id: 'user-2',
        durationMin: 50,
        status: 'CONFIRMED',
        scheduledAt: slot,
        livekitRoomName: 'pending',
        user1: { id: 'user-3' },
        user2: { id: 'user-2' },
      });
      (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'session-new',
        livekitRoomName: 'session-new',
      });
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({});

      const res = await request(app)
        .delete('/api/v1/bookings/booking-1')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);

      // Verify session.create was called for re-matching (new session for partner)
      expect(prisma.session.create).toHaveBeenCalled();
    });

    it('should increment strikeCount for late cancellation (< 1 hour)', async () => {
      // Slot is 30 minutes from now (within 1 hour)
      const slot = new Date(Date.now() + 30 * 60 * 1000);
      slot.setMinutes(Math.floor(slot.getMinutes() / 15) * 15, 0, 0);

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Find booking — MATCHED, slot within 1 hour
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-late',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 25,
        status: 'MATCHED',
        sessionId: 'session-late',
      });

      // Transaction mocks
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
      (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null); // No partner found
      // No partner update needed

      // Late cancellation penalty: user.update (increment strikeCount)
      (prisma.user.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ...FULL_USER,
        strikeCount: 1,
      });

      const res = await request(app)
        .delete('/api/v1/bookings/booking-late')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      // Verify strikeCount was incremented
      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: { strikeCount: { increment: 1 } },
        })
      );
    });

    it('should NOT increment strikeCount for early cancellation (> 1 hour)', async () => {
      // Slot is 3 hours from now (> 1 hour)
      const slot = new Date(Date.now() + 3 * 60 * 60 * 1000);
      slot.setMinutes(0, 0, 0);

      // Auth
      (prisma.user.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce(AUTH_USER);

      // Find booking — MATCHED, slot > 1 hour away
      (prisma.bookingRequest.findUnique as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        id: 'booking-early',
        userId: 'user-1',
        slotTime: slot,
        durationMin: 50,
        status: 'MATCHED',
        sessionId: 'session-early',
      });

      // Transaction mocks
      (prisma.bookingRequest.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
      (prisma.session.update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({});
      (prisma.bookingRequest.findFirst as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

      const res = await request(app)
        .delete('/api/v1/bookings/booking-early')
        .set('Cookie', [authCookie('user-1')]);

      expect(res.status).toBe(200);
      // user.update should NOT have been called — no penalty
      expect(prisma.user.update).not.toHaveBeenCalled();
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
