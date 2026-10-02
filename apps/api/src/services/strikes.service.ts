import type { StrikeReason } from '@prisma/client';

import { shouldSuspend, strikeWindowStart, suspensionEnd } from '../lib/booking-rules';
import { prisma } from '../lib/prisma';
import { EmailService } from './email.service';

export interface AddStrikeInput {
  userId: string;
  reason: StrikeReason;
  /** The booking that earned the strike. A booking earns at most one strike per reason. */
  bookingRequestId?: string;
  note?: string;
}

export interface AddStrikeResult {
  /** False when this booking already had a strike for this reason (a retried job). */
  added: boolean;
  strikesInWindow: number;
  suspendedUntil: Date | null;
}

const WARNING_AT = 3;

/** Strikes in the last 30 days (the only strikes that count). */
export async function countRecentStrikes(userId: string, now: Date = new Date()): Promise<number> {
  return prisma.strike.count({
    where: { userId, createdAt: { gte: strikeWindowStart(now) } },
  });
}

/**
 * Records a strike and suspends the user for 3 days at the 5th strike inside a
 * rolling 30 days. Strikes are never deleted; they just stop counting after 30 days.
 * Safe to call twice for the same booking and reason: the second call changes nothing.
 */
export async function addStrike(
  input: AddStrikeInput,
  now: Date = new Date(),
): Promise<AddStrikeResult> {
  const outcome = await prisma.$transaction(async (tx) => {
    if (input.bookingRequestId) {
      const existing = await tx.strike.findUnique({
        where: {
          bookingRequestId_reason: {
            bookingRequestId: input.bookingRequestId,
            reason: input.reason,
          },
        },
      });
      if (existing) {
        const user = await tx.user.findUnique({
          where: { id: input.userId },
          select: { suspendedUntil: true },
        });
        const strikesInWindow = await tx.strike.count({
          where: { userId: input.userId, createdAt: { gte: strikeWindowStart(now) } },
        });
        return { added: false, strikesInWindow, suspendedUntil: user?.suspendedUntil ?? null };
      }
    }

    await tx.strike.create({
      data: {
        userId: input.userId,
        reason: input.reason,
        bookingRequestId: input.bookingRequestId ?? null,
        note: input.note ?? null,
      },
    });

    const strikesInWindow = await tx.strike.count({
      where: { userId: input.userId, createdAt: { gte: strikeWindowStart(now) } },
    });

    const user = await tx.user.findUniqueOrThrow({
      where: { id: input.userId },
      select: { suspendedUntil: true },
    });

    let suspendedUntil = user.suspendedUntil;
    const alreadySuspended = suspendedUntil !== null && suspendedUntil > now;
    if (shouldSuspend(strikesInWindow) && !alreadySuspended) {
      suspendedUntil = suspensionEnd(now);
      await tx.user.update({ where: { id: input.userId }, data: { suspendedUntil } });
      return { added: true, strikesInWindow, suspendedUntil, newlySuspended: true };
    }

    return { added: true, strikesInWindow, suspendedUntil, newlySuspended: false };
  });

  if (outcome.added) {
    await notifyAboutStrike(input.userId, outcome);
  }

  return {
    added: outcome.added,
    strikesInWindow: outcome.strikesInWindow,
    suspendedUntil: outcome.suspendedUntil,
  };
}

async function notifyAboutStrike(
  userId: string,
  outcome: { strikesInWindow: number; suspendedUntil: Date | null; newlySuspended?: boolean },
): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) return;

  if (outcome.newlySuspended && outcome.suspendedUntil) {
    await EmailService.sendSuspensionNotification({ to: user.email, until: outcome.suspendedUntil });
  } else if (outcome.strikesInWindow === WARNING_AT) {
    await EmailService.sendStrikeWarning({ to: user.email, strikeCount: WARNING_AT });
  }
}
