/** Free plan allowance (spec §5.1): counted sessions per Monday to Sunday week in the user's timezone. */
export const FREE_WEEKLY_LIMIT = 6;

export interface WeekBounds {
  /** Monday 00:00 in the user's timezone, as a UTC instant. */
  start: Date;
  /** The following Monday 00:00 in the user's timezone, as a UTC instant. */
  end: Date;
}

/** Falls back to UTC when the stored timezone name is not one the runtime knows. */
function safeTimeZone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return timeZone;
  } catch {
    return 'UTC';
  }
}

/** Offset (zone time minus UTC) in milliseconds at the given instant. */
function offsetMs(instant: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
  }).formatToParts(instant);

  const get = (type: string): number => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), get('hour'), get('minute'), get('second'));
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000;
}

/** The UTC instant at which the wall clock in `timeZone` reads year-month-day 00:00. */
function zonedMidnightToUtc(year: number, monthIndex: number, day: number, timeZone: string): Date {
  const guess = Date.UTC(year, monthIndex, day);
  const first = guess - offsetMs(new Date(guess), timeZone);
  // The offset can differ at the corrected instant (a daylight saving change that day).
  const second = guess - offsetMs(new Date(first), timeZone);
  return new Date(second);
}

/**
 * Bounds of the Monday-to-Sunday week that contains `now`, in the user's timezone.
 * Handles daylight saving: a week can be 167 or 169 hours long.
 */
export function getWeekBounds(now: Date, timeZone: string): WeekBounds {
  const zone = safeTimeZone(timeZone);

  // Today's calendar date and weekday as seen in the user's timezone.
  const local = new Date(now.getTime() + offsetMs(now, zone));
  const daysSinceMonday = (local.getUTCDay() + 6) % 7;

  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const mondayDay = local.getUTCDate() - daysSinceMonday;

  return {
    start: zonedMidnightToUtc(year, month, mondayDay, zone),
    end: zonedMidnightToUtc(year, month, mondayDay + 7, zone),
  };
}
