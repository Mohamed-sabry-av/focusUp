import { describe, it, expect } from 'vitest';
import { getWeekBounds } from './quota';

const hours = (from: Date, to: Date) => (to.getTime() - from.getTime()) / 3_600_000;

describe('getWeekBounds', () => {
  it('uses Monday 00:00 UTC to Monday 00:00 UTC for UTC users', () => {
    // Wednesday 2026-10-07
    const { start, end } = getWeekBounds(new Date('2026-10-07T15:30:00Z'), 'UTC');
    expect(start.toISOString()).toBe('2026-10-05T00:00:00.000Z');
    expect(end.toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });

  it('treats Sunday as the last day of the week, not the first', () => {
    // Sunday 2026-10-11 23:59 UTC still belongs to the week that began Monday 5 Oct
    const { start } = getWeekBounds(new Date('2026-10-11T23:59:00Z'), 'UTC');
    expect(start.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });

  it('starts a new week at Monday 00:00 exactly', () => {
    const { start } = getWeekBounds(new Date('2026-10-12T00:00:00Z'), 'UTC');
    expect(start.toISOString()).toBe('2026-10-12T00:00:00.000Z');
  });

  it('uses the local week for people east of UTC (Africa/Cairo, UTC+3 in October)', () => {
    // Sunday 22:30 UTC is already Monday 01:30 in Cairo: a new week there
    const { start, end } = getWeekBounds(new Date('2026-10-11T22:30:00Z'), 'Africa/Cairo');
    expect(start.toISOString()).toBe('2026-10-11T21:00:00.000Z'); // Mon 12 Oct 00:00 Cairo
    expect(end.toISOString()).toBe('2026-10-18T21:00:00.000Z');
  });

  it('uses the local week for people west of UTC (America/New_York)', () => {
    // Monday 02:00 UTC is still Sunday 22:00 in New York: previous week there
    const { start } = getWeekBounds(new Date('2026-10-12T02:00:00Z'), 'America/New_York');
    expect(start.toISOString()).toBe('2026-10-05T04:00:00.000Z'); // Mon 5 Oct 00:00 EDT
  });

  it('is 167 hours long when daylight saving starts that week (New York, Sunday 8 Mar 2026)', () => {
    const { start, end } = getWeekBounds(new Date('2026-03-04T12:00:00Z'), 'America/New_York');
    expect(hours(start, end)).toBe(167);
  });

  it('is 169 hours long when daylight saving ends that week (New York, Sunday 1 Nov 2026)', () => {
    const { start, end } = getWeekBounds(new Date('2026-10-28T12:00:00Z'), 'America/New_York');
    expect(hours(start, end)).toBe(169);
  });

  it('falls back to UTC for an unknown timezone name', () => {
    const { start } = getWeekBounds(new Date('2026-10-07T15:30:00Z'), 'Not/AZone');
    expect(start.toISOString()).toBe('2026-10-05T00:00:00.000Z');
  });
});
