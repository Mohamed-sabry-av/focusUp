import { describe, it, expect } from 'vitest';
import {
  isFarEnough,
  isFreeCancellation,
  isOnQuarterHour,
  isSupportedDuration,
  isWithinHorizon,
  shouldSuspend,
  strikeWindowStart,
  suspensionEnd,
} from './booking-rules';

const now = new Date('2026-10-05T10:00:00Z');
const plus = (minutes: number) => new Date(now.getTime() + minutes * 60_000);

describe('booking rules', () => {
  it('accepts only 25, 50 and 75 minute sessions', () => {
    expect([25, 50, 75].every(isSupportedDuration)).toBe(true);
    expect([0, 15, 30, 60, 90].some(isSupportedDuration)).toBe(false);
  });

  it('requires a quarter-hour start', () => {
    expect(isOnQuarterHour(new Date('2026-10-05T10:15:00Z'))).toBe(true);
    expect(isOnQuarterHour(new Date('2026-10-05T10:20:00Z'))).toBe(false);
    expect(isOnQuarterHour(new Date('2026-10-05T10:15:30Z'))).toBe(false);
  });

  it('needs more than 5 minutes of notice', () => {
    expect(isFarEnough(plus(5), now)).toBe(false);
    expect(isFarEnough(plus(6), now)).toBe(true);
  });

  it('allows booking up to 14 days ahead and no further', () => {
    expect(isWithinHorizon(plus(14 * 24 * 60), now)).toBe(true);
    expect(isWithinHorizon(plus(14 * 24 * 60 + 1), now)).toBe(false);
  });

  it('makes cancelling free at exactly one hour before, strike-worthy just inside', () => {
    expect(isFreeCancellation(plus(60), now)).toBe(true);
    expect(isFreeCancellation(plus(59), now)).toBe(false);
  });
});

describe('strike rules', () => {
  it('suspends at the 5th strike inside the window, not before', () => {
    expect(shouldSuspend(4)).toBe(false);
    expect(shouldSuspend(5)).toBe(true);
    expect(shouldSuspend(6)).toBe(true);
  });

  it('counts strikes from the last 30 days', () => {
    expect(strikeWindowStart(now).toISOString()).toBe('2026-09-05T10:00:00.000Z');
  });

  it('suspends for 3 days', () => {
    expect(suspensionEnd(now).toISOString()).toBe('2026-10-08T10:00:00.000Z');
  });
});
