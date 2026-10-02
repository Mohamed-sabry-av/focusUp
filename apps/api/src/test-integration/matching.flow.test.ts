/**
 * Booking, matching, favorites and strikes against a real Postgres, through the real
 * Express app and Better Auth. Run with `bun run test:integration`.
 */
import { env } from '@focusUp/env/server';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

// Real database and real auth, but no Redis, queues or sockets.
vi.mock('../queues/helpers', () => ({
  scheduleNoshowCheck: vi.fn().mockResolvedValue(undefined),
  scheduleReminders: vi.fn().mockResolvedValue(undefined),
  scheduleBookingExpiry: vi.fn().mockResolvedValue(undefined),
  removeJob: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../services/notification.service', () => ({
  NotificationService: {
    notifyMatch: vi.fn().mockResolvedValue(undefined),
    notifyNoShow: vi.fn().mockResolvedValue(undefined),
    notifyBookingExpired: vi.fn().mockResolvedValue(undefined),
    notifySessionReminder: vi.fn().mockResolvedValue(undefined),
  },
}));
vi.mock('../lib/redis', () => ({ redis: { get: vi.fn(), set: vi.fn(), del: vi.fn(), smembers: vi.fn() } }));
vi.mock('../services/email.transport', () => ({ deliverEmail: vi.fn().mockResolvedValue(undefined) }));

import app from '../app';
import { prisma } from '../lib/prisma';
import { addStrike } from '../services/strikes.service';

const ORIGIN = env.CORS_ORIGIN;
const RUN = Date.now().toString(36).slice(-6);
const DOMAIN = '@match-int.example.com';
const PASSWORD = 'Correct-Horse-9';
const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;

// ── helpers ──────────────────────────────────────────────────────

