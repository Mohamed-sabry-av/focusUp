/**
 * The session room against a real Postgres: LiveKit webhooks as the only source of presence,
 * tokens, no-show, solo, re-match, "keep going", tasks, and report-and-leave.
 * Run with `bun run test:integration`.
 */
import { createHash } from 'node:crypto';

import { env } from '@focusUp/env/server';
import { AccessToken } from 'livekit-server-sdk';
import request from 'supertest';
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

import app from '../app';
import { RematchService } from '../api/v1/matching/rematch.service';
import { prisma } from '../lib/prisma';
import { processNoshowJob } from '../workers/noshow.worker';
import { createHarness, MINUTE, type TestUser } from './support';

const { createUser, nextSlot, cleanup } = createHarness('@room-int.example.com');

// ── helpers ──────────────────────────────────────────────────────

/** What LiveKit does: POST the event, signed with the API secret and the body's sha256. */
async function livekitWebhook(event: object, secret: string = env.LIVEKIT_API_SECRET): Promise<request.Response> {
  const body = JSON.stringify(event);
  const token = new AccessToken(env.LIVEKIT_API_KEY, secret);
  token.sha256 = createHash('sha256').update(body).digest('base64');
  return request(app)
    .post('/api/v1/webhooks/livekit')
    .set('Authorization', await token.toJwt())
    .set('Content-Type', 'application/webhook+json')
    .send(body);
}

let connectionClock = 1_800_000_000;
function participantEvent(
  kind: 'participant_joined' | 'participant_left',
  sessionId: string,
  userId: string,
  connectedAtSeconds: number = (connectionClock += 10),
) {
  return {
    event: kind,
    room: { name: sessionId },
    participant: { identity: userId, joinedAt: String(connectedAtSeconds) },
    createdAt: String(connectionClock + 1),
    id: `EV_${Math.random().toString(36).slice(2)}`,
  };
}

const join = (sessionId: string, user: TestUser) =>
  livekitWebhook(participantEvent('participant_joined', sessionId, user.id));

/** Two people book the same slot and get matched. */
async function matchedPair(tag: string, options: { aQuiet?: boolean; bQuiet?: boolean } = {}) {
  const slot = nextSlot();
  const a = await createUser(`${tag}-a`);
  const b = await createUser(`${tag}-b`);
  await a.book(slot, { quiet: options.aQuiet ?? false });
  const res = await b.book(slot, { quiet: options.bQuiet ?? false });
  expect(res.status).toBe(201);
  const booking = await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, slotTime: slot } });
  const sessionId = booking.sessionId;
  if (!sessionId) throw new Error('the two bookings were not matched');
  return { a, b, sessionId, slot };
}

/** Moves a session in time: `minutesIn` = how many minutes ago it started (negative = in the future). */
async function startedMinutesAgo(sessionId: string, minutesIn: number): Promise<void> {
  await prisma.session.update({
    where: { id: sessionId },
    data: { scheduledAt: new Date(Date.now() - minutesIn * MINUTE) },
  });
}

const room = async (user: TestUser, sessionId: string) => (await user.get(`/api/v1/sessions/${sessionId}`)).body.data;

function tokenGrants(jwt: string): { video: { canPublishSources?: string[]; room: string }; metadata?: string } {
  const payload = jwt.split('.')[1];
  if (!payload) throw new Error('not a JWT');
  return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
}

beforeAll(cleanup);
afterAll(async () => {
  await cleanup();
  await prisma.$disconnect();
});

// ── webhooks and presence ────────────────────────────────────────

