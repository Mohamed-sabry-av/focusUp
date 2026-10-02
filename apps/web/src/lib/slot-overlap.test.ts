import { describe, expect, it } from 'vitest';

import { isSlotBlocked, isTooSoon, overlaps } from './slot-overlap';

const at = (hhmm: string) => new Date(`2026-11-20T${hhmm}:00Z`);

describe('overlaps', () => {
  it('is true when the new session starts inside an existing one', () => {
    expect(overlaps(at('01:55'), 25, at('01:50'), 10)).toBe(true);
  });

  it('is true when the new session would run into an existing one that starts later', () => {
    expect(overlaps(at('01:15'), 50, at('01:30'), 50)).toBe(true);
  });

  it('is true when one contains the other', () => {
    expect(overlaps(at('01:00'), 75, at('01:15'), 25)).toBe(true);
  });

  it('is false when they only touch (back to back)', () => {
    expect(overlaps(at('02:00'), 25, at('01:50'), 10)).toBe(false);
    expect(overlaps(at('01:25'), 25, at('01:50'), 10)).toBe(false);
  });

  it('is false when they are apart', () => {
    expect(overlaps(at('05:00'), 50, at('01:50'), 50)).toBe(false);
  });
});

describe('isSlotBlocked', () => {
  const busy = [
    { start: at('01:50'), durationMin: 10 },
    { start: '2026-11-20T04:00:00Z', durationMin: 50 },
  ];

  it('blocks a slot that overlaps any busy time', () => {
    expect(isSlotBlocked(at('01:55'), 25, busy)).toBe(true);
    expect(isSlotBlocked(at('03:30'), 50, busy)).toBe(true);
  });

  it('allows a free slot, and one that starts right when another ends', () => {
    expect(isSlotBlocked(at('02:00'), 25, busy)).toBe(false);
    expect(isSlotBlocked(at('02:15'), 25, [])).toBe(false);
  });
});

describe('isTooSoon', () => {
  const now = at('10:00');

  it('refuses a start less than 5 minutes ahead, or in the past', () => {
    expect(isTooSoon(at('09:30'), now)).toBe(true);
    expect(isTooSoon(at('10:04'), now)).toBe(true);
  });

  it('allows 5 minutes ahead or more', () => {
    expect(isTooSoon(at('10:05'), now)).toBe(false);
    expect(isTooSoon(at('11:00'), now)).toBe(false);
  });
});
