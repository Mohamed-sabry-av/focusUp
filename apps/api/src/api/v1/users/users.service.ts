import { prisma } from "../../../lib/prisma";
import type {
  OnboardingInput,
  UpdateProfileInput,
  UpdatePreferencesInput,
} from "@focusUp/shared-types";
import { AppError } from "../../../utils/errors";
import { SessionStatus } from "@prisma/client";
import { getQuotaStatus } from "../../../services/quota.service";

export class UsersService {
  private static getStartOfWeek(date: Date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
  }

  private static getEndOfWeek(date: Date) {
    const start = new Date(this.getStartOfWeek(date));
    return new Date(start.setDate(start.getDate() + 6)).setHours(
      23,
      59,
      59,
      999,
    );
  }

  private static getStartOfDay(date: Date) {
    return new Date(date).setHours(0, 0, 0, 0);
  }

  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    return user;
  }

  static async updateProfile(userId: string, data: UpdateProfileInput) {
    if (data.username) {
      const existing = await prisma.user.findFirst({
        where: { username: data.username, id: { not: userId } },
      });
      if (existing) throw new AppError("Username already taken", 409);
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.displayName && { displayName: data.displayName }),
        ...(data.username && { username: data.username }),
        ...(data.timezone && { timezone: data.timezone }),
      },
    });
    return updated;
  }

  static async getUserStats(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, planTier: true, timezone: true },
    });

    if (!user) {
      throw new AppError("User not found", 404);
    }

    const now = new Date();
    const startOfCurrentWeek = new Date(this.getStartOfWeek(now));
    const endOfCurrentWeek = new Date(this.getEndOfWeek(now));

    // sessionsThisWeek
    const sessionsThisWeek = await prisma.session.count({
      where: {
        AND: [
          {
            OR: [{ user1Id: userId }, { user2Id: userId }],
          },
          { status: SessionStatus.COMPLETED },
          { scheduledAt: { gte: startOfCurrentWeek, lte: endOfCurrentWeek } },
        ],
      },
    });

    // focusHoursThisWeek
    const completedSessions = await prisma.session.findMany({
      where: {
        AND: [
          {
            OR: [{ user1Id: userId }, { user2Id: userId }],
          },
          { status: SessionStatus.COMPLETED },
          { scheduledAt: { gte: startOfCurrentWeek, lte: endOfCurrentWeek } },
        ],
      },
      select: { durationMin: true },
    });

    const totalMinutes = completedSessions.reduce(
      (sum, s) => sum + s.durationMin,
      0,
    );
    const focusHoursThisWeek = parseFloat((totalMinutes / 60).toFixed(1));

    // currentStreak
    // We need to check backward from today for consecutive days with at least 1 completed session
    let currentStreak = 0;
    let checkDayAtStart = this.getStartOfDay(now);

    while (true) {
      const checkDay = new Date(checkDayAtStart);
      const nextDay = new Date(checkDay);
      nextDay.setDate(nextDay.getDate() + 1);

      const daySessionsCount = await prisma.session.count({
        where: {
          AND: [
            {
              OR: [{ user1Id: userId }, { user2Id: userId }],
            },
            { status: SessionStatus.COMPLETED },
            {
              scheduledAt: {
                gte: checkDay,
                lt: nextDay,
              },
            },
          ],
        },
      });

      if (daySessionsCount > 0) {
        currentStreak++;
        // Move backward one day
        checkDayAtStart = new Date(
          checkDay.setDate(checkDay.getDate() - 1),
        ).getTime();
      } else {
        // If today has no sessions, it might still be a streak if there were sessions yesterday.
        // If today is still going, streak should include yesterday.
        if (checkDayAtStart === this.getStartOfDay(now)) {
          // Check yesterday
          checkDayAtStart = new Date(
            checkDay.setDate(checkDay.getDate() - 1),
          ).getTime();
          continue;
        }
        break;
      }
    }

    // Weekly free-plan allowance: Monday to Sunday in the user's timezone, null when not enforced.
    const quota = await getQuotaStatus(user, now);

    return {
      sessionsThisWeek,
      focusHoursThisWeek,
      currentStreak,
      sessionsUsedThisWeek: quota.used,
      sessionLimit: quota.limit,
      planTier: user.planTier,
    };
  }

  static async updateOnboarding(userId: string, data: OnboardingInput) {
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        timezone: data.timezone,
        categories: data.categories,
        preferredLength: data.preferredLength,
      },
    });

    return user;
  }

  /**
   * P3-17: GDPR data export — returns the user's own data. Credentials live in
   * the Better Auth tables (Account, AuthSession) and are never exported.
   * Rate limited to 1/hour at the route level.
   */
  static async getDataExport(userId: string) {
    const [user, sessions, reflections, reports, bookingRequests] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            displayName: true,
            username: true,
            avatarUrl: true,
            timezone: true,
            categories: true,
            preferredLength: true,
            planTier: true,
            suspendedUntil: true,
            hidePhoto: true,
            dataSaver: true,
            isActive: true,
            isBanned: true,
            emailVerified: true,
            isAdmin: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.session.findMany({
          where: { OR: [{ user1Id: userId }, { user2Id: userId }] },
          orderBy: { scheduledAt: "desc" },
        }),
        prisma.reflection.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.report.findMany({
          where: { reporterId: userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.bookingRequest.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    return { user, sessions, reflections, reports, bookingRequests };
  }

  /**
   * P3-15: Get previous session partners for the user.
   * Returns unique partners from COMPLETED sessions, excluding blocked users.
   * Ordered by most recent session together (DESC).
   */
  static async getPreviousPartners(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ) {
    // Fetch all COMPLETED sessions the user participated in, newest first
    const sessions = await prisma.session.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: "COMPLETED",
      },
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
      },
      orderBy: { scheduledAt: "desc" },
    });

    // Get blocked user IDs (both directions)
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      select: { blockedId: true },
    });
    const blockedIds = new Set(blocks.map((b) => b.blockedId));

    // Build partner map: partnerId → { user info, lastSessionDate, count }
    const partnerMap = new Map<
      string,
      {
        id: string;
        displayName: string;
        username: string;
        avatarUrl: string | null;
        lastSessionDate: Date;
        totalSessionsTogether: number;
      }
    >();

    for (const session of sessions) {
      const partner =
        session.user1Id === userId ? session.user2 : session.user1;
      if (!partner || blockedIds.has(partner.id)) continue;

      const existing = partnerMap.get(partner.id);
      if (!existing) {
        partnerMap.set(partner.id, {
          id: partner.id,
          displayName: partner.displayName,
          username: partner.username,
          avatarUrl: partner.avatarUrl,
          lastSessionDate: session.scheduledAt,
          totalSessionsTogether: 1,
        });
      } else {
        existing.totalSessionsTogether++;
        // lastSessionDate stays as the most recent (already ordered desc)
      }
    }

    // Convert to array, sort by most recent session
    const all = Array.from(partnerMap.values()).sort(
      (a, b) => b.lastSessionDate.getTime() - a.lastSessionDate.getTime(),
    );

    const total = all.length;
    const paginated = all.slice((page - 1) * limit, page * limit);

    return {
      data: { partners: paginated },
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  static async getPreferences(userId: string) {
    let prefs = await prisma.userPreferences.findUnique({ where: { userId } });
    if (!prefs) {
      prefs = await prisma.userPreferences.create({ data: { userId } });
    }
    return prefs;
  }

  static async updatePreferences(
    userId: string,
    data: Partial<UpdatePreferencesInput>,
  ) {
    const prefs = await prisma.userPreferences.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    });
    return prefs;
  }
}
