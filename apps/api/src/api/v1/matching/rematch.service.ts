import { Prisma } from '@prisma/client';

import { lonelyUserId } from '../../../lib/rematch';
import { prisma } from '../../../lib/prisma';
import { withSerializableRetry } from '../../../lib/transactions';

/** How many other waiting sessions to look at (oldest first). */
const MAX_CANDIDATES = 50;

export interface RematchResult {
  /** The new session both people move to. */
  sessionId: string;
  scheduledAt: Date;
  /** The two people who were each waiting alone. */
  userIds: [string, string];
}

/**
 * Two people whose partners never came are paired with each other, like Focusmate does.
 *
 * It only ever pairs people who are in the room right now with an absent partner, for the
 * same start time and duration, who have not blocked each other. Their old sessions stay
 * as they are (so the absent partners still get their no-show at T+5) and point to the new
 * one with `rematchedToId`; the bookings of the two present people move to the new session.
 *
 * Safe to run twice: a session that was already paired is skipped. Serializable, so two jobs
 * can never pair the same person twice.
 */
export class RematchService {
  static async rematchLonelySession(sessionId: string): Promise<RematchResult | null> {
    return withSerializableRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const a = await tx.session.findUnique({
            where: { id: sessionId },
            include: { participants: true },
          });
          if (!a || a.status !== 'CONFIRMED' || a.isSolo || a.rematchedToId || !a.user2Id) return null;

          const lonelyA = lonelyUserId(a.participants);
          if (!lonelyA) return null;

          const blocks = await tx.block.findMany({
            where: { OR: [{ blockerId: lonelyA }, { blockedId: lonelyA }] },
            select: { blockerId: true, blockedId: true },
          });
          const blocked = new Set(blocks.flatMap((b) => [b.blockerId, b.blockedId]));

          const others = await tx.session.findMany({
            where: {
              id: { not: a.id },
              scheduledAt: a.scheduledAt,
              durationMin: a.durationMin,
              status: 'CONFIRMED',
              isSolo: false,
              rematchedToId: null,
              user2Id: { not: null },
            },
            include: { participants: true },
            orderBy: { createdAt: 'asc' },
            take: MAX_CANDIDATES,
          });

          let partner: { sessionId: string; userId: string } | null = null;
          for (const b of others) {
            const lonelyB = lonelyUserId(b.participants);
            if (!lonelyB || lonelyB === lonelyA || blocked.has(lonelyB)) continue;
            partner = { sessionId: b.id, userId: lonelyB };
            break;
          }
          if (!partner) return null;

          const created = await tx.session.create({
            data: {
              user1Id: partner.userId,
              user2Id: lonelyA,
              durationMin: a.durationMin,
              status: 'CONFIRMED',
              scheduledAt: a.scheduledAt,
              // Temporary unique placeholder, replaced by the session id below
              livekitRoomName: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            },
          });
          // Room name = session id (never a user id)
          await tx.session.update({ where: { id: created.id }, data: { livekitRoomName: created.id } });

          await tx.bookingRequest.updateMany({
            where: { OR: [{ sessionId: a.id, userId: lonelyA }, { sessionId: partner.sessionId, userId: partner.userId }] },
            data: { sessionId: created.id },
          });
          await tx.session.updateMany({
            where: { id: { in: [a.id, partner.sessionId] } },
            data: { rematchedToId: created.id },
          });

          return { sessionId: created.id, scheduledAt: a.scheduledAt, userIds: [lonelyA, partner.userId] as [string, string] };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );
  }
}
