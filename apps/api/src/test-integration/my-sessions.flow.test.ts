/**
 * "My sessions" on the dashboard against a real Postgres: what the upcoming list shows about a
 * partner (and what it never shows), and blocking a partner you are booked with.
 * Run with `bun run test:integration`.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Real database and real auth, but no Redis, queues or sockets.
vi.mock('ioredis', () => ({ default: class {} }));
vi.mock('bullmq', () => ({ Queue: class {}, Worker: class {} }));
vi.mock('../queues/helpers', () => ({
  scheduleNoshowCheck: vi.fn().mockResolvedValue(undefined),
  scheduleRematchChecks: vi.fn().mockResolvedValue(undefined),
  REMATCH_CHECK_MINUTES: [1, 2],
  rematchJobId: (sessionId: string, minute: number) => `rematch-${minute}-${sessionId}`,
  scheduleReminders: vi.fn().mockResolvedValue(undefined),
  scheduleBookingExpiry: vi.fn().mockResolvedValue(undefined),
  removeJob: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/notification.service', () => ({
  NotificationService: {
    notifyMatch: vi.fn().mockResolvedValue(undefined),
    notifyNoShow: vi.fn().mockResolvedValue(undefined),
    notifyRematch: vi.fn().mockResolvedValue(undefined),
    notifyBookingExpired: vi.fn().mockResolvedValue(undefined),
    notifySessionReminder: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../lib/redis', () => ({ redis: { get: vi.fn(), set: vi.fn(), del: vi.fn() } }));
vi.mock('../services/email.transport', () => ({ deliverEmail: vi.fn().mockResolvedValue(undefined) }));

import { prisma } from '../lib/prisma';
import { createHarness } from './support';

const { createUser, nextSlot, cleanup } = createHarness('@mysessions-int.example.com');

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

const strikesOf = (userId: string) => prisma.strike.count({ where: { userId } });

describe('upcoming sessions', () => {
  it('shows the partner by first name and last initial, with their stats, and never the full name', async () => {
    const slot = nextSlot();
    const a = await createUser('up-a', { displayName: 'Layla Hassan' });
    const b = await createUser('up-b', {
      displayName: 'Danielle Hart',
      avatarUrl: 'https://example.com/d.png',
    });
    await prisma.user.update({ where: { id: b.id }, data: { timezone: 'Europe/Berlin' } });
    await a.book(slot, { quiet: true, taskType: 'WALK' });
    await b.book(slot, { quiet: true, taskType: 'WALK' });

    const res = await a.get('/api/v1/sessions/upcoming');
    expect(res.status).toBe(200);
    const session = res.body.data.find((s: { partner: { id: string } }) => s.partner.id === b.id);
    expect(session).toBeDefined();

    const mine = await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, slotTime: slot } });
    expect(session).toMatchObject({
      bookingId: mine.id,
      quiet: true,
      taskType: 'WALK',
      durationMin: 50,
      partner: {
        displayName: 'Danielle H.',
        avatarUrl: 'https://example.com/d.png',
        completedSessions: 0,
        timezone: 'Europe/Berlin',
        isFavorite: false,
      },
    });

    const body = JSON.stringify(res.body);
    for (const secret of ['Danielle Hart', b.email, 'danielle-hart']) expect(body).not.toContain(secret);
  });

  it('hides the photo of someone who chose to hide it', async () => {
    const slot = nextSlot();
    const a = await createUser('up-h-a');
    const b = await createUser('up-h-b', { avatarUrl: 'https://example.com/b.png', hidePhoto: true });
    await a.book(slot);
    await b.book(slot);

    const res = await a.get('/api/v1/sessions/upcoming');
    const session = res.body.data.find((s: { partner: { id: string } }) => s.partner.id === b.id);
    expect(session.partner.avatarUrl).toBeNull();
    expect(JSON.stringify(res.body)).not.toContain('b.png');
  });

  it('counts completed sessions and shows the title I wrote', async () => {
    const slot = nextSlot();
    const a = await createUser('up-c-a');
    const b = await createUser('up-c-b');

    // b has finished two sessions with other people before
    const other = await createUser('up-c-other');
    for (let i = 0; i < 2; i += 1) {
      const s = await prisma.session.create({
        data: {
          user1Id: other.id,
          user2Id: b.id,
          durationMin: 50,
          status: 'COMPLETED',
          scheduledAt: new Date(Date.now() - (i + 2) * 24 * 60 * 60 * 1000),
          livekitRoomName: `done-${Date.now()}-${i}`,
        },
      });
      await prisma.session.update({ where: { id: s.id }, data: { livekitRoomName: s.id } });
    }

    await a.book(slot);
    await b.book(slot);
    const sessionId = (await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, slotTime: slot } }))
      .sessionId as string;
    expect((await a.patch(`/api/v1/sessions/${sessionId}/goal`, { goal: 'Finish chapter 3' })).status).toBe(200);

    const res = await a.get('/api/v1/sessions/upcoming');
    const session = res.body.data.find((s: { id: string }) => s.id === sessionId);
    expect(session.title).toBe('Finish chapter 3');
    expect(session.partner.completedSessions).toBe(2);

    const room = (await a.get(`/api/v1/sessions/${sessionId}`)).body.data;
    expect(room.partner).toMatchObject({ completedSessions: 2 });
    expect(room.partner.displayName).toMatch(/^User \w\S*$/); // first name + initial, never the full name
  });
});

describe('blocking someone you are booked with', () => {
  it('cancels the session with no strike, and the partner goes back to waiting', async () => {
    const slot = nextSlot();
    const a = await createUser('bl-a');
    const b = await createUser('bl-b');
    await a.book(slot);
    await b.book(slot);
    const bookingA = await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, slotTime: slot } });
    const sessionId = bookingA.sessionId as string;

    expect((await a.post('/api/v1/blocks', { blockedId: b.id })).status).toBe(201);

    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('CANCELLED');
    const afterA = await prisma.bookingRequest.findUniqueOrThrow({ where: { id: bookingA.id } });
    expect(afterA.status).toBe('CANCELLED');
    expect(afterA.countsToQuota).toBe(false);
    expect(await strikesOf(a.id)).toBe(0);

    // b is waiting again, and the two are never matched with each other
    const afterB = await prisma.bookingRequest.findFirstOrThrow({ where: { userId: b.id, slotTime: slot } });
    expect(afterB.status).toBe('PENDING');
    expect(afterB.sessionId).toBeNull();
  });

  it('is free even when the session starts in less than an hour (no late-cancel strike)', async () => {
    const a = await createUser('bl-late-a');
    const b = await createUser('bl-late-b');
    const quarter = 15 * 60_000;
    const slot = new Date(Math.ceil((Date.now() + 10 * 60_000) / quarter) * quarter);
    await a.book(slot);
    await b.book(slot);
    expect((await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, slotTime: slot } })).status).toBe(
      'MATCHED',
    );

    expect((await a.post('/api/v1/blocks', { blockedId: b.id })).status).toBe(201);
    expect(await strikesOf(a.id)).toBe(0);
  });

  it('a normal late cancel still costs a strike', async () => {
    const a = await createUser('lc-a');
    const b = await createUser('lc-b');
    const quarter = 15 * 60_000;
    const slot = new Date(Math.ceil((Date.now() + 10 * 60_000) / quarter) * quarter + quarter);
    await a.book(slot);
    await b.book(slot);
    const bookingA = await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, slotTime: slot } });

    expect((await a.del(`/api/v1/bookings/${bookingA.id}`)).status).toBe(200);
    expect(await strikesOf(a.id)).toBe(1);
  });
});
