/**
 * Shared helpers for the real-database tests: real users through Better Auth, and a slot
 * generator. Each test file passes its own e-mail domain, so a file only ever cleans up
 * (and matches) its own people.
 */
import { env } from '@focusUp/env/server';
import request from 'supertest';
import { expect } from 'vitest';

import app from '../app';
import { prisma } from '../lib/prisma';

export const MINUTE = 60_000;
export const DAY = 24 * 60 * MINUTE;
const PASSWORD = 'Correct-Horse-9';

export interface BookingOptions {
  durationMin?: number;
  quiet?: boolean;
  taskType?: 'DESK' | 'WALK' | 'ANY';
  preferFavorites?: boolean;
}

export interface TestUser {
  id: string;
  email: string;
  post: (path: string, body?: object) => request.Test;
  get: (path: string) => request.Test;
  patch: (path: string, body?: object) => request.Test;
  del: (path: string) => request.Test;
  book: (slot: Date, options?: BookingOptions) => Promise<request.Response>;
}

export function createHarness(domain: string) {
  const run = Date.now().toString(36).slice(-6);
  let ipCounter = 0;
  let slotCounter = 0;

  function nextIp(): string {
    ipCounter += 1;
    return `10.40.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
  }

  /** A unique future slot per call (90 minutes apart, inside the 14-day booking horizon). */
  function nextSlot(): Date {
    slotCounter += 1;
    const day = 2 + Math.floor(slotCounter / 14);
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    return new Date(base.getTime() + day * DAY + 6 * 60 * MINUTE + (slotCounter % 14) * 90 * MINUTE);
  }

  async function createUser(
    tag: string,
    extra: { avatarUrl?: string; displayName?: string; hidePhoto?: boolean } = {},
  ): Promise<TestUser> {
    const email = `${tag}.${run}${domain}`;
    const agent = request.agent(app);
    const ip = nextIp();
    const withHeaders = (req: request.Test) => req.set('Origin', env.CORS_ORIGIN).set('X-Forwarded-For', ip);

    const signUp = await withHeaders(agent.post('/api/auth/sign-up/email')).send({
      name: extra.displayName ?? `User ${tag}`,
      email,
      password: PASSWORD,
    });
    expect(signUp.status).toBe(200);

    const user = await prisma.user.update({
      where: { email },
      data: { emailVerified: true, avatarUrl: extra.avatarUrl ?? null, hidePhoto: extra.hidePhoto ?? false },
    });

    return {
      id: user.id,
      email,
      post: (path, body = {}) => withHeaders(agent.post(path)).send(body),
      get: (path) => withHeaders(agent.get(path)),
      patch: (path, body = {}) => withHeaders(agent.patch(path)).send(body),
      del: (path) => withHeaders(agent.delete(path)),
      book: (slot, options = {}) =>
        withHeaders(agent.post('/api/v1/bookings')).send({ slotTime: slot.toISOString(), durationMin: 50, ...options }),
    };
  }

  /** Removes everything this test file created. */
  async function cleanup(): Promise<void> {
    const users = await prisma.user.findMany({ where: { email: { endsWith: domain } }, select: { id: true } });
    const ids = users.map((u) => u.id);
    if (ids.length === 0) return;
    await prisma.report.deleteMany({ where: { OR: [{ reporterId: { in: ids } }, { reportedId: { in: ids } }] } });
    await prisma.reflection.deleteMany({ where: { userId: { in: ids } } });
    await prisma.bookingRequest.deleteMany({ where: { userId: { in: ids } } });
    await prisma.session.deleteMany({ where: { OR: [{ user1Id: { in: ids } }, { user2Id: { in: ids } }] } });
    await prisma.block.deleteMany({ where: { OR: [{ blockerId: { in: ids } }, { blockedId: { in: ids } }] } });
    await prisma.favorite.deleteMany({ where: { OR: [{ userId: { in: ids } }, { favoriteId: { in: ids } }] } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
  }

  return { createUser, nextSlot, cleanup };
}
