import { prisma } from '../../../lib/prisma';
import { AppError } from '../../../utils/errors';
import { MatchingService } from '../matching/matching.service';
import {
  scheduleNoshowCheck,
  scheduleReminders,
  scheduleBookingExpiry,
  removeJob,
} from '../../../queues/helpers';

export class BookingsService {
  /**
   * Create a new booking request and attempt immediate matching.
   *
   * Validations (in order):
   * a) slotTime > now + 5 minutes
   * b) slotTime on 15-minute boundary
   * c) durationMin ∈ {25, 50, 75}
   * d) User email verified
   * e) Free tier weekly limit (3 sessions)
   * f) No duplicate booking for same slot
   * g) No overlapping confirmed/active session
   */
  static async createBooking(
    userId: string,
    slotTime: Date,
    durationMin: number
  ) {
    // a) slotTime must be in the future (> now + 5 minutes minimum lead time)
    const minLeadTime = new Date(Date.now() + 5 * 60 * 1000);
    if (slotTime <= minLeadTime) {
      throw new AppError(
        'Session time must be at least 5 minutes in the future',
        400
      );
    }

    // b) slotTime minutes must be on a 15-minute boundary
    if (slotTime.getMinutes() % 15 !== 0) {
      throw new AppError(
        'Session times must start on a 15-minute boundary (XX:00, XX:15, XX:30, XX:45)',
        400
      );
    }

    // c) durationMin must be 25, 50, or 75
    if (![25, 50, 75].includes(durationMin)) {
      throw new AppError('Duration must be 25, 50, or 75 minutes', 400);
    }

    // d) Email verification
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (!user.emailVerified) {
      throw new AppError(
        'Please verify your email before booking sessions',
        403
      );
    }

    // e) Free tier limit: 3 sessions per ISO week
    if (user.planTier === 'FREE') {
      const weekBounds = getISOWeekBounds();

      const [completedSessionCount, matchedBookingCount] = await Promise.all([
        prisma.session.count({
          where: {
            OR: [{ user1Id: userId }, { user2Id: userId }],
            status: 'COMPLETED',
            scheduledAt: {
              gte: weekBounds.start,
              lt: weekBounds.end,
            },
          },
        }),
        prisma.bookingRequest.count({
          where: {
            userId,
            status: 'MATCHED',
            slotTime: {
              gte: weekBounds.start,
              lt: weekBounds.end,
            },
          },
        }),
      ]);

      if (completedSessionCount + matchedBookingCount >= 3) {
        throw new AppError(
          'Free tier limit reached (3/3 sessions this week). Upgrade to Pro for unlimited sessions.',
          403
        );
      }
    }

    // f) Duplicate check
    const duplicate = await prisma.bookingRequest.findFirst({
      where: {
        userId,
        slotTime,
        durationMin,
        status: { in: ['PENDING', 'MATCHED'] },
      },
    });
    if (duplicate) {
      throw new AppError('You already have a booking for this time slot', 409);
    }

    // g) Session overlap check
    const requestEnd = new Date(slotTime.getTime() + durationMin * 60 * 1000);
    const potentialOverlaps = await prisma.session.findMany({
      where: {
        OR: [{ user1Id: userId }, { user2Id: userId }],
        status: { in: ['CONFIRMED', 'ACTIVE'] },
        scheduledAt: { lt: requestEnd },
      },
    });

    const overlapping = potentialOverlaps.filter((s) => {
      const sessionEnd = new Date(
        s.scheduledAt.getTime() + s.durationMin * 60 * 1000
      );
      return sessionEnd > slotTime;
    });

    if (overlapping.length > 0) {
      throw new AppError('You have an overlapping session at this time', 409);
    }

    // All validations passed — create BookingRequest
    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        userId,
        slotTime,
        durationMin,
        status: 'PENDING',
      },
    });

    // Attempt immediate matching
    const session = await MatchingService.matchBookingRequest(
      bookingRequest.id
    );

    if (session) {
      // Match found — schedule noshow check and reminders
      await scheduleNoshowCheck(session.id, session.scheduledAt);
      await scheduleReminders(session.id, session.scheduledAt);

      // Re-fetch the updated booking request (now MATCHED with sessionId)
      const updatedBooking = await prisma.bookingRequest.findUnique({
        where: { id: bookingRequest.id },
      });

      return { bookingRequest: updatedBooking ?? bookingRequest, session };
    }

    // No match — schedule booking expiry at slot time
    await scheduleBookingExpiry(bookingRequest.id, slotTime);

    return { bookingRequest, session: null };
  }

  /**
   * List user's booking requests with optional status filter and pagination.
   * For MATCHED bookings, includes session with partner info.
   */
  static async listBookings(
    userId: string,
    status?: string,
    page: number = 1,
    limit: number = 10
  ) {
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { userId };
    if (status) {
      where.status = status;
    }

    const [total, bookingRequests] = await Promise.all([
      prisma.bookingRequest.count({ where }),
      prisma.bookingRequest.findMany({
        where,
        orderBy: { slotTime: 'desc' },
        skip,
        take: limit,
        include: {
          session: {
            include: {
              user1: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
              user2: {
                select: {
                  id: true,
                  displayName: true,
                  username: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
    ]);

    // For MATCHED bookings, extract partner info for convenience
    const data = bookingRequests.map((br) => {
      if (br.session) {
        const isUser1 = br.session.user1Id === userId;
        const partner = isUser1 ? br.session.user2 : br.session.user1;
        return { ...br, partner };
      }
      return { ...br, partner: null };
    });

    return {
      data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Cancel a booking request.
   *
   * - PENDING: simple status change + remove expiry job
   * - MATCHED: transaction to cancel session, revert partner booking to PENDING,
   *   then re-trigger matching for the partner
   * - Late cancellation (< 1 hour before slot, MATCHED): increment strikeCount
   */
  static async cancelBooking(bookingId: string, userId: string) {
    const booking = await prisma.bookingRequest.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }

    if (booking.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }

    if (booking.status === 'EXPIRED' || booking.status === 'CANCELLED') {
      throw new AppError('Booking is already cancelled or expired', 400);
    }

    // ── PENDING cancellation ──────────────────────────────────────
    if (booking.status === 'PENDING') {
      await prisma.bookingRequest.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED' },
      });

      await removeJob('booking-expiry', `expiry-${bookingId}`);

      return { success: true, message: 'Booking cancelled' };
    }

    // ── MATCHED cancellation ──────────────────────────────────────
    if (booking.status === 'MATCHED') {
      const partnerBooking = await prisma.$transaction(async (tx) => {
        // a) Set this booking status = CANCELLED
        await tx.bookingRequest.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED' },
        });

        // b) Set linked session status = CANCELLED
        if (booking.sessionId) {
          await tx.session.update({
            where: { id: booking.sessionId },
            data: { status: 'CANCELLED' },
          });
        }

        // c) Find partner's BookingRequest for this session
        const partner = await tx.bookingRequest.findFirst({
          where: {
            sessionId: booking.sessionId,
            userId: { not: userId },
          },
        });

        // d) Set partner's booking: status = PENDING, sessionId = null
        if (partner) {
          await tx.bookingRequest.update({
            where: { id: partner.id },
            data: { status: 'PENDING', sessionId: null },
          });
        }

        return partner;
      });

      // e) Remove scheduled jobs for the cancelled session
      if (booking.sessionId) {
        await removeJob('session-noshow', `noshow-${booking.sessionId}`);
        await removeJob(
          'session-reminder',
          `reminder-24h-${booking.sessionId}`
        );
        await removeJob(
          'session-reminder',
          `reminder-5m-${booking.sessionId}`
        );
      }

      // f) Re-trigger matching for partner
      if (partnerBooking) {
        await MatchingService.matchBookingRequest(partnerBooking.id);
      }

      // 6. Late cancellation penalty
      //    If slotTime is within 1 hour from now AND booking was MATCHED
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      if (booking.slotTime <= oneHourFromNow) {
        const updatedUser = await prisma.user.update({
          where: { id: userId },
          data: { strikeCount: { increment: 1 } },
        });

        if (updatedUser.strikeCount >= 3 && updatedUser.strikeCount < 5) {
          console.warn(
            `User ${userId} has ${updatedUser.strikeCount} strikes — warning threshold reached`
          );
        }

        if (updatedUser.strikeCount >= 5) {
          await prisma.user.update({
            where: { id: userId },
            data: { isBanned: true },
          });
          console.warn(`User ${userId} has been banned — 5 strikes reached`);
        }
      }

      return { success: true, message: 'Booking cancelled' };
    }

    throw new AppError('Cannot cancel booking in current state', 400);
  }
}

/**
 * Calculate the start (Monday 00:00 UTC) and end (next Monday 00:00 UTC)
 * of the current ISO week.
 */
function getISOWeekBounds(): { start: Date; end: Date } {
  const now = new Date();
  const day = now.getUTCDay(); // 0 = Sunday, 1 = Monday, …, 6 = Saturday
  const diff = day === 0 ? 6 : day - 1; // days since last Monday

  const start = new Date(now);
  start.setUTCDate(now.getUTCDate() - diff);
  start.setUTCHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 7);

  return { start, end };
}
