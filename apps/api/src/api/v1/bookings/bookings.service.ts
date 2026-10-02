import { Prisma } from '@prisma/client';
import type { CreateBookingInput } from '@focusUp/shared-types';

import {
  MAX_FUTURE_BOOKINGS,
  BOOKING_HORIZON_DAYS,
  isFarEnough,
  isFreeCancellation,
  isOnQuarterHour,
  isSupportedDuration,
  isWithinHorizon,
} from '../../../lib/booking-rules';
import { prisma } from '../../../lib/prisma';
import { withSerializableRetry } from '../../../lib/transactions';
import { FREE_WEEKLY_LIMIT } from '../../../lib/quota';
import {
  scheduleNoshowCheck,
  scheduleRematchChecks,
  scheduleReminders,
  scheduleBookingExpiry,
  removeJob,
  REMATCH_CHECK_MINUTES,
  rematchJobId,
} from '../../../queues/helpers';
import { NotificationService } from '../../../services/notification.service';
import { isOverQuota } from '../../../services/quota.service';
import { addStrike } from '../../../services/strikes.service';
import { AppError } from '../../../utils/errors';
import { FavoritesService } from '../favorites/favorites.service';
import { MatchingService } from '../matching/matching.service';

const MINUTE = 60 * 1000;

export type CreateBookingParams = Omit<CreateBookingInput, 'slotTime'> & { slotTime: Date };

function initialsOf(displayName: string): string {
  const letters = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase());
  return letters.join('') || '?';
}

