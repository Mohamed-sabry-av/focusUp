/** A time already taken: a matched session, a booking waiting for a partner, or a slot picked but not booked. */
export interface TimeBlock {
  start: Date | string;
  durationMin: number;
}

/** A session must start at least this long from now (same rule as the server). */
export const MIN_LEAD_MINUTES = 5;

const MINUTE = 60 * 1000;

function endOf(start: Date | string, durationMin: number): number {
  return new Date(start).getTime() + durationMin * MINUTE;
}

/** Two sessions overlap when each starts before the other ends (back to back is fine). */
export function overlaps(aStart: Date | string, aDurationMin: number, bStart: Date | string, bDurationMin: number): boolean {
  return new Date(aStart).getTime() < endOf(bStart, bDurationMin) && endOf(aStart, aDurationMin) > new Date(bStart).getTime();
}

/** True when a session starting here would overlap time the person already has. */
export function isSlotBlocked(start: Date | string, durationMin: number, busy: ReadonlyArray<TimeBlock>): boolean {
  return busy.some((block) => overlaps(start, durationMin, block.start, block.durationMin));
}

export function isTooSoon(start: Date | string, now: Date): boolean {
  return new Date(start).getTime() < now.getTime() + MIN_LEAD_MINUTES * MINUTE;
}
