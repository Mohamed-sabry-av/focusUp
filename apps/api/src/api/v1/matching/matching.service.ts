import { Prisma } from '@prisma/client';
import { prisma } from '../../../lib/prisma';

export class MatchingService {
  /**
   * Attempt to match a pending booking request with another pending request
   * for the same time slot and duration.
   *
   * CRITICAL: Uses Serializable transaction isolation to prevent double-matching.
   * Two concurrent calls cannot match the same PENDING booking — the DB will
   * serialize the transactions and only one will succeed in claiming the match.
   *
   * @returns The created Session (with user1/user2 included) if matched, or null
   */
  static async matchBookingRequest(bookingRequestId: string) {
    return await prisma.$transaction(
      async (tx) => {
        // 1. Fetch the requesting booking — verify it is PENDING
        const booking = await tx.bookingRequest.findUnique({
          where: { id: bookingRequestId },
        });
        if (!booking || booking.status !== 'PENDING') return null;

        // 2. Get all blocked user IDs for this user (BOTH directions)
        const blocks = await tx.block.findMany({
          where: {
            OR: [
              { blockerId: booking.userId },
              { blockedId: booking.userId },
            ],
          },
          select: { blockerId: true, blockedId: true },
        });
        const blockedUserIds = blocks.map((b) =>
          b.blockerId === booking.userId ? b.blockedId : b.blockerId
        );

        // 3. Find earliest PENDING booking in same slot + duration, excluding:
        //    - Same user
        //    - Blocked users
        //    - Banned users (isBanned = true)
        //    - Inactive users (isActive = false)
        const match = await tx.bookingRequest.findFirst({
          where: {
            slotTime: booking.slotTime,
            durationMin: booking.durationMin,
            status: 'PENDING',
            userId: {
              notIn: [booking.userId, ...blockedUserIds],
            },
            user: {
              isBanned: false,
              isActive: true,
            },
          },
          orderBy: { createdAt: 'asc' },
          include: { user: true },
        });

        if (!match) return null; // No partner available

        // 4. Create Session
        //    Earlier booking user = user1, current booking user = user2
        const session = await tx.session.create({
          data: {
            user1Id: match.userId,
            user2Id: booking.userId,
            durationMin: booking.durationMin,
            status: 'CONFIRMED',
            scheduledAt: booking.slotTime,
            // Temporary unique placeholder — updated to session.id below
            livekitRoomName: `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          },
          include: { user1: true, user2: true },
        });

        // Set livekitRoomName = session.id (the cuid)
        const updatedSession = await tx.session.update({
          where: { id: session.id },
          data: { livekitRoomName: session.id },
          include: { user1: true, user2: true },
        });

        // 5. Update BOTH bookings to MATCHED
        await tx.bookingRequest.update({
          where: { id: match.id },
          data: { status: 'MATCHED', sessionId: session.id },
        });

        await tx.bookingRequest.update({
          where: { id: booking.id },
          data: { status: 'MATCHED', sessionId: session.id },
        });

        return updatedSession;
      },
      {
        // CRITICAL: Serializable isolation prevents double-matching.
        // If two transactions try to match the same PENDING booking concurrently,
        // the DB will detect the conflict and abort one of them.
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      }
    );
  }
}
