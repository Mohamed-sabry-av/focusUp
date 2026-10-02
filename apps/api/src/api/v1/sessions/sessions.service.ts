import { SessionStatus } from '@prisma/client';
import { SessionStatus as SessionStatusEnum, type UpcomingSession } from '@focusUp/shared-types';
import { prisma } from '../../../lib/prisma';
import { shortName } from '../../../lib/short-name';
import { AppError } from '../../../utils/errors';
import { completedSessionCounts } from './session-stats';

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

    // Check-out opens once the session has started (a person may leave before the room closes).
    if ((session.status !== 'COMPLETED' && session.status !== 'ACTIVE') || session.scheduledAt > new Date()) {
      throw new AppError('You can check out once the session has started', 400);
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

  /**
   * My upcoming sessions: the next 7 days, plus one that has started and not ended (so the person
   * can still join). Partners are shown by first name and last initial; their full name, username
   * and e-mail never leave the server.
   */
  static async getUpcomingSessions(userId: string): Promise<UpcomingSession[]> {
    const now = new Date();
    const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const LONGEST_SESSION_MS = 75 * 60 * 1000;
    const startedAfter = new Date(now.getTime() - LONGEST_SESSION_MS);

    const sessions = await prisma.session.findMany({
      where: {
        AND: [
          { OR: [{ user1Id: userId }, { user2Id: userId }] },
          { scheduledAt: { gt: startedAfter, lt: sevenDaysLater } },
          { status: { in: ['PENDING', 'CONFIRMED', 'ACTIVE'] } },
        ],
      },
      include: {
        user1: { select: { id: true, displayName: true, avatarUrl: true, hidePhoto: true, timezone: true } },
        user2: { select: { id: true, displayName: true, avatarUrl: true, hidePhoto: true, timezone: true } },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    const running = sessions.filter(
      (session) => session.scheduledAt.getTime() + session.durationMin * 60 * 1000 > now.getTime(),
    );
    if (running.length === 0) return [];

    const partnerIds = running
      .map((session) => (session.user1Id === userId ? session.user2Id : session.user1Id))
      .filter((id): id is string => id !== null);

    const [bookings, favorites, completed] = await Promise.all([
      prisma.bookingRequest.findMany({
        where: { userId, sessionId: { in: running.map((session) => session.id) } },
        select: { id: true, sessionId: true, quiet: true, taskType: true },
      }),
      prisma.favorite.findMany({ where: { userId }, select: { favoriteId: true } }),
      completedSessionCounts(partnerIds),
    ]);
    const bookingBySession = new Map(bookings.map((booking) => [booking.sessionId, booking]));
    const favoriteIds = new Set(favorites.map((favorite) => favorite.favoriteId));

    return running.map((session) => {
      const isUser1 = session.user1Id === userId;
      const partner = isUser1 ? session.user2 : session.user1;
      const booking = bookingBySession.get(session.id);

      return {
        id: session.id,
        status: SessionStatusEnum[session.status],
        isSolo: session.isSolo,
        scheduledAt: session.scheduledAt.toISOString(),
        durationMin: session.durationMin,
        bookingId: booking?.id ?? null,
        quiet: booking?.quiet ?? false,
        taskType: booking?.taskType ?? 'ANY',
        title: isUser1 ? session.user1Goal : session.user2Goal,
        partner: partner
          ? {
              id: partner.id,
              displayName: shortName(partner.displayName),
              avatarUrl: partner.hidePhoto ? null : partner.avatarUrl,
              completedSessions: completed.get(partner.id) ?? 0,
              timezone: partner.timezone,
              isFavorite: favoriteIds.has(partner.id),
            }
          : null,
      };
    });
  }

  /**
   * Fetch session history with pagination.
   */
  static async getSessionHistory(userId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const where = {
      AND: [
        {
          OR: [
            { user1Id: userId },
            { user2Id: userId },
          ],
        },
        {
          status: {
            in: [
              SessionStatus.COMPLETED,
              SessionStatus.CANCELLED,
              SessionStatus.NO_SHOW,
            ],
          },
        },
      ],
    };

    const [total, sessions] = await Promise.all([
      prisma.session.count({ where }),
      prisma.session.findMany({
        where,
        include: {
          user1: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
          user2: {
            select: {
              id: true,
              displayName: true,
              username: true,
              avatarUrl: true,
            },
          },
          reflections: {
            where: { userId },
            take: 1,
            select: {
              text: true,
            },
          },
        },
        orderBy: {
          scheduledAt: 'desc',
        },
        skip,
        take: limit,
      }),
    ]);

    const data = sessions.map((session) => {
      const isUser1 = session.user1Id === userId;
      const partner = isUser1 ? session.user2 : session.user1;
      const reflectionSnippet = session.reflections[0]?.text
        ? session.reflections[0].text.substring(0, 100) + (session.reflections[0].text.length > 100 ? '...' : '')
        : null;

      return {
        ...session,
        partner,
        reflectionSnippet,
        reflections: undefined, // remove full reflections list
      };
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }
}