describe('LiveKit webhooks', () => {
  it('rejects a bad signature and changes nothing', async () => {
    const { a, sessionId } = await matchedPair('wh-bad');
    const res = await livekitWebhook(
      participantEvent('participant_joined', sessionId, a.id),
      'another-secret-another-secret-another-secret',
    );
    expect(res.status).toBe(401);
    expect(await prisma.sessionParticipant.count({ where: { sessionId } })).toBe(0);
  });

  it('rejects a request with no signature at all', async () => {
    const res = await request(app)
      .post('/api/v1/webhooks/livekit')
      .set('Content-Type', 'application/webhook+json')
      .send(JSON.stringify({ event: 'participant_joined' }));
    expect(res.status).toBe(401);
  });

  it('turns the session ACTIVE only when both people have joined, and is safe to redeliver', async () => {
    const { a, b, sessionId } = await matchedPair('wh-join');
    await startedMinutesAgo(sessionId, 1);

    expect((await join(sessionId, a)).status).toBe(200);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('CONFIRMED');
    expect((await room(a, sessionId)).partner.isPresent).toBe(false);

    expect((await join(sessionId, b)).status).toBe(200);
    expect((await join(sessionId, b)).status).toBe(200); // redelivery
    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session.status).toBe('ACTIVE');
    expect(await prisma.sessionParticipant.count({ where: { sessionId } })).toBe(2);

    const view = await room(a, sessionId);
    expect(view.phase).toBe('IN_SESSION');
    expect(view.partner.isPresent).toBe(true);
  });

  it('marks someone absent when they leave, but ignores a late "left" of an old connection', async () => {
    const { a, sessionId } = await matchedPair('wh-left');

    await livekitWebhook(participantEvent('participant_joined', sessionId, a.id, 1_800_000_100));
    await livekitWebhook(participantEvent('participant_left', sessionId, a.id, 1_800_000_100));
    expect((await room(a, sessionId)).me.isPresent).toBe(false);

    // Joined again on a new connection; then the old connection's "left" arrives late.
    await livekitWebhook(participantEvent('participant_joined', sessionId, a.id, 1_800_000_200));
    await livekitWebhook(participantEvent('participant_left', sessionId, a.id, 1_800_000_100));
    expect((await room(a, sessionId)).me.isPresent).toBe(true);
  });

  it('ignores a participant who is not in the session', async () => {
    const { sessionId } = await matchedPair('wh-stranger');
    const stranger = await createUser('wh-stranger-x');
    expect((await join(sessionId, stranger)).status).toBe(200);
    expect(await prisma.sessionParticipant.count({ where: { sessionId } })).toBe(0);
  });
});

// ── the room view and the token ──────────────────────────────────

describe('room view and token', () => {
  it('shows the partner, hides a hidden photo, and never trusts the browser for the phase', async () => {
    const slot = nextSlot();
    const a = await createUser('rv-a', { avatarUrl: 'https://example.com/a.png' });
    const b = await createUser('rv-b', { avatarUrl: 'https://example.com/b.png', hidePhoto: true });
    await a.book(slot);
    await b.book(slot, { quiet: false });
    const sessionId = (await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, slotTime: slot } }))
      .sessionId as string;

    const view = await room(a, sessionId);
    expect(view.partner).toMatchObject({ id: b.id, avatarUrl: null, quiet: false });
    expect(view.me.avatarUrl).toBe('https://example.com/a.png');
    expect(view.phase).toBe('UPCOMING');

    await startedMinutesAgo(sessionId, 0.2);
    expect((await room(a, sessionId)).phase).toBe('WAITING_FOR_PARTNER');
  });

  it('refuses a stranger', async () => {
    const { sessionId } = await matchedPair('rv-stranger');
    const stranger = await createUser('rv-stranger-x');
    expect((await stranger.get(`/api/v1/sessions/${sessionId}`)).status).toBe(403);
    expect((await stranger.get(`/api/v1/sessions/${sessionId}/token`)).status).toBe(403);
  });

  it('opens the room 5 minutes before the start, not earlier', async () => {
    const { a, sessionId } = await matchedPair('tk-open');
    expect((await a.get(`/api/v1/sessions/${sessionId}/token`)).status).toBe(403);

    await startedMinutesAgo(sessionId, -4); // starts in 4 minutes
    const res = await a.get(`/api/v1/sessions/${sessionId}/token`);
    expect(res.status).toBe(200);
    expect(tokenGrants(res.body.data.token).video.room).toBe(sessionId);
  });

  it('refuses the microphone to a Quiet person, whatever the browser does', async () => {
    const { a, b, sessionId } = await matchedPair('tk-quiet', { aQuiet: true });
    await startedMinutesAgo(sessionId, 0);

    const quiet = tokenGrants((await a.get(`/api/v1/sessions/${sessionId}/token`)).body.data.token);
    expect(quiet.video.canPublishSources).toEqual(['camera', 'screen_share']);
    expect(JSON.parse(quiet.metadata ?? '{}')).toEqual({ quiet: true });

    const normal = tokenGrants((await b.get(`/api/v1/sessions/${sessionId}/token`)).body.data.token);
    expect(normal.video.canPublishSources).toBeUndefined();
  });

  it('refuses a token once the session has ended', async () => {
    const { a, sessionId } = await matchedPair('tk-ended');
    await prisma.session.update({ where: { id: sessionId }, data: { status: 'COMPLETED', endedAt: new Date() } });
    await startedMinutesAgo(sessionId, 60);
    expect((await a.get(`/api/v1/sessions/${sessionId}/token`)).status).toBe(403);
  });
});

