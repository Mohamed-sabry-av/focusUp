import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';
import { AccessToken } from 'livekit-server-sdk';

export class SessionsService {
  /**
   * Fetch a session by ID, including user1 and user2 relations.
   */
  static async getSessionById(sessionId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user1: true, user2: true },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    return session;
  }

  /**
   * Generate a LiveKit access token for a participant to join a session room.
   * Validates that the user is a participant and the session is joinable.
   */
  static async generateLivekitToken(sessionId: string, userId: string) {
    const session = await this.getSessionById(sessionId);

    // Verify user is a participant
    const isUser1 = session.user1Id === userId;
    const isUser2 = session.user2Id === userId;

    if (!isUser1 && !isUser2) {
      throw new AppError('You are not a participant in this session', 403);
    }

    // Verify session is joinable
    if (session.status !== 'CONFIRMED' && session.status !== 'ACTIVE') {
      throw new AppError('Session is not available to join', 403);
    }

    // Determine user display name for the token
    const participant = isUser1 ? session.user1 : session.user2;
    const userName = participant?.displayName ?? participant?.username ?? 'Unknown';

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new AppError('LiveKit credentials not configured', 500);
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity: userId,
      name: userName,
    });

    token.addGrant({
      roomJoin: true,
      room: session.livekitRoomName,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    // Token TTL: 2 hours (per AGENTS.md security rules)
    token.ttl = 2 * 60 * 60;

    const jwt = await token.toJwt();
    return { token: jwt };
  }

  /**
   * Set a goal for the authenticated user in a session.
   * Updates user1Goal or user2Goal depending on which participant is setting the goal.
   */
  static async setGoal(sessionId: string, userId: string, goal: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.user1Id === userId) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { user1Goal: goal },
      });
    }

    if (session.user2Id === userId) {
      return prisma.session.update({
        where: { id: sessionId },
        data: { user2Goal: goal },
      });
    }

    throw new AppError('Not a participant', 403);
  }

  /**
   * Join a session. Sets status to ACTIVE when both users join.
   */
  static async joinSession(sessionId: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.user1Id !== userId && session.user2Id !== userId) {
      throw new AppError('Not a participant', 403);
    }

    if (session.status !== 'CONFIRMED' && session.status !== 'ACTIVE') {
      throw new AppError('Session cannot be joined in current state', 400);
    }

    // Option A: Use Redis Set to track who has joined
    const { redis } = await import('../../../lib/redis');
    const redisKey = `session:joined:${sessionId}`;
    await redis.sadd(redisKey, userId);
    
    // Set expiry just in case
    await redis.expire(redisKey, 24 * 60 * 60);

    const joinedCount = await redis.scard(redisKey);

    if (joinedCount >= 2 && session.status !== 'ACTIVE') {
      const activeSession = await prisma.session.update({
        where: { id: sessionId },
        data: {
          status: 'ACTIVE',
          startedAt: new Date(),
        },
      });
      return { session: activeSession, isActive: true };
    }

    return { session, isActive: joinedCount >= 2 };
  }

  /**
   * Complete an active session. Updates status and endedAt.
   */
  static async completeSession(sessionId: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.user1Id !== userId && session.user2Id !== userId) {
      throw new AppError('Not a participant', 403);
    }

    if (session.status !== 'ACTIVE' && session.status !== 'COMPLETED') {
      throw new AppError('Only active sessions can be completed', 400);
    }

    if (session.status === 'COMPLETED') {
      return session; // already completed
    }

    const updatedSession = await prisma.session.update({
      where: { id: sessionId },
      data: {
        status: 'COMPLETED',
        endedAt: new Date(),
      },
    });

    // Cleanup Redis key
    const { redis } = await import('../../../lib/redis');
    const redisKey = `session:joined:${sessionId}`;
    await redis.del(redisKey);

    return updatedSession;
  }

  /**
   * Fetch current session status logic
   */
  static async getSessionStatus(sessionId: string, userId: string) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      include: { user1: true, user2: true },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.user1Id !== userId && session.user2Id !== userId) {
      throw new AppError('Not a participant', 403);
    }

    return session;
  }

  /**
   * Create a reflection for a completed session.
   */
  static async createReflection(data: { sessionId: string; userId: string; text: string; rating?: number }) {
    const session = await prisma.session.findUnique({
      where: { id: data.sessionId },
    });

    if (!session) {
      throw new AppError('Session not found', 404);
    }

    if (session.user1Id !== data.userId && session.user2Id !== data.userId) {
      throw new AppError('Not a participant', 403);
    }

    if (session.status !== 'COMPLETED') {
      throw new AppError('Can only reflect on completed sessions', 400);
    }

    const sanitizeHtml = (await import('sanitize-html')).default;
    const sanitizedText = sanitizeHtml(data.text);
    
    if (sanitizedText.length === 0) {
      throw new AppError('Reflection text cannot be empty', 400);
    }

    const duplicate = await prisma.reflection.findFirst({
      where: {
        sessionId: data.sessionId,
        userId: data.userId,
      },
    });

    if (duplicate) {
      throw new AppError('Reflection already submitted', 409);
    }

    if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
      throw new AppError('Rating must be between 1 and 5', 400);
    }

    return prisma.reflection.create({
      data: {
        sessionId: data.sessionId,
        userId: data.userId,
        text: sanitizedText,
        rating: data.rating,
      },
    });
  }
}
