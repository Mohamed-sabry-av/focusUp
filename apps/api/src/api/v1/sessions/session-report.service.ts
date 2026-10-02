import type { ReportFromRoomInput } from '@focusUp/shared-types';

import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';
import { BlocksService } from '../blocks/blocks.service';
import { ReportsService } from '../reports/reports.service';

/**
 * "Report and leave" from inside the room, in one step: the report (with the last chat lines),
 * a block in both directions, and the end of the session. Whether the reported person gets a
 * strike is an admin's decision, never automatic.
 */
export class SessionReportService {
  static async reportPartner(sessionId: string, reporterId: string, input: ReportFromRoomInput, now: Date = new Date()) {
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: { id: true, user1Id: true, user2Id: true },
    });
    if (!session) throw new AppError('Session not found', 404);
    if (session.user1Id !== reporterId && session.user2Id !== reporterId) {
      throw new AppError('You are not a participant in this session', 403);
    }

    const reportedId = session.user1Id === reporterId ? session.user2Id : session.user1Id;
    if (!reportedId) throw new AppError('There is no partner to report in this session', 400);

    // Also checks that the reporter took part and that this is not a duplicate (409).
    const report = await ReportsService.createReport(
      reporterId,
      { reportedId, sessionId, reason: input.reason, description: input.description },
      input.chat,
    );

    try {
      await BlocksService.blockUser(reporterId, reportedId);
    } catch (error) {
      // Already blocked is fine: the goal is that they never meet again.
      if (!(error instanceof AppError && error.statusCode === 409)) throw error;
    }

    await prisma.session.updateMany({
      where: { id: sessionId, status: { in: ['CONFIRMED', 'ACTIVE'] } },
      data: { status: 'COMPLETED', endedAt: now, endedEarly: true },
    });

    return report;
  }
}