// ── no-show, solo and re-match ───────────────────────────────────

const noshow = (sessionId: string) => processNoshowJob({ data: { sessionId } } as never);
const strikesOf = (userId: string) => prisma.strike.count({ where: { userId } });

describe('no-show (T+5)', () => {
  it('strikes only the person who never came, from the webhook presence', async () => {
    const { a, b, sessionId } = await matchedPair('ns');
    await startedMinutesAgo(sessionId, 6);
    await join(sessionId, a);

    await noshow(sessionId);

    expect(await strikesOf(b.id)).toBe(1);
    expect(await strikesOf(a.id)).toBe(0);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('NO_SHOW');
    expect((await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, sessionId } })).countsToQuota).toBe(
      false,
    );
  });

  it('does nothing when both people came', async () => {
    const { a, b, sessionId } = await matchedPair('ns-both');
    await startedMinutesAgo(sessionId, 6);
    await join(sessionId, a);
    await join(sessionId, b);

    await noshow(sessionId);

    expect(await strikesOf(a.id)).toBe(0);
    expect(await strikesOf(b.id)).toBe(0);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('ACTIVE');
  });
});

describe('solo session (T+3)', () => {
  it('is refused too early, then lets the waiting person continue alone with no strike for them', async () => {
    const { a, b, sessionId } = await matchedPair('solo');
    await startedMinutesAgo(sessionId, 0.5);
    await join(sessionId, a);
    expect((await a.post(`/api/v1/sessions/${sessionId}/solo`)).status).toBe(400);

    await startedMinutesAgo(sessionId, 3.5);
    expect((await room(a, sessionId)).phase).toBe('SOLO_OFFER');
    const res = await a.post(`/api/v1/sessions/${sessionId}/solo`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ isSolo: true, status: 'ACTIVE', phase: 'IN_SESSION' });

    await startedMinutesAgo(sessionId, 6);
    await noshow(sessionId);

    expect(await strikesOf(b.id)).toBe(1);
    expect(await strikesOf(a.id)).toBe(0);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('ACTIVE');
  });

  it('turns back into a real session if the partner arrives late', async () => {
    const { a, b, sessionId } = await matchedPair('solo-late');
    await startedMinutesAgo(sessionId, 3.5);
    await join(sessionId, a);
    await a.post(`/api/v1/sessions/${sessionId}/solo`);

    await join(sessionId, b);
    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session).toMatchObject({ status: 'ACTIVE', isSolo: false });
  });

  it('is refused for someone who is not in the room', async () => {
    const { a, sessionId } = await matchedPair('solo-absent');
    await startedMinutesAgo(sessionId, 3.5);
    expect((await a.post(`/api/v1/sessions/${sessionId}/solo`)).status).toBe(400);
  });
});

