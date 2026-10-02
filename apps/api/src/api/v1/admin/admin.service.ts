import { prisma } from "../../../lib/prisma";
import { AppError } from "../../../utils/errors";
import { EmailService } from "../../../services/email.service";
import { addStrike, countRecentStrikes } from "../../../services/strikes.service";
import type { ReportStatus } from "@prisma/client";

export class AdminService {
  /**
   * List all reports, paginated.
   * Filterable by status and reason. Ordered by createdAt DESC.
   */
  static async listReports(filters: {
    status?: string;
    reason?: string;
    page?: number;
    limit?: number;
  }) {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.status) where.status = filters.status;
    if (filters.reason) where.reason = filters.reason;

    const [total, reports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.findMany({
        where,
        include: {
          reporter: { select: { id: true, displayName: true, username: true } },
          reported: { select: { id: true, displayName: true, username: true } },
          session: { select: { id: true, scheduledAt: true, status: true } },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
    ]);

    return { data: reports, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Update report status.
   * Cannot set back to OPEN.
   */
  static async updateReportStatus(reportId: string, newStatus: string) {
    if (newStatus === "OPEN") {
      throw new AppError("Cannot set report status back to OPEN", 400);
    }

    const allowed: string[] = ["REVIEWED", "RESOLVED", "DISMISSED"];
    if (!allowed.includes(newStatus)) {
      throw new AppError("Invalid status value", 400);
    }

    const report = await prisma.report.findUnique({ where: { id: reportId } });
    if (!report) throw new AppError("Report not found", 404);

    const updated = await prisma.report.update({
      where: { id: reportId },
      data: { status: newStatus as ReportStatus },
    });

    return updated;
  }

  /**
   * Get user details including recent strikes, suspension, isBanned, and report history (received).
   */
  static async getUserDetails(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        planTier: true,
        suspendedUntil: true,
        isBanned: true,
        isActive: true,
        isAdmin: true,
        createdAt: true,
        reportsReceived: {
          orderBy: { createdAt: "desc" },
          take: 20,
          include: {
            reporter: { select: { id: true, displayName: true, username: true } },
          },
        },
      },
    });

    if (!user) throw new AppError("User not found", 404);

    return { ...user, strikesInLast30Days: await countRecentStrikes(userId) };
  }

  /**
   * Ban a user. Sends ban notification email.
   */
  static async banUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    if (user.isBanned) throw new AppError("User is already banned", 409);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { isBanned: true },
    });

    await EmailService.sendBanNotification({ to: user.email });

    return { success: true, userId, isBanned: updated.isBanned };
  }

  /**
   * Unban a user.
   */
  static async unbanUser(userId: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);
    if (!user.isBanned) throw new AppError("User is not banned", 409);

    await prisma.user.update({
      where: { id: userId },
      data: { isBanned: false },
    });

    return { success: true, userId, isBanned: false };
  }

  /**
   * P3-04: Add a manual strike to a user with a reason.
   * Counts like any other strike: the 5th inside 30 days suspends the user for 3 days.
   * Strikes are immutable. They only stop counting after 30 days.
   */
  static async addManualStrike(userId: string, reason: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new AppError("User not found", 404);

    const result = await addStrike({ userId, reason: "ADMIN", note: reason });

    return {
      userId,
      strikesInLast30Days: result.strikesInWindow,
      suspendedUntil: result.suspendedUntil,
      reason,
    };
  }
}
