/**
 * Auth flows against a real Postgres through the real Better Auth handler.
 * Run with `bun run test:integration` (see apps/api/scripts/test-integration.mjs).
 */
import { env } from '@focusUp/env/server';
import request from 'supertest';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const sentEmails = vi.hoisted(() => [] as Array<{ to: string; subject: string; text: string }>);

// Real flows, but emails are captured instead of sent.
vi.mock('../services/email.transport', () => ({
  deliverEmail: async (email: { to: string; subject: string; text: string }) => {
    sentEmails.push(email);
  },
}));

import app from '../app';
import { prisma } from '../lib/prisma';

const ORIGIN = env.CORS_ORIGIN;
const RUN = Date.now().toString(36).slice(-6);
const PASSWORD = 'Correct-Horse-9';
const createdEmails: string[] = [];

let ipCounter = 0;
/** Each test uses its own client IP so the 5-per-minute auth limit never leaks between tests. */
function nextIp(): string {
  ipCounter += 1;
  return `10.20.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

function emailFor(tag: string): string {
  const email = `${tag}.${RUN}@example.com`;
  createdEmails.push(email);
  return email;
}

function client(ip = nextIp()) {
  const agent = request.agent(app);
  const withHeaders = <T extends request.Test>(req: T): T =>
    req.set('Origin', ORIGIN).set('X-Forwarded-For', ip) as T;
  return {
    agent,
    ip,
    post: (path: string, body: object) => withHeaders(agent.post(path)).send(body),
    get: (path: string) => withHeaders(agent.get(path)),
  };
}

async function signUp(
  tag: string,
  options: { name?: string; timezone?: string } = {},
) {
  const email = emailFor(tag);
  const c = client();
  const res = await c.post('/api/auth/sign-up/email', {
    name: options.name ?? 'Test User',
    email,
    password: PASSWORD,
    timezone: options.timezone,
    callbackURL: `${ORIGIN}/dashboard`,
  });
  return { c, email, res };
}

function lastEmailTo(email: string) {
  return [...sentEmails].reverse().find((m) => m.to === email);
}

function linkIn(text: string): URL {
  const match = /(https?:\/\/\S+)/.exec(text);
  if (!match || !match[1]) throw new Error(`No link found in email:\n${text}`);
  return new URL(match[1]);
}

function futureSlot(): string {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  d.setMinutes(Math.floor(d.getMinutes() / 15) * 15, 0, 0);
  return d.toISOString();
}

describe('auth flows (real database)', () => {
  beforeEach(() => {
    sentEmails.length = 0;
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { email: { in: createdEmails } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    await prisma.bookingRequest.deleteMany({ where: { userId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  });

  describe('sign-up', () => {
    it('creates a user with a generated username and the browser timezone', async () => {
      const { email, res } = await signUp('signup', { name: 'Layla Hassan', timezone: 'Africa/Cairo' });

      expect(res.status).toBe(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.displayName).toBe('Layla Hassan');
      expect(user.timezone).toBe('Africa/Cairo');
      expect(user.emailVerified).toBe(false);
      expect(user.username).toMatch(/^[a-zA-Z0-9_-]{3,30}$/);
      expect(user.planTier).toBe('FREE');
      expect(user.isAdmin).toBe(false);
    });

    it('stores only a hash of the password', async () => {
      const { email } = await signUp('hash');
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      const account = await prisma.account.findFirstOrThrow({
        where: { userId: user.id, providerId: 'credential' },
      });
      expect(account.password).toBeTruthy();
      expect(account.password).not.toContain(PASSWORD);
    });

    it('sends a verification email with a link back to the API', async () => {
      const { email } = await signUp('verifymail');
      const mail = lastEmailTo(email);
      expect(mail?.subject).toMatch(/verify/i);
      const link = linkIn(mail!.text);
      expect(link.pathname).toBe('/api/auth/verify-email');
      expect(link.searchParams.get('callbackURL')).toBe(`${ORIGIN}/dashboard`);
    });

    it('ignores a client trying to set its own role or plan', async () => {
      const email = emailFor('mass-assign');
      const res = await client().post('/api/auth/sign-up/email', {
        name: 'Sneaky',
        email,
        password: PASSWORD,
        isAdmin: true,
        planTier: 'PRO',
        isBanned: false,
      });
      expect(res.status).toBe(200);
      const user = await prisma.user.findUniqueOrThrow({ where: { email } });
      expect(user.isAdmin).toBe(false);
      expect(user.planTier).toBe('FREE');
    });

    it('refuses a client-chosen username (usernames are generated)', async () => {
      const email = emailFor('pick-username');
      const res = await client().post('/api/auth/sign-up/email', {
        name: 'Picky',
        email,
        password: PASSWORD,
        username: 'i-choose-this',
      });
      expect(res.status).toBe(400);
      expect(await prisma.user.findUnique({ where: { email } })).toBeNull();
    });

    it('rejects a duplicate email and a too-short password', async () => {
      const { email } = await signUp('dup');
      const again = await client().post('/api/auth/sign-up/email', {
        name: 'Other',
        email,
        password: PASSWORD,
      });
      expect(again.status).toBe(422);

      const short = await client().post('/api/auth/sign-up/email', {
        name: 'Short',
        email: emailFor('short'),
        password: 'abc',
      });
      expect(short.status).toBe(400);
    });

    it('gives two people with the same email name different usernames', async () => {
      const local = `same${RUN}`;
      const a = `${local}@a.example.com`;
      const b = `${local}@b.example.com`;
      createdEmails.push(a, b);
      await client().post('/api/auth/sign-up/email', { name: 'A', email: a, password: PASSWORD });
      await client().post('/api/auth/sign-up/email', { name: 'B', email: b, password: PASSWORD });

      const [userA, userB] = await Promise.all([
        prisma.user.findUniqueOrThrow({ where: { email: a } }),
        prisma.user.findUniqueOrThrow({ where: { email: b } }),
      ]);
      expect(userA.username).not.toBe(userB.username);
    });
  });

  describe('email verification gate', () => {
    it('lets an unverified user in, but blocks booking until the email is verified', async () => {
      const { c, email } = await signUp('gate');

      const me = await c.get('/api/v1/users/me');
      expect(me.status).toBe(200);
      expect(me.body.data.user.emailVerified).toBe(false);

      const blocked = await c.post('/api/v1/bookings', { slotTime: futureSlot(), durationMin: 50 });
      expect(blocked.status).toBe(403);
      expect(blocked.body.error).toBe('Please verify your email first');

      const link = linkIn(lastEmailTo(email)!.text);
      const verify = await c.agent.get(link.pathname + link.search).set('X-Forwarded-For', c.ip);
      expect(verify.status).toBe(302);
      expect(verify.headers.location).toBe(`${ORIGIN}/dashboard`);

      const ok = await c.post('/api/v1/bookings', { slotTime: futureSlot(), durationMin: 50 });
      expect(ok.status).toBe(201);
    });
  });

  describe('sign-in and sign-out', () => {
    it('signs in, reads the session, and signs out', async () => {
      const { email } = await signUp('session');

      const c = client();
      const bad = await c.post('/api/auth/sign-in/email', { email, password: 'wrong-password-1' });
      expect(bad.status).toBe(401);
      expect((await c.get('/api/v1/users/me')).status).toBe(401);

      const good = await c.post('/api/auth/sign-in/email', { email, password: PASSWORD });
      expect(good.status).toBe(200);
      const cookies = good.headers['set-cookie'] as unknown as string[];
      expect(cookies.join(';')).toMatch(/focusup\.session_token=.*HttpOnly/i);

      expect((await c.get('/api/v1/users/me')).status).toBe(200);

      await c.post('/api/auth/sign-out', {});
      expect((await c.get('/api/v1/users/me')).status).toBe(401);
    });

    it('rate limits repeated sign-in attempts from one address', async () => {
      const email = emailFor('ratelimit');
      const c = client();
      const statuses: number[] = [];
      for (let i = 0; i < 8; i++) {
        statuses.push((await c.post('/api/auth/sign-in/email', { email, password: 'wrong-password-1' })).status);
      }
      expect(statuses.slice(0, 3)).toEqual([401, 401, 401]);
      expect(statuses).toContain(429);
    });
  });

  describe('password reset', () => {
    it('resets the password, revokes other sessions, and rejects the old password', async () => {
      const { c: first, email } = await signUp('reset');
      expect((await first.get('/api/v1/users/me')).status).toBe(200);

      const requester = client();
      const asked = await requester.post('/api/auth/request-password-reset', {
        email,
        redirectTo: `${ORIGIN}/reset-password`,
      });
      expect(asked.status).toBe(200);

      const link = linkIn(lastEmailTo(email)!.text);
      const follow = await requester.agent.get(link.pathname + link.search).set('X-Forwarded-For', requester.ip);
      expect(follow.status).toBe(302);
      const token = new URL(follow.headers.location!).searchParams.get('token');
      expect(token).toBeTruthy();

      const NEW_PASSWORD = 'Brand-New-Pass-7';
      const done = await requester.post('/api/auth/reset-password', { newPassword: NEW_PASSWORD, token });
      expect(done.status).toBe(200);

      // The session from before the reset no longer works.
      expect((await first.get('/api/v1/users/me')).status).toBe(401);

      const oldPw = await client().post('/api/auth/sign-in/email', { email, password: PASSWORD });
      expect(oldPw.status).toBe(401);
      const newPw = await client().post('/api/auth/sign-in/email', { email, password: NEW_PASSWORD });
      expect(newPw.status).toBe(200);
    });

    it('does not reveal whether an email has an account', async () => {
      const res = await client().post('/api/auth/request-password-reset', {
        email: `nobody.${RUN}@example.com`,
        redirectTo: `${ORIGIN}/reset-password`,
      });
      expect(res.status).toBe(200);
    });
  });

  describe('banned and deactivated accounts', () => {
    it('blocks existing sessions at once and refuses new sign-ins', async () => {
      const { c, email } = await signUp('banned');
      expect((await c.get('/api/v1/users/me')).status).toBe(200);

      await prisma.user.update({ where: { email }, data: { isBanned: true } });

      const existing = await c.get('/api/v1/users/me');
      expect(existing.status).toBe(403);
      expect(existing.body.error).toBe('Account suspended');

      const fresh = await client().post('/api/auth/sign-in/email', { email, password: PASSWORD });
      expect(fresh.status).toBe(403);
    });

    it('blocks a deactivated account', async () => {
      const { c, email } = await signUp('inactive');
      await prisma.user.update({ where: { email }, data: { isActive: false } });
      const res = await c.get('/api/v1/users/me');
      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Account deactivated');
    });
  });

  describe('Google sign-in', () => {
    it('builds the redirect to Google when credentials are configured', async () => {
      if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return;
      const res = await client().post('/api/auth/sign-in/social', {
        provider: 'google',
        callbackURL: `${ORIGIN}/dashboard`,
      });
      expect(res.status).toBe(200);
      const url = new URL(res.body.url);
      expect(url.host).toBe('accounts.google.com');
      expect(url.searchParams.get('redirect_uri')).toBe(`${env.BETTER_AUTH_URL}/api/auth/callback/google`);
    });
  });
});
