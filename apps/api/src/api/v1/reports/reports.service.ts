import sanitizeHtml from 'sanitize-html';
import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';
import type { CreateReportInput } from '@focusUp/shared-types';

export class ReportsService {
  static async createReport(reporterId: string, data: CreateReportInput) {
    // 1. Cannot report yourself
    if (data.reportedId === reporterId) {
      throw new AppError('You cannot report yourself', 400);
    }

    // 2. Reported user must exist
    const reportedUser = await prisma.user.findUnique({ where: { id: data.reportedId } });
    if (!reportedUser) throw new AppError('User not found', 404);

    // 3. Verify shared history
    if (data.sessionId) {
      // If sessionId provided: reporter must be a participant in that specific session
      const session = await prisma.session.findUnique({ where: { id: data.sessionId } });
      if (!session || (session.user1Id !== reporterId && session.user2Id !== reporterId)) {
        throw new AppError('You can only report users from sessions you participated in', 403);
      }
    } else {
      // No sessionId: verify at least one shared session exists between the two users
      const sharedSession = await prisma.session.findFirst({
        where: {
          OR: [
            { user1Id: reporterId, user2Id: data.reportedId },
            { user1Id: data.reportedId, user2Id: reporterId },
          ],
        },
      });
      if (!sharedSession) {
        throw new AppError('You can only report users you have had a session with', 403);
      }
    }

    // 4. Duplicate check — one report per reporter/reported/session combination
    const existing = await prisma.report.findFirst({
      where: {
        reporterId,
        reportedId: data.reportedId,
        sessionId: data.sessionId ?? null,
      },
    });
    if (existing) throw new AppError('You have already reported this user for this session', 409);

    // 5. Sanitize free-text description before persisting
    const description = data.description ? sanitizeHtml(data.description) : undefined;

    // 6. Persist the report
    const report = await prisma.report.create({
      data: {
        reporterId,
        reportedId: data.reportedId,
        sessionId: data.sessionId,
        reason: data.reason,
        description,
        status: 'OPEN',
      },
    });

    return report;
  }

  static async listMyReports(userId: string) {
    const reports = await prisma.report.findMany({
      where: { reporterId: userId },
      include: {
        reported: {
          select: {
            id: true,
            displayName: true,
            username: true,
            avatarUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return reports;
  }
}