describe('re-match (T+1)', () => {
  /** Two sessions at the same time, each with one person in the room and an absent partner. */
  async function twoLonelySessions(tag: string) {
    const slot = nextSlot();
    const [a, b, c, d] = await Promise.all(['a', 'b', 'c', 'd'].map((x) => createUser(`${tag}-${x}`)));
    if (!a || !b || !c || !d) throw new Error('users');
    // a-b match first, then c-d (a and b are no longer waiting)
    await a.book(slot);
    await b.book(slot);
    await c.book(slot);
    await d.book(slot);
    const sessionOf = async (u: TestUser) =>
      (await prisma.bookingRequest.findFirstOrThrow({ where: { userId: u.id, slotTime: slot } })).sessionId as string;
    const ab = await sessionOf(a);
    const cd = await sessionOf(c);
    expect(ab).not.toBe(cd);
    await prisma.session.updateMany({
      where: { id: { in: [ab, cd] } },
      data: { scheduledAt: new Date(Date.now() - 1.5 * MINUTE) },
    });
    await join(ab, a);
    await join(cd, c);
    return { a, b, c, d, ab, cd };
  }

  it('pairs two people who are both waiting alone, and the absent partners still get their strike', async () => {
    const { a, b, c, d, ab, cd } = await twoLonelySessions('rm');

    const result = await RematchService.rematchLonelySession(ab);
    expect(result).not.toBeNull();
    const newId = result?.sessionId as string;

    const created = await prisma.session.findUniqueOrThrow({ where: { id: newId } });
    expect([created.user1Id, created.user2Id].sort()).toEqual([a.id, c.id].sort());
    expect(created.livekitRoomName).toBe(newId);
    expect(created.status).toBe('CONFIRMED');

    // Their bookings moved; the old sessions point to the new one.
    expect((await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, sessionId: newId } })).status).toBe(
      'MATCHED',
    );
    expect((await prisma.session.findUniqueOrThrow({ where: { id: ab } })).rematchedToId).toBe(newId);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: cd } })).rematchedToId).toBe(newId);

    // The browser is told to move.
    const view = await room(a, ab);
    expect(view.rematchedToSessionId).toBe(newId);
    expect(view.phase).toBe('ENDED');
    expect((await a.get(`/api/v1/sessions/${ab}/token`)).status).toBe(409);

    // A second run does nothing (idempotent).
    expect(await RematchService.rematchLonelySession(ab)).toBeNull();
    expect(await RematchService.rematchLonelySession(cd)).toBeNull();

    // T+5: only the people who never came are struck.
    await startedMinutesAgo(ab, 6);
    await startedMinutesAgo(cd, 6);
    await noshow(ab);
    await noshow(cd);
    expect(await strikesOf(b.id)).toBe(1);
    expect(await strikesOf(d.id)).toBe(1);
    expect(await strikesOf(a.id)).toBe(0);
    expect(await strikesOf(c.id)).toBe(0);
    expect((await prisma.bookingRequest.findFirstOrThrow({ where: { userId: a.id, sessionId: newId } })).countsToQuota).toBe(
      true,
    );
  });

  it('never pairs people who have blocked each other', async () => {
    const { a, c, ab } = await twoLonelySessions('rm-block');
    expect((await a.post('/api/v1/blocks', { blockedId: c.id })).status).toBe(201);

    expect(await RematchService.rematchLonelySession(ab)).toBeNull();
    expect((await prisma.session.findUniqueOrThrow({ where: { id: ab } })).rematchedToId).toBeNull();
  });

  it('does nothing when the partner is already in the room', async () => {
    const { a, b, sessionId } = await matchedPair('rm-both');
    await join(sessionId, a);
    await join(sessionId, b);
    expect(await RematchService.rematchLonelySession(sessionId)).toBeNull();
  });
});

// ── keep going, complete, check-out ──────────────────────────────

