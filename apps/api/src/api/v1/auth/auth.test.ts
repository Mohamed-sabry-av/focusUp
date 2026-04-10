import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../app';
import { prisma } from '../../../lib/prisma';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

vi.mock('../../../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn().mockResolvedValue('hashedpassword'),
    compare: vi.fn(),
  },
}));

vi.mock('../../../lib/jwt', async () => {
  const actual = await vi.importActual('../../../lib/jwt');
  return {
    ...actual,
    verifyRefreshToken: vi.fn(),
  };
});

describe('Auth Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Registration', () => {
    it('should register successfully and return tokens', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: 'test-cuid',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        displayName: 'Test User',
        username: 'testuser',
        timezone: 'UTC',
        categories: [],
        preferredLength: [25, 50],
        planTier: 'FREE',
        strikeCount: 0,
        isActive: true,
        isBanned: false,
        emailVerified: false,
        isAdmin: false,
        createdAt: new Date(),
        updatedAt: new Date()
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123$',
          displayName: 'Test User',
          username: 'testuser'
        });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe('test@example.com');
      // Ensure passwordHash is omitted
      expect(res.body.passwordHash).toBeUndefined();
      
      // Check cookies string format
      const cookies = res.headers['set-cookie'];
      if (!cookies) throw new Error('Cookies not set');
      
      expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
    });

    it('should return 409 for duplicate email', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({ id: 'exists' } as any);

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'exists@example.com',
          password: 'Password123$',
          displayName: 'Test User',
          username: 'testuser'
        });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('Email is already registered');
    });

    it('should fail with weak password validation', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'test@example.com',
          password: 'weak',
          displayName: 'Test',
          username: 'test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Password must be at least 8 characters');
    });
  });

  describe('Login & Logout', () => {
    it('should login successfully with correct credentials', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'test-cuid',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123$',
        });

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(true);
      expect(cookies.some((c: string) => c.startsWith('refresh_token='))).toBe(true);
    });

    it('should return 401 for wrong password login', async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'test-cuid',
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
    });

    it('should successfully clear cookies on logout', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout');

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies[0]).toContain('access_token=;');
      expect(cookies[1]).toContain('refresh_token=;');
    });
  });
  
  describe('Refresh Token', () => {
    it('should return 401 if missing refresh token', async () => {
      const res = await request(app)
        .post('/api/v1/auth/refresh');
      expect(res.status).toBe(401);
    });

    it('should issue new access token if refresh token is valid', async () => {
      const { verifyRefreshToken } = await import('../../../lib/jwt');
      vi.mocked(verifyRefreshToken).mockReturnValue({ sub: 'test-cuid' } as any);
      
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: 'test-cuid',
        isActive: true,
        isBanned: false,
      } as any);

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', ['refresh_token=validtoken']);

      expect(res.status).toBe(200);
      const cookies = res.headers['set-cookie'];
      expect(cookies.some((c: string) => c.startsWith('access_token='))).toBe(true);
    });
  });
});
