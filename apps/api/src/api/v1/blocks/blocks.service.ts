import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';

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

    return { success: true };
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
