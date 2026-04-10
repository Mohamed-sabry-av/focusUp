import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import app from "../../../app";
import { prisma } from "../../../lib/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

vi.mock("../../../lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: vi.fn().mockResolvedValue("hashedpassword"),
    compare: vi.fn(),
  },
}));

vi.mock("../../../lib/jwt", async () => {
  const actual = await vi.importActual("../../../lib/jwt");
  return {
    ...actual,
    verifyRefreshToken: vi.fn(),
  };
});

// Avoid executing console.log during test
vi.spyOn(console, "log").mockImplementation(() => {});


describe("Auth Endpoints", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Registration & Verification Flow", () => {
    it("should register successfully, return tokens and send verification email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.user.create).mockResolvedValue({
        id: "test-cuid",
        email: "test@example.com",
        passwordHash: "hashedpassword",
        displayName: "Test User",
        username: "testuser",
        emailVerified: false,
      } as any);

      const res = await request(app).post("/api/v1/auth/register").send({
        email: "test@example.com",
        password: "Password123$",
        displayName: "Test User",
        username: "testuser",
      });

      expect(res.status).toBe(201);
      expect(res.body.email).toBe("test@example.com");
      expect(res.body.passwordHash).toBeUndefined();
      expect(res.body.verificationToken).toBeDefined(); // Token exposed for test only

      const cookies = res.headers["set-cookie"];
      expect(cookies.some((c: string) => c.startsWith("access_token="))).toBe(
        true,
      );

    });

    it("should return 409 for duplicate email", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "exists",
      } as any);

      const res = await request(app).post("/api/v1/auth/register").send({
        email: "exists@example.com",
        password: "Password123$",
        displayName: "Test User",
        username: "testuser",
      });

      expect(res.status).toBe(409);
    });

    it("should fail with weak password validation", async () => {
      const res = await request(app).post("/api/v1/auth/register").send({
        email: "test@example.com",
        password: "weak",
        displayName: "Test",
        username: "test",
      });
      expect(res.status).toBe(400);
    });
  });

  describe("Verify Email", () => {
    it("should verify email successfully", async () => {
      const token = jwt.sign(
        { userId: "u1", email: "e@x.com", purpose: "email-verification" },
        "fallback_secret_do_not_use",
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        emailVerified: false,
      } as any);
      vi.mocked(prisma.user.update).mockResolvedValue({
        id: "u1",
        emailVerified: true,
      } as any);

      const res = await request(app).get(
        `/api/v1/auth/verify-email?token=${token}`,
      );
      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Email verified successfully");
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it("should return idempotent success if already verified", async () => {
      const token = jwt.sign(
        { userId: "u1", email: "e@x.com", purpose: "email-verification" },
        "fallback_secret_do_not_use",
      );
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "u1",
        emailVerified: true,
      } as any);

      const res = await request(app).get(
        `/api/v1/auth/verify-email?token=${token}`,
      );
      expect(res.status).toBe(200);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it("should return 400 for invalid token", async () => {
      const res = await request(app).get(
        "/api/v1/auth/verify-email?token=invalid_string",
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Invalid verification token");
    });

    it("should return 400 for expired token", async () => {
      const token = jwt.sign(
        { userId: "u1", email: "e@x.com", purpose: "email-verification" },
        "fallback_secret_do_not_use",
        { expiresIn: "-1s" },
      );
      const res = await request(app).get(
        `/api/v1/auth/verify-email?token=${token}`,
      );
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Verification link expired");
    });
  });

  describe("Resend Verification", () => {
    it("should resend verification successfully", async () => {
      const { verifyAccessToken } = await import("../../../lib/jwt");
      const testToken = jwt.sign({ sub: "u1" }, "fallback_secret_do_not_use");

      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "u1",
        emailVerified: false,
        isActive: true,
        isBanned: false,
      } as any); // For Auth Middleware
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "u1",
        emailVerified: false,
        email: "e@x.com",
      } as any); // For AuthService query

      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .set("Cookie", [`access_token=${testToken}`]);

      expect(res.status).toBe(200);
      expect(res.body.data.message).toBe("Verification email sent");
    });

    it("should return 400 if already verified", async () => {
      const testToken = jwt.sign({ sub: "u1" }, "fallback_secret_do_not_use");

      // Middleware User
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "u1",
        emailVerified: true,
        isActive: true,
        isBanned: false,
      } as any);
      // Resend Action Database User Check
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: "u1",
        emailVerified: true,
        email: "e@x.com",
      } as any);

      const res = await request(app)
        .post("/api/v1/auth/resend-verification")
        .set("Cookie", [`access_token=${testToken}`]);

      expect(res.status).toBe(400);
      expect(res.body.error).toContain("Email already verified");
    });
  });

  describe("Login & Logout", () => {
    it("should login successfully with correct credentials", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "test-cuid",
        email: "test@example.com",
        passwordHash: "hashedpassword",
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "test@example.com", password: "Password123$" });
      expect(res.status).toBe(200);
    });

    it("should return 401 for wrong password login", async () => {
      vi.mocked(prisma.user.findUnique).mockResolvedValue({
        id: "test-cuid",
        email: "test@example.com",
        passwordHash: "hashedpassword",
      } as any);

      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
      const res = await request(app)
        .post("/api/v1/auth/login")
        .send({ email: "test@example.com", password: "WrongPassword" });
      expect(res.status).toBe(401);
    });

    it("should successfully clear cookies on logout", async () => {
      const res = await request(app).post("/api/v1/auth/logout");
      expect(res.status).toBe(200);
      expect(res.headers["set-cookie"][0]).toContain("access_token=;");
    });
  });

  describe("Refresh Token", () => {
    it("should return 401 if missing refresh token", async () => {
      const res = await request(app).post("/api/v1/auth/refresh");
      expect(res.status).toBe(401);
    });
  });
});
