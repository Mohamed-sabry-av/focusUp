import { describe, expect, it } from 'vitest';

import { joinOpensAt, joinState } from './session-join';

const start = new Date('2026-11-20T10:00:00Z');
const at = (minutesFromStart: number) => new Date(start.getTime() + minutesFromStart * 60_000);

describe('joinState', () => {
  it('is "later" until 5 minutes before the start', () => {
    expect(joinState(start, 50, at(-60))).toBe('later');
    expect(joinState(start, 50, at(-5.1))).toBe('later');
  });

  it('is "open" from 5 minutes before the start until the session ends, including after it began', () => {
    expect(joinState(start, 50, at(-5))).toBe('open');
    expect(joinState(start, 50, at(0))).toBe('open');
    expect(joinState(start, 50, at(30))).toBe('open');
    expect(joinState(start, 50, at(49.9))).toBe('open');
  });

  it('is "ended" once the booked time is over', () => {
    expect(joinState(start, 50, at(50))).toBe('ended');
    expect(joinState(start.toISOString(), 25, at(26))).toBe('ended');
  });
});

describe('joinOpensAt', () => {
  it('is 5 minutes before the start', () => {
    expect(joinOpensAt(start).toISOString()).toBe('2026-11-20T09:55:00.000Z');
  });
});
