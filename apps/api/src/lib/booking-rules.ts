import { SESSION_DURATIONS } from "@focusUp/shared-types";

export const MIN_LEAD_TIME_MINUTES = 5;
export const BOOKING_HORIZON_DAYS = 14;
export const MAX_FUTURE_BOOKINGS = 3;
// The cancellation rule is shared with the browser, so both always agree.
export { FREE_CANCEL_HOURS, isFreeCancellation } from "@focusUp/shared-types";

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function isSupportedDuration(durationMin: number): boolean {
  return (SESSION_DURATIONS as readonly number[]).includes(durationMin);
}

/** Start times are on a quarter hour (UTC minutes match the local minutes in every timezone we serve). */
export function isOnQuarterHour(slot: Date): boolean {
  return slot.getUTCMinutes() % 15 === 0 && slot.getUTCSeconds() === 0 && slot.getUTCMilliseconds() === 0;
}

export function isFarEnough(slot: Date, now: Date): boolean {
  return slot.getTime() > now.getTime() + MIN_LEAD_TIME_MINUTES * MINUTE;
}

export function isWithinHorizon(slot: Date, now: Date): boolean {
  return slot.getTime() <= now.getTime() + BOOKING_HORIZON_DAYS * DAY;
}

// ── Strikes (spec §6.1) ──────────────────────────────────────────

export const STRIKE_WINDOW_DAYS = 30;
export const STRIKES_FOR_SUSPENSION = 5;
export const SUSPENSION_DAYS = 3;

export function strikeWindowStart(now: Date): Date {
  return new Date(now.getTime() - STRIKE_WINDOW_DAYS * DAY);
}

/** The end of a suspension that starts now. */
export function suspensionEnd(now: Date): Date {
  return new Date(now.getTime() + SUSPENSION_DAYS * DAY);
}

/** `strikesInWindow` already includes the strike that was just added. */
export function shouldSuspend(strikesInWindow: number): boolean {
  return strikesInWindow >= STRIKES_FOR_SUSPENSION;
}
