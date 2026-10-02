import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';

vi.mock('../lib/auth', () => ({
  auth: { api: { getSession: vi.fn() } },
}));

vi.mock('../lib/prisma', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));

import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../utils/errors';
import { authMiddleware, requireAuth } from './auth';
import { requireVerified } from './require-verified';

const getSession = auth.api.getSession as unknown as ReturnType<typeof vi.fn>;
const findUser = prisma.user.findUnique as unknown as ReturnType<typeof vi.fn>;

const dbUser = {
  id: 'user-1',
  email: 'a@example.com',
  username: 'a-user',
  planTier: 'FREE',
  isActive: true,
  isBanned: false,
  emailVerified: true,
  isAdmin: false,
};

function fakeRequest(): Request {
  return { headers: { cookie: 'focusup.session_token=abc' } } as unknown as Request;
}

async function run(
  middleware: (req: Request, res: Response, next: (e?: unknown) => void) => unknown,
  req: Request,
): Promise<unknown> {
  let received: unknown;
  await middleware(req, {} as Response, (e?: unknown) => {
    received = e;
  });
  return received;
}

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('rejects a request with no session (401)', async () => {
    getSession.mockResolvedValue(null);

    const error = await run(authMiddleware, fakeRequest());

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(401);
  });

  it('rejects a session whose user no longer exists (401)', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1' }, session: {} });
    findUser.mockResolvedValue(null);

    const error = await run(authMiddleware, fakeRequest());

    expect((error as AppError).statusCode).toBe(401);
  });

  it('sets req.user from the database, not from the session cookie', async () => {
    getSession.mockResolvedValue({ user: { id: 'user-1', isBanned: false }, session: {} });
    findUser.mockResolvedValue({ ...dbUser, isAdmin: true });
    const req = fakeRequest();

    const error = await run(authMiddleware, req);

    expect(error).toBeUndefined();
    expect(req.user).toEqual({ ...dbUser, isAdmin: true });
  });
});

describe('requireAuth', () => {
  it('blocks a banned user (403) even if their session is still valid', async () => {
    const req = { user: { ...dbUser, isBanned: true } } as unknown as Request;
    const error = await run(requireAuth, req);
    expect((error as AppError).statusCode).toBe(403);
    expect((error as AppError).message).toBe('Account suspended');
  });

  it('blocks a deactivated user (403)', async () => {
    const req = { user: { ...dbUser, isActive: false } } as unknown as Request;
    const error = await run(requireAuth, req);
    expect((error as AppError).statusCode).toBe(403);
  });

  it('lets an active user through', async () => {
    const req = { user: dbUser } as unknown as Request;
    expect(await run(requireAuth, req)).toBeUndefined();
  });
});

describe('requireVerified', () => {
  it('blocks an unverified email (403)', async () => {
    const req = { user: { ...dbUser, emailVerified: false } } as unknown as Request;
    const error = await run(requireVerified, req);
    expect((error as AppError).statusCode).toBe(403);
    expect((error as AppError).message).toBe('Please verify your email first');
  });

  it('lets a verified email through', async () => {
    const req = { user: dbUser } as unknown as Request;
    expect(await run(requireVerified, req)).toBeUndefined();
  });
});