export class BookingsService {
  /**
   * Create a booking and try to match it at once (spec §5).
   *
   * Checks, in order: at least 5 minutes ahead, on a quarter hour, a 25/50/75
   * minute session, no more than 14 days ahead, email verified, not suspended,
   * weekly free limit (only when switched on), then inside one serializable
   * transaction: no overlapping booking of your own and at most 3 upcoming ones.
   */
  static async createBooking(userId: string, params: CreateBookingParams) {
    const { slotTime, durationMin } = params;
    const now = new Date();

    if (!isFarEnough(slotTime, now)) {
      throw new AppError('Session time must be at least 5 minutes in the future', 400);
    }
    if (!isOnQuarterHour(slotTime)) {
      throw new AppError(
        'Session times must start on a 15-minute boundary (XX:00, XX:15, XX:30, XX:45)',
        400,
      );
    }
    if (!isSupportedDuration(durationMin)) {
      throw new AppError('Duration must be 25, 50, or 75 minutes', 400);
    }
    if (!isWithinHorizon(slotTime, now)) {
      throw new AppError(`You can book up to ${BOOKING_HORIZON_DAYS} days ahead`, 400);
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        timezone: true,
        planTier: true,
        emailVerified: true,
        suspendedUntil: true,
      },
    });
    if (!user) {
      throw new AppError('User not found', 404);
    }
    if (!user.emailVerified) {
      throw new AppError('Please verify your email before booking sessions', 403);
    }
    if (user.suspendedUntil && user.suspendedUntil > now) {
      throw new AppError(
        `Your account is suspended until ${user.suspendedUntil.toISOString()} because of missed sessions`,
        403,
      );
    }
    if (await isOverQuota(user, slotTime)) {
      throw new AppError(
        `Free plan limit reached (${FREE_WEEKLY_LIMIT}/${FREE_WEEKLY_LIMIT} sessions this week). Upgrade to book more.`,
        403,
      );
    }

    const requestEnd = new Date(slotTime.getTime() + durationMin * MINUTE);

    // Check and create together so two quick clicks cannot book the same time twice.
    const bookingRequest = await withSerializableRetry(() =>
      prisma.$transaction(
        async (tx) => {
          const active = await tx.bookingRequest.findMany({
            where: { userId, status: { in: ['PENDING', 'MATCHED'] }, slotTime: { gt: new Date(now.getTime() - 75 * MINUTE) } },
            select: { slotTime: true, durationMin: true },
          });

          for (const existing of active) {
            const existingEnd = new Date(existing.slotTime.getTime() + existing.durationMin * MINUTE);
            const overlaps = existing.slotTime < requestEnd && existingEnd > slotTime;
            if (!overlaps) continue;
            if (existing.slotTime.getTime() === slotTime.getTime() && existing.durationMin === durationMin) {
              throw new AppError('You already have a booking for this time slot', 409);
            }
            throw new AppError('You already have a booking that overlaps this time', 409);
          }

          const upcoming = active.filter((b) => b.slotTime > now).length;
          if (upcoming >= MAX_FUTURE_BOOKINGS) {
            throw new AppError(`You can have at most ${MAX_FUTURE_BOOKINGS} upcoming bookings at a time`, 409);
          }

          return tx.bookingRequest.create({
            data: {
              userId,
              slotTime,
              durationMin,
              status: 'PENDING',
              cameraOn: params.cameraOn,
              quiet: params.quiet,
              taskType: params.taskType,
              preferFavorites: params.preferFavorites,
              flexible: params.flexible,
            },
          });
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      ),
    );

    // Try to match straight away
    const session = await MatchingService.matchBookingRequest(bookingRequest.id);

    if (session) {
      await scheduleNoshowCheck(session.id, session.scheduledAt);
      await scheduleRematchChecks(session.id, session.scheduledAt);
      await scheduleReminders(session.id, session.scheduledAt);
      await NotificationService.notifyMatch(session);

      const updatedBooking = await prisma.bookingRequest.findUnique({
        where: { id: bookingRequest.id },
      });
      return { bookingRequest: updatedBooking ?? bookingRequest, session };
    }

    // Nobody to match with yet: wait, and expire at the start time if still alone
    await scheduleBookingExpiry(bookingRequest.id, slotTime);

    return { bookingRequest, session: null };
  }

  /**
   * List user's booking requests with optional status filter and pagination.
   * For MATCHED bookings, includes session with partner info.
   */
  static async listBookings(userId: string, status?: string, page: number = 1, limit: number = 10) {
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
                select: { id: true, displayName: true, username: true, avatarUrl: true },
              },
              user2: {
                select: { id: true, displayName: true, username: true, avatarUrl: true },
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

    return { data, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Cancel a booking (spec §5.5).
   *
   * - Waiting (PENDING): cancelled, nothing else changes.
   * - Matched, at least 1 hour before the start: free. The session is given back
   *   (no quota used) and the partner goes back to waiting and is rematched.
   * - Matched, less than 1 hour before: allowed, but it is a LATE_CANCELLED booking,
   *   the session still counts, and the canceller gets one strike. The partner is
   *   treated the same as above.
   */
  static async cancelBooking(bookingId: string, userId: string) {
    const booking = await prisma.bookingRequest.findUnique({ where: { id: bookingId } });

    if (!booking) {
      throw new AppError('Booking not found', 404);
    }
    if (booking.userId !== userId) {
      throw new AppError('Not authorized', 403);
    }
    if (booking.status !== 'PENDING' && booking.status !== 'MATCHED') {
      throw new AppError(
        booking.status === 'EXPIRED' || booking.status === 'CANCELLED'
          ? 'Booking is already cancelled or expired'
          : 'Cannot cancel booking in current state',
        400,
      );
    }

    // ── Waiting booking ───────────────────────────────────────────
    if (booking.status === 'PENDING') {
      await prisma.bookingRequest.update({
        where: { id: bookingId },
        data: { status: 'CANCELLED', countsToQuota: false },
      });
      await removeJob('booking-expiry', `expiry-${bookingId}`);
      return { success: true, message: 'Booking cancelled' };
    }

    // ── Matched booking ───────────────────────────────────────────
    const free = isFreeCancellation(booking.slotTime, new Date());

    const partnerBooking = await prisma.$transaction(async (tx) => {
      await tx.bookingRequest.update({
        where: { id: bookingId },
        data: free
          ? { status: 'CANCELLED', countsToQuota: false }
          : { status: 'LATE_CANCELLED' },
      });

      if (booking.sessionId) {
        await tx.session.update({
          where: { id: booking.sessionId },
          data: { status: 'CANCELLED' },
        });
      }

      const partner = await tx.bookingRequest.findFirst({
        where: { sessionId: booking.sessionId, userId: { not: userId } },
      });

      // The partner goes back to waiting
      if (partner) {
        await tx.bookingRequest.update({
          where: { id: partner.id },
          data: { status: 'PENDING', sessionId: null },
        });
      }

      return partner;
    });

    // Jobs that belonged to the cancelled session
    if (booking.sessionId) {
      await removeJob('session-noshow', `noshow-${booking.sessionId}`);
      for (const minute of REMATCH_CHECK_MINUTES) {
        await removeJob('session-rematch', rematchJobId(booking.sessionId, minute));
      }
      await removeJob('session-reminder', `reminder-24h-${booking.sessionId}`);
      await removeJob('session-reminder', `reminder-5m-${booking.sessionId}`);
    }

    // Look for a new partner for the person who is left
    if (partnerBooking) {
      const rematchSession = await MatchingService.matchBookingRequest(partnerBooking.id);
      if (rematchSession) {
        await scheduleNoshowCheck(rematchSession.id, rematchSession.scheduledAt);
        await scheduleRematchChecks(rematchSession.id, rematchSession.scheduledAt);
        await scheduleReminders(rematchSession.id, rematchSession.scheduledAt);
        await NotificationService.notifyMatch(rematchSession);
      } else {
        await scheduleBookingExpiry(partnerBooking.id, partnerBooking.slotTime);
      }
    }

    if (!free) {
      await addStrike({ userId, reason: 'LATE_CANCEL', bookingRequestId: booking.id });
    }

    return { success: true, message: 'Booking cancelled' };
  }

  /**
   * Waiting bookings from other people, for the calendar (spec §2.2).
   * Shows who is waiting and with which options, so people can pick a good slot.
   * People who chose to hide their photo are shown as initials: the server drops
   * the photo, so it never reaches the browser.
   */
  static async getAvailableBookings(currentUserId: string, dateStr: string, days: number) {
    const startDate = new Date(dateStr);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setUTCDate(startDate.getUTCDate() + days);

    // People the current user has blocked or who blocked them (stored in both directions)
    const blocks = await prisma.block.findMany({
      where: { OR: [{ blockerId: currentUserId }, { blockedId: currentUserId }] },
      select: { blockerId: true, blockedId: true },
    });

    const excludedUserIds = new Set<string>([currentUserId]);
    for (const b of blocks) {
      excludedUserIds.add(b.blockerId === currentUserId ? b.blockedId : b.blockerId);
    }

    const now = new Date();
    const [bookings, favoriteIds] = await Promise.all([
      prisma.bookingRequest.findMany({
        where: {
          status: 'PENDING',
          slotTime: { gte: startDate, lt: endDate },
          userId: { notIn: Array.from(excludedUserIds) },
          user: {
            isBanned: false,
            isActive: true,
            OR: [{ suspendedUntil: null }, { suspendedUntil: { lt: now } }],
          },
        },
        select: {
          id: true,
          slotTime: true,
          durationMin: true,
          cameraOn: true,
          quiet: true,
          taskType: true,
          user: {
            select: { id: true, displayName: true, username: true, avatarUrl: true, hidePhoto: true },
          },
        },
        orderBy: { slotTime: 'asc' },
      }),
      FavoritesService.favoriteIds(currentUserId),
    ]);

    return {
      bookings: bookings.map(({ user, ...booking }) => ({
        ...booking,
        isFavorite: favoriteIds.has(user.id),
        user: {
          id: user.id,
          displayName: user.displayName,
          username: user.username,
          avatarUrl: user.hidePhoto ? null : user.avatarUrl,
          initials: initialsOf(user.displayName),
        },
      })),
    };
  }
}
