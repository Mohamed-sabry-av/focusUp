import type { SessionStatus } from '@prisma/client';
import type { SessionPhase } from '@focusUp/shared-types';

const MINUTE = 60 * 1000;

/** The room opens this long before the start time. */
export const JOIN_OPENS_BEFORE_MIN = 5;
/** A partner who is not in the room this long after the start is re-matched if possible. */
export const REMATCH_AFTER_MIN = 1;
/** After this long alone, the person is offered a solo session. */
export const SOLO_OFFER_AFTER_MIN = 3;
/** After this long, the absent partner is a no-show. */
export const NO_SHOW_AFTER_MIN = 5;
/** One "keep going" adds this much, at most {@link MAX_EXTENSIONS} times. */
export const EXTENSION_MIN = 15;
export const MAX_EXTENSIONS = 2;

export interface PhaseInput {
  status: SessionStatus;
  isSolo: boolean;
  scheduledAt: Date;
  durationMin: number;
  now: Date;
  /** The partner has been seen in the room at least once. */
  partnerHasJoined: boolean;
  /** The caller's own "keep going" end time, if they asked for one. */
  extendedUntil: Date | null;
}

/** When the booked time ends (without any extension). */
export function sessionEnd(scheduledAt: Date, durationMin: number): Date {
  return new Date(scheduledAt.getTime() + durationMin * MINUTE);
}

/** The earliest moment a token may be issued for the room. */
export function joinOpensAt(scheduledAt: Date): Date {
  return new Date(scheduledAt.getTime() - JOIN_OPENS_BEFORE_MIN * MINUTE);
}

/**
 * Where the session is, from one person's point of view. Computed on the server so the
 * browser never decides who is late.
 */
export function computePhase(input: PhaseInput): SessionPhase {
  const { status, isSolo, scheduledAt, durationMin, now, partnerHasJoined, extendedUntil } = input;
  const end = sessionEnd(scheduledAt, durationMin);
  const extended = extendedUntil !== null && now < extendedUntil && now >= end;

  if (extended) return 'EXTENDED';
  if (status === 'COMPLETED' || status === 'CANCELLED' || status === 'NO_SHOW') return 'ENDED';

  if (now < joinOpensAt(scheduledAt)) return 'UPCOMING';
  if (now < scheduledAt) return 'LOBBY';
  if (now >= end) return 'CHECK_OUT';

  if (isSolo || status === 'ACTIVE' || partnerHasJoined) return 'IN_SESSION';

  const minutesLate = (now.getTime() - scheduledAt.getTime()) / MINUTE;
  if (minutesLate < REMATCH_AFTER_MIN) return 'WAITING_FOR_PARTNER';
  if (minutesLate < SOLO_OFFER_AFTER_MIN) return 'FINDING_REMATCH';
  if (minutesLate < NO_SHOW_AFTER_MIN) return 'SOLO_OFFER';
  return 'PARTNER_ABSENT';
}

/** The end of the room for this person: the booked end, or their own extension. */
export function personalEnd(scheduledAt: Date, durationMin: number, extendedUntil: Date | null): Date {
  const end = sessionEnd(scheduledAt, durationMin);
  return extendedUntil && extendedUntil > end ? extendedUntil : end;
}

/** The new "keep going" end time, or null when this person has used all their extensions. */
export function nextExtension(params: {
  scheduledAt: Date;
  durationMin: number;
  extendedUntil: Date | null;
  extensionCount: number;
}): Date | null {
  if (params.extensionCount >= MAX_EXTENSIONS) return null;
  const base = personalEnd(params.scheduledAt, params.durationMin, params.extendedUntil);
  return new Date(base.getTime() + EXTENSION_MIN * MINUTE);
}