describe('keep going (+15 minutes)', () => {
  async function activeNearTheEnd(tag: string) {
    const pair = await matchedPair(tag);
    await startedMinutesAgo(pair.sessionId, 46); // 50-minute session, 4 minutes left
    await join(pair.sessionId, pair.a);
    await join(pair.sessionId, pair.b);
    return pair;
  }

  it('extends only the person who asked, up to twice', async () => {
    const { a, b, sessionId } = await activeNearTheEnd('ext');
    const before = await room(a, sessionId);
    expect(before.canExtend).toBe(true);
    expect(before.me.extensionsLeft).toBe(2);

    const res = await a.post(`/api/v1/sessions/${sessionId}/extend`);
    expect(res.status).toBe(200);
    expect(new Date(res.body.data.endsAt).getTime() - new Date(before.endsAt).getTime()).toBe(15 * MINUTE);
    expect(res.body.data.me.extensionsLeft).toBe(1);
    expect((await room(b, sessionId)).endsAt).toBe(before.endsAt); // the partner's time is unchanged

    // Right after the first extension there is nothing to extend yet.
    expect((await a.post(`/api/v1/sessions/${sessionId}/extend`)).status).toBe(400);

    // Near the end of the extension: a second one, then no more.
    await prisma.sessionParticipant.updateMany({
      where: { sessionId, userId: a.id },
      data: { extendedUntil: new Date(Date.now() + 3 * MINUTE) },
    });
    expect((await a.post(`/api/v1/sessions/${sessionId}/extend`)).status).toBe(200);
    await prisma.sessionParticipant.updateMany({
      where: { sessionId, userId: a.id },
      data: { extendedUntil: new Date(Date.now() + 3 * MINUTE) },
    });
    expect((await a.post(`/api/v1/sessions/${sessionId}/extend`)).status).toBe(400);
  });

  it('is not offered in the middle of the session', async () => {
    const { a, b, sessionId } = await matchedPair('ext-early');
    await startedMinutesAgo(sessionId, 10);
    await join(sessionId, a);
    await join(sessionId, b);
    expect((await room(a, sessionId)).canExtend).toBe(false);
    expect((await a.post(`/api/v1/sessions/${sessionId}/extend`)).status).toBe(400);
  });

  it('keeps the extended person in the room after the partner completed the session', async () => {
    const { a, b, sessionId } = await activeNearTheEnd('ext-after');
    await a.post(`/api/v1/sessions/${sessionId}/extend`);

    await startedMinutesAgo(sessionId, 51);
    expect((await b.post(`/api/v1/sessions/${sessionId}/complete`)).status).toBe(200);

    expect((await room(b, sessionId)).phase).toBe('ENDED');
    expect((await room(a, sessionId)).phase).toBe('EXTENDED');
    expect((await a.get(`/api/v1/sessions/${sessionId}/token`)).status).toBe(200);
    expect((await b.get(`/api/v1/sessions/${sessionId}/token`)).status).toBe(403);
  });
});

describe('complete and check-out', () => {
  it('cannot complete a session that is still running, then completes once the time is up', async () => {
    const { a, b, sessionId } = await matchedPair('done');
    await startedMinutesAgo(sessionId, 20);
    await join(sessionId, a);
    await join(sessionId, b);
    expect((await a.post(`/api/v1/sessions/${sessionId}/complete`)).status).toBe(400);

    await startedMinutesAgo(sessionId, 51);
    const res = await a.post(`/api/v1/sessions/${sessionId}/complete`);
    expect(res.status).toBe(200);
    expect(res.body.data.session.status).toBe('COMPLETED');
    expect((await b.post(`/api/v1/sessions/${sessionId}/complete`)).status).toBe(200); // already done

    const reflection = await a.post('/api/v1/sessions/reflections', { sessionId, text: 'Wrote the report', rating: 5 });
    expect(reflection.status).toBe(200);
  });

  it('closes the session when LiveKit reports the room finished after the end time', async () => {
    const { a, b, sessionId } = await matchedPair('done-hook');
    await startedMinutesAgo(sessionId, 20);
    await join(sessionId, a);
    await join(sessionId, b);

    const finished = { event: 'room_finished', room: { name: sessionId }, createdAt: '1800000000', id: 'EV_x' };
    await livekitWebhook(finished); // too early: ignored
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('ACTIVE');

    await startedMinutesAgo(sessionId, 52);
    await livekitWebhook(finished);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).status).toBe('COMPLETED');
  });
});