let ipCounter = 0;
function nextIp(): string {
  ipCounter += 1;
  return `10.30.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

let slotCounter = 0;
/**
 * A unique future slot per call, so tests never match each other's leftovers. Slots are
 * 90 minutes apart, so one person's 50-minute sessions never overlap by accident.
 */
function nextSlot(): Date {
  slotCounter += 1;
  const day = 2 + Math.floor(slotCounter / 14); // 2..13 days ahead, inside the 14-day horizon
  const base = new Date();
  base.setUTCHours(0, 0, 0, 0);
  return new Date(base.getTime() + day * DAY + 6 * 60 * MINUTE + (slotCounter % 14) * 90 * MINUTE);
}

/** A slot between 10 and 55 minutes from now: close enough that cancelling is "late". */
function lateSlot(k: number): Date {
  const start = Date.now() + 10 * MINUTE;
  const quarter = 15 * MINUTE;
  return new Date(Math.ceil(start / quarter) * quarter + k * quarter);
}

type Options = Partial<{ durationMin: number; cameraOn: boolean; quiet: boolean; taskType: 'DESK' | 'WALK' }>;

interface TestUser {
  id: string;
  email: string;
  post: (path: string, body?: object) => request.Test;
  get: (path: string) => request.Test;
  del: (path: string) => request.Test;
  book: (slot: Date, options?: Options) => Promise<request.Response>;
}

async function createUser(tag: string, extra: { avatarUrl?: string; displayName?: string } = {}): Promise<TestUser> {
  const email = `${tag}.${RUN}${DOMAIN}`;
  const agent = request.agent(app);
  const ip = nextIp();
  const withHeaders = (req: request.Test) => req.set('Origin', ORIGIN).set('X-Forwarded-For', ip);

  const signUp = await withHeaders(agent.post('/api/auth/sign-up/email')).send({
    name: extra.displayName ?? `User ${tag}`,
    email,
    password: PASSWORD,
  });
  expect(signUp.status).toBe(200);

  const user = await prisma.user.update({
    where: { email },
    data: { emailVerified: true, avatarUrl: extra.avatarUrl ?? null },
  });

  return {
    id: user.id,
    email,
    post: (path, body = {}) => withHeaders(agent.post(path)).send(body),
    get: (path) => withHeaders(agent.get(path)),
    del: (path) => withHeaders(agent.delete(path)),
    book: (slot, options = {}) =>
      withHeaders(agent.post('/api/v1/bookings')).send({ slotTime: slot.toISOString(), durationMin: 50, ...options }),
  };
}

const bookingOf = (userId: string, slot: Date) =>
  prisma.bookingRequest.findFirstOrThrow({ where: { userId, slotTime: slot }, orderBy: { createdAt: 'desc' } });

async function cleanup(): Promise<void> {
  const users = await prisma.user.findMany({ where: { email: { endsWith: DOMAIN } }, select: { id: true } });
  const ids = users.map((u) => u.id);
  if (ids.length === 0) return;
  await prisma.reflection.deleteMany({ where: { userId: { in: ids } } });
  await prisma.bookingRequest.deleteMany({ where: { userId: { in: ids } } });
  await prisma.session.deleteMany({ where: { OR: [{ user1Id: { in: ids } }, { user2Id: { in: ids } }] } });
  await prisma.block.deleteMany({ where: { OR: [{ blockerId: { in: ids } }, { blockedId: { in: ids } }] } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

// ── matching ─────────────────────────────────────────────────────

describe('matching', () => {
  it('matches two people who book the same slot and duration, and locks the match', async () => {
    const slot = nextSlot();
    const [a, b] = [await createUser('m-a'), await createUser('m-b')];

    const first = await a.book(slot);
    expect(first.status).toBe(201);
    expect(first.body.data.session).toBeNull();

    const second = await b.book(slot);
    expect(second.status).toBe(201);
    const session = second.body.data.session;
    expect(session.status).toBe('CONFIRMED');
    expect(session.livekitRoomName).toBe(session.id); // room name = session id, never a user id
    expect(session.user1Id).toBe(a.id); // the person who waited longer is user1
    expect(session.user2Id).toBe(b.id);

    const [bookingA, bookingB] = [await bookingOf(a.id, slot), await bookingOf(b.id, slot)];
    expect([bookingA.status, bookingB.status]).toEqual(['MATCHED', 'MATCHED']);
    expect(bookingA.sessionId).toBe(session.id);
    expect(bookingB.sessionId).toBe(session.id);
  });

  it('does not match different durations', async () => {
    const slot = nextSlot();
    const [a, b] = [await createUser('d-a'), await createUser('d-b')];
    await a.book(slot, { durationMin: 25 });
    const res = await b.book(slot, { durationMin: 50 });
    expect(res.body.data.session).toBeNull();
  });

  it('still matches people whose camera and Quiet choices differ (they only affect who is picked first)', async () => {
    const slot = nextSlot();
    const [a, b] = [await createUser('x-a'), await createUser('x-b')];
    await a.book(slot, { cameraOn: false, quiet: true, taskType: 'WALK' });
    const res = await b.book(slot, { cameraOn: true, quiet: false, taskType: 'DESK' });
    expect(res.body.data.session).not.toBeNull();
  });

  it('picks the better-fitting partner over the one who waited longer', async () => {
    const slot = nextSlot();
    const [waitedLonger, fitsBetter, me] = [
      await createUser('f-old'),
      await createUser('f-fit'),
      await createUser('f-me'),
    ];
    // The two candidates have blocked each other, so both keep waiting for the same slot
    await waitedLonger.post('/api/v1/blocks', { blockedId: fitsBetter.id });
    await waitedLonger.book(slot, { cameraOn: false });
    await fitsBetter.book(slot, { cameraOn: true });

    const res = await me.book(slot, { cameraOn: true });
    expect(res.body.data.session.user1Id).toBe(fitsBetter.id);
    expect((await bookingOf(waitedLonger.id, slot)).status).toBe('PENDING');
  });

  it('picks a favorite first, even when they fit worse and booked later', async () => {
    const slot = nextSlot();
    const [stranger, favorite, me] = [
      await createUser('v-old'),
      await createUser('v-fav'),
      await createUser('v-me'),
    ];
    await me.post('/api/v1/favorites', { favoriteId: favorite.id });

    await stranger.post('/api/v1/blocks', { blockedId: favorite.id }); // so both keep waiting
    await stranger.book(slot, { cameraOn: true });
    await favorite.book(slot, { cameraOn: false, quiet: true, taskType: 'WALK' });

    const res = await me.book(slot, { cameraOn: true });
    expect(res.body.data.session.user1Id).toBe(favorite.id);
  });

  it('never matches two people when either has blocked the other', async () => {
    const [blocker, blocked] = [await createUser('b-a'), await createUser('b-b')];
    await blocker.post('/api/v1/blocks', { blockedId: blocked.id });

    const slot1 = nextSlot();
    await blocker.book(slot1);
    expect((await blocked.book(slot1)).body.data.session).toBeNull();

    const slot2 = nextSlot(); // and the other way round
    await blocked.book(slot2);
    expect((await blocker.book(slot2)).body.data.session).toBeNull();
  });

  it('skips banned and suspended people', async () => {
    const slot = nextSlot();
    const [banned, suspended, healthy] = [
      await createUser('s-ban'),
      await createUser('s-sus'),
      await createUser('s-ok'),
    ];
    await banned.book(slot);
    await suspended.book(slot);
    await prisma.user.update({ where: { id: banned.id }, data: { isBanned: true } });
    await prisma.user.update({ where: { id: suspended.id }, data: { suspendedUntil: new Date(Date.now() + DAY) } });

    const res = await healthy.book(slot);
    expect(res.body.data.session).toBeNull();
  });

  it('never double-matches when several people book at the same moment', async () => {
    const slot = nextSlot();
    const [waiting, x, y] = [await createUser('c-w'), await createUser('c-x'), await createUser('c-y')];
    await waiting.book(slot);

    const results = await Promise.all([x.book(slot), y.book(slot)]);
    expect(results.map((r) => r.status)).toEqual([201, 201]);

    const sessions = await prisma.session.findMany({ where: { scheduledAt: slot } });
    expect(sessions).toHaveLength(1); // exactly one pair from three people

    const bookings = await prisma.bookingRequest.findMany({ where: { slotTime: slot } });
    expect(bookings.filter((b) => b.status === 'MATCHED')).toHaveLength(2);
    expect(bookings.filter((b) => b.status === 'PENDING')).toHaveLength(1);

    const inSession = [sessions[0]!.user1Id, sessions[0]!.user2Id];
    expect(new Set(inSession).size).toBe(2); // nobody is in a session with themselves
  });
});

// ── booking rules ────────────────────────────────────────────────

describe('booking rules', () => {
  it('allows booking up to 14 days ahead and refuses further', async () => {
    const user = await createUser('r-horizon');
    const base = new Date();
    base.setUTCHours(10, 0, 0, 0);

    expect((await user.book(new Date(base.getTime() + 13 * DAY))).status).toBe(201);

    const tooFar = await user.book(new Date(base.getTime() + 15 * DAY));
    expect(tooFar.status).toBe(400);
    expect(tooFar.body.error).toContain('14 days');
  });

  it('allows at most 3 upcoming bookings', async () => {
    const user = await createUser('r-max3');
    for (let i = 0; i < 3; i++) expect((await user.book(nextSlot())).status).toBe(201);

    const fourth = await user.book(nextSlot());
    expect(fourth.status).toBe(409);
    expect(fourth.body.error).toContain('at most 3');
  });

  it('refuses a second booking at the same time, or one that overlaps', async () => {
    const user = await createUser('r-overlap');
    const slot = nextSlot();
    expect((await user.book(slot, { durationMin: 50 })).status).toBe(201);

    const same = await user.book(slot, { durationMin: 50 });
    expect(same.status).toBe(409);
    expect(same.body.error).toContain('already have a booking for this time slot');

    const overlapping = await user.book(new Date(slot.getTime() + 30 * MINUTE), { durationMin: 25 });
    expect(overlapping.status).toBe(409);
    expect(overlapping.body.error).toContain('overlaps');

    const afterIt = await user.book(new Date(slot.getTime() + 60 * MINUTE), { durationMin: 25 });
    expect(afterIt.status).toBe(201); // back to back is fine once the first one ends
  });

  it('lets someone rebook a slot they cancelled', async () => {
    const user = await createUser('r-rebook');
    const slot = nextSlot();
    const created = await user.book(slot);
    const cancelled = await user.del(`/api/v1/bookings/${created.body.data.bookingRequest.id}`);
    expect(cancelled.status).toBe(200);

    expect((await user.book(slot)).status).toBe(201);
  });

  it('stores the options and defaults to camera on, not Quiet, Desk', async () => {
    const user = await createUser('r-options');
    const withOptions = nextSlot();
    const defaults = nextSlot();
    await user.book(withOptions, { cameraOn: false, quiet: true, taskType: 'WALK' });
    await user.book(defaults);

    expect(await bookingOf(user.id, withOptions)).toMatchObject({ cameraOn: false, quiet: true, taskType: 'WALK' });
    expect(await bookingOf(user.id, defaults)).toMatchObject({ cameraOn: true, quiet: false, taskType: 'DESK', flexible: true });
  });

  it('does not enforce the weekly free limit while the quota is switched off', async () => {
    expect(env.QUOTA_ENFORCED).toBe(false);
    const user = await createUser('r-quota');
    const slot = nextSlot();
    await prisma.bookingRequest.createMany({
      data: Array.from({ length: 7 }, (_, i) => ({
        userId: user.id,
        slotTime: new Date(slot.getTime() + i * 60 * MINUTE),
        durationMin: 25,
        status: 'COMPLETED' as const,
      })),
    });
    expect((await user.book(slot)).status).toBe(201);
  });
});

// ── cancellation and strikes ─────────────────────────────────────

describe('cancelling', () => {
  it('is free at least an hour ahead: no strike, the partner goes back to waiting and is rematched', async () => {
    const slot = nextSlot();
    const [a, b, c] = [await createUser('k-a'), await createUser('k-b'), await createUser('k-c')];

    const matched = await b.book(slot).then(async () => a.book(slot));
    const aBooking = matched.body.data.bookingRequest;
    expect((await c.book(slot)).body.data.session).toBeNull(); // c waits: a and b are taken

    const res = await a.del(`/api/v1/bookings/${aBooking.id}`);
    expect(res.status).toBe(200);

    expect(await bookingOf(a.id, slot)).toMatchObject({ status: 'CANCELLED', countsToQuota: false });
    expect(await prisma.strike.count({ where: { userId: a.id } })).toBe(0);

    // b was put back to waiting, found c, and is matched again with a brand-new session
    const bAfter = await bookingOf(b.id, slot);
    const cAfter = await bookingOf(c.id, slot);
    expect([bAfter.status, cAfter.status]).toEqual(['MATCHED', 'MATCHED']);
    expect(bAfter.sessionId).toBe(cAfter.sessionId);
    expect(bAfter.sessionId).not.toBe(aBooking.sessionId);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: aBooking.sessionId } })).status).toBe('CANCELLED');
  });

  it('is a strike inside the last hour; the partner goes back to waiting', async () => {
    const slot = lateSlot(0);
    const [a, b] = [await createUser('l-a'), await createUser('l-b')];
    await a.book(slot);
    const matched = await b.book(slot);

    const res = await b.del(`/api/v1/bookings/${matched.body.data.bookingRequest.id}`);
    expect(res.status).toBe(200);

    expect((await bookingOf(b.id, slot)).status).toBe('LATE_CANCELLED');
    expect(await prisma.strike.count({ where: { userId: b.id, reason: 'LATE_CANCEL' } })).toBe(1);
    expect(await prisma.strike.count({ where: { userId: a.id } })).toBe(0);
    expect(await bookingOf(a.id, slot)).toMatchObject({ status: 'PENDING', sessionId: null });
  });

  it('suspends for 3 days at the 5th strike inside 30 days, and then refuses new bookings', async () => {
    const slot = lateSlot(1);
    const [a, b] = [await createUser('p-a'), await createUser('p-b')];
    // Four recent strikes already (earlier no-shows)
    for (let i = 0; i < 4; i++) {
      await addStrike({ userId: b.id, reason: 'ADMIN', note: `earlier ${i}` });
    }
    await a.book(slot);
    const matched = await b.book(slot);

    await b.del(`/api/v1/bookings/${matched.body.data.bookingRequest.id}`); // the 5th

    const after = await prisma.user.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.suspendedUntil).not.toBeNull();
    const days = (after.suspendedUntil!.getTime() - Date.now()) / DAY;
    expect(days).toBeGreaterThan(2.9);
    expect(days).toBeLessThanOrEqual(3);

    const blocked = await b.book(nextSlot());
    expect(blocked.status).toBe(403);
    expect(blocked.body.error).toContain('suspended until');

    // Signing in still works, so the person can see why
    expect((await b.get('/api/v1/users/me')).status).toBe(200);
  });

  it('does not count strikes older than 30 days', async () => {
    const slot = lateSlot(2);
    const [a, b] = [await createUser('o-a'), await createUser('o-b')];
    const old = new Date(Date.now() - 31 * DAY);
    await prisma.strike.createMany({
      data: Array.from({ length: 4 }, () => ({ userId: b.id, reason: 'ADMIN' as const, createdAt: old })),
    });
    await a.book(slot);
    const matched = await b.book(slot);

    await b.del(`/api/v1/bookings/${matched.body.data.bookingRequest.id}`); // only 1 strike counts

    const after = await prisma.user.findUniqueOrThrow({ where: { id: b.id } });
    expect(after.suspendedUntil).toBeNull();
    expect(await prisma.strike.count({ where: { userId: b.id } })).toBe(5); // strikes are kept, they just stop counting
  });

  it('gives a booking at most one strike per reason, even if the job runs twice', async () => {
    const user = await createUser('i-a');
    const booking = await prisma.bookingRequest.create({
      data: { userId: user.id, slotTime: nextSlot(), durationMin: 50, status: 'MATCHED' },
    });
    const first = await addStrike({ userId: user.id, reason: 'NO_SHOW', bookingRequestId: booking.id });
    const again = await addStrike({ userId: user.id, reason: 'NO_SHOW', bookingRequestId: booking.id });

    expect(first.added).toBe(true);
    expect(again.added).toBe(false);
    expect(await prisma.strike.count({ where: { userId: user.id } })).toBe(1);
  });
});

// ── favorites and the calendar ───────────────────────────────────

describe('favorites', () => {
  it('adds, lists and removes favorites, and refuses yourself', async () => {
    const [me, friend] = [await createUser('fav-me'), await createUser('fav-friend')];

    expect((await me.post('/api/v1/favorites', { favoriteId: me.id })).status).toBe(400);
    expect((await me.post('/api/v1/favorites', { favoriteId: friend.id })).status).toBe(201);
    expect((await me.post('/api/v1/favorites', { favoriteId: friend.id })).status).toBe(201); // idempotent

    const list = await me.get('/api/v1/favorites');
    expect(list.body.data.favorites.map((f: { id: string }) => f.id)).toEqual([friend.id]);

    expect((await me.del(`/api/v1/favorites/${friend.id}`)).status).toBe(200);
    expect((await me.get('/api/v1/favorites')).body.data.favorites).toEqual([]);
  });

  it('is removed in both directions when one person blocks the other, and cannot be re-added', async () => {
    const [a, b] = [await createUser('fb-a'), await createUser('fb-b')];
    await a.post('/api/v1/favorites', { favoriteId: b.id });
    await b.post('/api/v1/favorites', { favoriteId: a.id });

    expect((await a.post('/api/v1/blocks', { blockedId: b.id })).status).toBe(201);

    expect(await prisma.favorite.count({ where: { OR: [{ userId: a.id }, { userId: b.id }] } })).toBe(0);
    expect((await a.post('/api/v1/favorites', { favoriteId: b.id })).status).toBe(409);
    expect((await b.post('/api/v1/favorites', { favoriteId: a.id })).status).toBe(409);
  });
});

describe('calendar (available bookings)', () => {
  const dateOf = (slot: Date) => slot.toISOString().slice(0, 10);
  const availableFor = (viewer: TestUser, slot: Date) =>
    viewer.get(`/api/v1/bookings/available?date=${dateOf(slot)}&days=1`);

  it('shows who is waiting with their options, marks favorites, and hides blocked people', async () => {
    const slot = nextSlot();
    const [viewer, waiting, blockedOne] = [
      await createUser('cal-v'),
      await createUser('cal-w', { displayName: 'Layla Hassan', avatarUrl: 'https://img.example/layla.png' }),
      await createUser('cal-x'),
    ];
    await waiting.post('/api/v1/blocks', { blockedId: blockedOne.id }); // so the two do not match each other
    await waiting.book(slot, { cameraOn: false, quiet: true, taskType: 'WALK' });
    await blockedOne.book(slot);
    await viewer.post('/api/v1/blocks', { blockedId: blockedOne.id });
    await viewer.post('/api/v1/favorites', { favoriteId: waiting.id });

    const res = await availableFor(viewer, slot);
    expect(res.status).toBe(200);
    const bookings = res.body.data.bookings as Array<{
      cameraOn: boolean; quiet: boolean; taskType: string; isFavorite: boolean;
      user: { id: string; avatarUrl: string | null; initials: string };
    }>;
    // Everyone waiting that day is listed, so look for our own users
    expect(bookings.some((b) => b.user.id === blockedOne.id)).toBe(false); // blocked people are not shown
    const entry = bookings.find((b) => b.user.id === waiting.id);
    expect(entry).toMatchObject({ cameraOn: false, quiet: true, taskType: 'WALK', isFavorite: true });
    expect(entry!.user).toMatchObject({ avatarUrl: 'https://img.example/layla.png', initials: 'LH' });
  });

  it('shows initials instead of the photo when the person hides their photo', async () => {
    const slot = nextSlot();
    const [viewer, shy] = [
      await createUser('cal-v2'),
      await createUser('cal-shy', { displayName: 'Omar Test', avatarUrl: 'https://img.example/omar.png' }),
    ];
    await prisma.user.update({ where: { id: shy.id }, data: { hidePhoto: true } });
    await shy.book(slot);

    const body = (await availableFor(viewer, slot)).body;
    const entries = body.data.bookings as Array<{ user: { id: string; avatarUrl: string | null; initials: string } }>;
    const entry = entries.find((b) => b.user.id === shy.id);
    expect(entry!.user.avatarUrl).toBeNull(); // the photo URL never leaves the server
    expect(entry!.user.initials).toBe('OT');
    expect(JSON.stringify(body)).not.toContain('omar.png');
  });
});
