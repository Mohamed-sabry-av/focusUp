import { prisma } from '../../../lib/prisma';
import { OnboardingInput } from '@focusUp/shared-types';
import { AppError } from '../../../utils/errors';
import { SessionStatus, PlanTier } from '@prisma/client';
export class UsersService {
    static getStartOfWeek(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
        return new Date(d.setDate(diff)).setHours(0, 0, 0, 0);
    }
    static getEndOfWeek(date) {
        const start = new Date(this.getStartOfWeek(date));
        return new Date(start.setDate(start.getDate() + 6)).setHours(23, 59, 59, 999);
    }
    static getStartOfDay(date) {
        return new Date(date).setHours(0, 0, 0, 0);
    }
    static async getCurrentUser(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
    }
    static async getUserStats(userId) {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { planTier: true },
        });
        if (!user) {
            throw new AppError('User not found', 404);
        }
        const now = new Date();
        const startOfCurrentWeek = new Date(this.getStartOfWeek(now));
        const endOfCurrentWeek = new Date(this.getEndOfWeek(now));
        // sessionsThisWeek
        const sessionsThisWeek = await prisma.session.count({
            where: {
                AND: [
                    {
                        OR: [
                            { user1Id: userId },
                            { user2Id: userId },
                        ],
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
                        OR: [
                            { user1Id: userId },
                            { user2Id: userId },
                        ],
                    },
                    { status: SessionStatus.COMPLETED },
                    { scheduledAt: { gte: startOfCurrentWeek, lte: endOfCurrentWeek } },
                ],
            },
            select: { durationMin: true },
        });
        const totalMinutes = completedSessions.reduce((sum, s) => sum + s.durationMin, 0);
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
                            OR: [
                                { user1Id: userId },
                                { user2Id: userId },
                            ],
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
                checkDayAtStart = new Date(checkDay.setDate(checkDay.getDate() - 1)).getTime();
            }
            else {
                // If no sessions today, it might still be a streak if there were sessions yesterday
                // But the requirement says "consecutive days going backward from today"
                // If today has no sessions, is the streak 0 or yesterday's streak?
                // Let's check if today has no sessions but yesterday had. If today is still going, streak should include yesterday.
                if (checkDayAtStart === this.getStartOfDay(now)) {
                    // Check yesterday
                    checkDayAtStart = new Date(checkDay.setDate(checkDay.getDate() - 1)).getTime();
                    continue;
                }
                break;
            }
        }
        const sessionLimit = user.planTier === PlanTier.FREE ? 3 : null;
        return {
            sessionsThisWeek,
            focusHoursThisWeek,
            currentStreak,
            sessionsUsedThisWeek: sessionsThisWeek,
            sessionLimit,
            planTier: user.planTier,
        };
    }
    static async updateOnboarding(userId, data) {
        const user = await prisma.user.update({
            where: { id: userId },
            data: {
                timezone: data.timezone,
                categories: data.categories,
                preferredLength: data.preferredLength,
            },
        });
        const { passwordHash: _, ...safeUser } = user;
        return safeUser;
    }
}