// ── tasks ────────────────────────────────────────────────────────

describe('tasks', () => {
  it('keeps each person\'s list private, strips HTML and stops at 10', async () => {
    const { a, b, sessionId } = await matchedPair('tasks');
    const base = `/api/v1/sessions/${sessionId}/tasks`;

    const created = await a.post(base, { text: '<b>Write</b> the intro<script>x()</script>' });
    expect(created.status).toBe(201);
    expect(created.body.data.text).toBe('Write the intro');

    const update = await a.patch(`${base}/${created.body.data.id}`, { done: true });
    expect(update.body.data.done).toBe(true);

    // The partner can neither see nor change it.
    expect((await b.get(base)).body.data.tasks).toEqual([]);
    expect((await b.patch(`${base}/${created.body.data.id}`, { done: false })).status).toBe(404);
    expect((await b.del(`${base}/${created.body.data.id}`)).status).toBe(404);

    for (let i = 2; i <= 10; i += 1) expect((await a.post(base, { text: `Task ${i}` })).status).toBe(201);
    const eleventh = await a.post(base, { text: 'Too many' });
    expect(eleventh.status).toBe(400);

    expect((await a.del(`${base}/${created.body.data.id}`)).status).toBe(200);
    expect((await a.get(base)).body.data.tasks).toHaveLength(9);
  });

  it('rejects empty text', async () => {
    const { a, sessionId } = await matchedPair('tasks-empty');
    expect((await a.post(`/api/v1/sessions/${sessionId}/tasks`, { text: '   ' })).status).toBe(400);
    expect((await a.post(`/api/v1/sessions/${sessionId}/tasks`, { text: '<i></i>' })).status).toBe(400);
  });
});

// ── report and leave ─────────────────────────────────────────────

describe('report and leave', () => {
  it('files the report with the chat, blocks both ways, ends the session and gives no automatic strike', async () => {
    const { a, b, sessionId } = await matchedPair('rep');
    await startedMinutesAgo(sessionId, 10);
    await join(sessionId, a);
    await join(sessionId, b);

    const res = await a.post(`/api/v1/sessions/${sessionId}/report`, {
      reason: 'HARASSMENT',
      description: 'Rude <b>messages</b>',
      chat: [
        { from: 'User b', text: 'hello <script>x()</script>', at: new Date().toISOString() },
        { from: 'User rep-a', text: 'please stop', at: new Date().toISOString() },
      ],
    });
    expect(res.status).toBe(201);

    const report = await prisma.report.findFirstOrThrow({ where: { reporterId: a.id, reportedId: b.id, sessionId } });
    expect(report.reason).toBe('HARASSMENT');
    expect(report.description).toBe('Rude messages');
    const chat = report.chatSnapshot as Array<{ from: string; text: string }>;
    expect(chat).toHaveLength(2);
    expect(chat[0]?.text).toBe('hello ');

    expect(await prisma.block.count({ where: { OR: [{ blockerId: a.id, blockedId: b.id }, { blockerId: b.id, blockedId: a.id }] } })).toBe(2);
    const session = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(session).toMatchObject({ status: 'COMPLETED', endedEarly: true });
    expect(await strikesOf(b.id)).toBe(0);
    expect((await room(b, sessionId)).phase).toBe('ENDED');

    // Reporting twice is a conflict, not a second report.
    expect((await a.post(`/api/v1/sessions/${sessionId}/report`, { reason: 'SPAM' })).status).toBe(409);
  });

  it('refuses a stranger and an invalid reason', async () => {
    const { a, sessionId } = await matchedPair('rep-bad');
    const stranger = await createUser('rep-bad-x');
    expect((await stranger.post(`/api/v1/sessions/${sessionId}/report`, { reason: 'SPAM' })).status).toBe(403);
    expect((await a.post(`/api/v1/sessions/${sessionId}/report`, { reason: 'NOT_A_REASON' })).status).toBe(400);
  });
});
