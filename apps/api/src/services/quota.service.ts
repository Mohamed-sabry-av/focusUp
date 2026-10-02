import { env } from '@focusUp/env/server';
import type { BookingRequestStatus } from '@prisma/client';

import { getWeekBounds, FREE_WEEKLY_LIMIT } from '../lib/quota';
import { prisma } from '../lib/prisma';

/**
 * Bookings that use up a free-plan session (spec §5.1). A session counts when it is
 * booked and is given back when it is cancelled early, expired, or ends solo.
 * A late cancellation or your own no-show still counts.
 */
const COUNTING_STATUSES: BookingRequestStatus[] = [
  'PENDING',
  'MATCHED',
  'COMPLETED',
  'LATE_CANCELLED',
  'NO_SHOW',
];

export interface QuotaStatus {
  /** Sessions used this Monday-to-Sunday week (in the user's timezone). */
  used: number;
  /** The weekly limit, or null when there is none (paid plan, or not enforced yet). */
  limit: number | null;
}

export interface QuotaUser {
  id: string;
  timezone: string;
  planTier: string;
}

function weeklyLimitFor(user: QuotaUser): number | null {
  return env.QUOTA_ENFORCED && user.planTier === 'FREE' ? FREE_WEEKLY_LIMIT : null;
}

/** Sessions the user has used in the week that contains `anchor`. */
async function countUsedInWeek(user: QuotaUser, anchor: Date): Promise<number> {
  const { start, end } = getWeekBounds(anchor, user.timezone);
  return prisma.bookingRequest.count({
    where: {
      userId: user.id,
      countsToQuota: true,
      status: { in: COUNTING_STATUSES },
      slotTime: { gte: start, lt: end },
    },
  });
}

export async function getQuotaStatus(user: QuotaUser, now: Date = new Date()): Promise<QuotaStatus> {
  return { used: await countUsedInWeek(user, now), limit: weeklyLimitFor(user) };
}

/** True when booking a session at `slotTime` would go over the weekly limit of that week. */
export async function isOverQuota(user: QuotaUser, slotTime: Date): Promise<boolean> {
  const limit = weeklyLimitFor(user);
  if (limit === null) return false;
  return (await countUsedInWeek(user, slotTime)) >= limit;
}
