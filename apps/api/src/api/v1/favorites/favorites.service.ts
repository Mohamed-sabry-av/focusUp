import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';

export interface FavoriteUser {
  id: string;
  displayName: string;
  username: string;
  avatarUrl: string | null;
  favoritedAt: Date;
}

export class FavoritesService {
  /** Adds someone to the user's favorites. Adding twice is fine (idempotent). */
  static async addFavorite(userId: string, favoriteId: string): Promise<{ success: true }> {
    if (favoriteId === userId) {
      throw new AppError('You cannot favorite yourself', 400);
    }

    const target = await prisma.user.findUnique({
      where: { id: favoriteId },
      select: { id: true, isActive: true, isBanned: true },
    });
    if (!target || !target.isActive || target.isBanned) {
      throw new AppError('User not found', 404);
    }

    // Blocks are stored in both directions, so one lookup covers either side.
    const block = await prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: userId, blockedId: favoriteId } },
    });
    if (block) {
      throw new AppError('You cannot favorite someone you have blocked or who blocked you', 409);
    }

    await prisma.favorite.upsert({
      where: { userId_favoriteId: { userId, favoriteId } },
      create: { userId, favoriteId },
      update: {},
    });

    return { success: true };
  }

  /** Removes a favorite. Removing someone who is not a favorite is fine (idempotent). */
  static async removeFavorite(userId: string, favoriteId: string): Promise<{ success: true }> {
    await prisma.favorite.deleteMany({ where: { userId, favoriteId } });
    return { success: true };
  }

  static async listFavorites(userId: string): Promise<FavoriteUser[]> {
    const rows = await prisma.favorite.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        favorite: {
          select: { id: true, displayName: true, username: true, avatarUrl: true, hidePhoto: true },
        },
      },
    });

    return rows.map((row) => ({
      id: row.favorite.id,
      displayName: row.favorite.displayName,
      username: row.favorite.username,
      avatarUrl: row.favorite.hidePhoto ? null : row.favorite.avatarUrl,
      favoritedAt: row.createdAt,
    }));
  }

  /** Ids of the people this user has favorited (used to rank matches). */
  static async favoriteIds(userId: string): Promise<Set<string>> {
    const rows = await prisma.favorite.findMany({
      where: { userId },
      select: { favoriteId: true },
    });
    return new Set(rows.map((r) => r.favoriteId));
  }
}
