import { Prisma } from '@prisma/client';

import { rankCandidates } from '../../../lib/ranking';
import { prisma } from '../../../lib/prisma';
import { withSerializableRetry } from '../../../lib/transactions';

/** How many waiting bookings to look at when choosing a partner (oldest first). */
const MAX_CANDIDATES = 50;

export class MatchingService {
  /**
   * Try to match a pending booking with another pending booking for the same
   * start time and duration (spec §5.2).
   *
   * Hard rules (a candidate that breaks one is never matched):
   *   - same start time and duration, a different person
   *   - nobody has blocked the other (blocks are stored in both directions)
   *   - the partner is active, not banned and not suspended
   *
   * Soft rules only decide who is picked first among the people who pass:
   * favorites, then the same camera choice, the same Quiet choice, the same
   * Desk/Walk type, and finally whoever has waited longest (see rankCandidates).
   *
   * Runs in a serializable transaction so two people booking at the same moment
   * can never both claim the same waiting partner. If the database aborts one of
   * them, it is retried; by then the booking is already matched and nothing is done.
   *
   * @returns The new Session (with both users) when matched, or null.
   */
  static async matchBookingRequest(bookingRequestId: string) {
    return withSerializableRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const now = new Date();

          // 1. The requesting booking must still be waiting
          const booking = await tx.bookingRequest.findUnique({
            where: { id: bookingRequestId },
          });
          if (!booking || booking.status !== 'PENDING') return null;

          // 2. People this user must not be matched with (blocks go both ways)
          const blocks = await tx.block.findMany({
            where: { OR: [{ blockerId: booking.userId }, { blockedId: booking.userId }] },
            select: { blockerId: true, blockedId: true },
          });
          const blockedUserIds = blocks.map((b) =>
            b.blockerId === booking.userId ? b.blockedId : b.blockerId,
          );

          // 3. Everyone waiting for the same slot who passes the hard rules
          const candidates = await tx.bookingRequest.findMany({
            where: {
              slotTime: booking.slotTime,
              durationMin: booking.durationMin,
              status: 'PENDING',
              userId: { notIn: [booking.userId, ...blockedUserIds] },
              user: {
                isBanned: false,
                isActive: true,
                OR: [{ suspendedUntil: null }, { suspendedUntil: { lt: now } }],
              },
            },
            orderBy: { createdAt: 'asc' },
            take: MAX_CANDIDATES,
          });
          if (candidates.length === 0) return null;

          // 4. Pick the best partner: favorites first, then the closest preferences
          const favorites = await tx.favorite.findMany({
            where: { userId: booking.userId },
            select: { favoriteId: true },
          });
          const [match] = rankCandidates(
            booking,
            candidates,
            new Set(favorites.map((f) => f.favoriteId)),
          );
          if (!match) return null;

          // 5. Create the session. The person who waited longer is user1.
          const session = await tx.session.create({
            data: {
              user1Id: match.userId,
              user2Id: booking.userId,
              durationMin: booking.durationMin,
              status: 'CONFIRMED',
              scheduledAt: booking.slotTime,
              // Temporary unique placeholder, replaced by the session id below
              livekitRoomName: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
            },
          });

          // Room name = session id (never a user id)
          const updatedSession = await tx.session.update({
            where: { id: session.id },
            data: { livekitRoomName: session.id },
            include: { user1: true, user2: true },
          });

          // 6. Both bookings are now matched
          await tx.bookingRequest.updateMany({
            where: { id: { in: [match.id, booking.id] } },
            data: { status: 'MATCHED', sessionId: session.id },
          });

          return updatedSession;
        },
        {
          // Serializable isolation: two transactions cannot both match the same waiting booking.
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        },
      ),
    );
  }
}
