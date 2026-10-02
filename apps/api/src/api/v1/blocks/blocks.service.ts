import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';
import { BookingsService } from '../bookings/bookings.service';

export class BlocksService {
  static async blockUser(blockerId: string, blockedId: string): Promise<{ success: true }> {
    // 1. Cannot block yourself
    if (blockedId === blockerId) {
      throw new AppError('You cannot block yourself', 400);
    }

    // 2. Target user must exist
    const target = await prisma.user.findUnique({ where: { id: blockedId } });
    if (!target) throw new AppError('User not found', 404);

    // 3. Check already blocked (A→B direction)
    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (existing) throw new AppError('User is already blocked', 409);

    // 4. Create bidirectional blocks in a transaction, and drop any favorite between the two
    await prisma.$transaction([
      prisma.block.create({ data: { blockerId, blockedId } }),
      prisma.block.create({ data: { blockerId: blockedId, blockedId: blockerId } }),
      prisma.favorite.deleteMany({
        where: {
          OR: [
            { userId: blockerId, favoriteId: blockedId },
            { userId: blockedId, favoriteId: blockerId },
          ],
        },
      }),
    ]);

    await this.cancelSharedUpcomingSessions(blockerId, blockedId);

    return { success: true };
  }

  /**
   * Blocking someone you are booked with cancels that session, with no strike for you (you should
   * never be punished for protecting yourself). They go back to waiting and are re-matched.
   */
  private static async cancelSharedUpcomingSessions(blockerId: string, blockedId: string): Promise<void> {
    const shared = await prisma.session.findMany({
      where: {
        status: 'CONFIRMED',
        scheduledAt: { gt: new Date() },
        OR: [
          { user1Id: blockerId, user2Id: blockedId },
          { user1Id: blockedId, user2Id: blockerId },
        ],
      },
      select: { id: true },
    });

    for (const session of shared) {
      const booking = await prisma.bookingRequest.findFirst({
        where: { sessionId: session.id, userId: blockerId, status: 'MATCHED' },
        select: { id: true },
      });
      if (booking) await BookingsService.cancelBooking(booking.id, blockerId, { waiveStrike: true });
    }
  }

  static async unblockUser(blockerId: string, blockedId: string): Promise<{ success: true }> {
    // Check block exists (A→B direction)
    const existing = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId, blockedId } },
    });
    if (!existing) throw new AppError('Block not found', 404);

    // Delete both directions in a transaction
    await prisma.$transaction([
      prisma.block.delete({ where: { blockerId_blockedId: { blockerId, blockedId } } }),
      prisma.block.deleteMany({ where: { blockerId: blockedId, blockedId: blockerId } }),
    ]);

    return { success: true };
  }

  static async listBlocks(userId: string): Promise<
    Array<{
      blockedId: string;
      blockedUser: {
        id: string;
        displayName: string | null;
        username: string;
        avatarUrl: string | null;
      };
      createdAt: Date;
    }>
  > {
    const blocks = await prisma.block.findMany({
      where: { blockerId: userId },
      include: {
        blocked: {
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

    return blocks.map((b) => ({
      blockedId: b.blockedId,
      blockedUser: b.blocked,
      createdAt: b.createdAt,
    }));
  }
}
