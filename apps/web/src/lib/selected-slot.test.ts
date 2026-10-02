import { describe, expect, it } from 'vitest';

import { buildSelectedSlot, summarizeOutcomes } from './selected-slot';

describe('buildSelectedSlot', () => {
  it('uses the start time and duration as a stable id', () => {
    const start = new Date(2026, 9, 5, 22, 45); // local time, 5 Oct 2026 10:45pm
    const slot = buildSelectedSlot(start, 75);
    expect(slot.id).toBe(`${start.toISOString()}-75`);
    expect(slot.slotTime).toBe(start.toISOString());
    expect(slot.durationMin).toBe(75);
  });

  it('formats the range in 12-hour time and crosses midnight correctly', () => {
    expect(buildSelectedSlot(new Date(2026, 9, 5, 22, 45), 75).timeRange).toBe('10:45pm - 12:00am');
    expect(buildSelectedSlot(new Date(2026, 9, 5, 9, 0), 50).timeRange).toBe('9:00am - 9:50am');
    expect(buildSelectedSlot(new Date(2026, 9, 5, 12, 15), 25).timeRange).toBe('12:15pm - 12:40pm');
  });

  it('names the day', () => {
    expect(buildSelectedSlot(new Date(2026, 9, 5, 9, 0), 25).dateLabel).toBe('Monday, October 5');
  });
});

describe('summarizeOutcomes', () => {
  it('says how many were booked and how many failed', () => {
    const matched = { kind: 'matched' as const, message: 'Matched with Layla' };
    const waiting = { kind: 'waiting' as const, message: 'Waiting' };
    const failed = { kind: 'failed' as const, message: 'Conflict' };
    expect(summarizeOutcomes([matched])).toBe('1 session booked!');
    expect(summarizeOutcomes([matched, waiting])).toBe('2 sessions booked!');
    expect(summarizeOutcomes([matched, waiting, failed])).toBe('2 booked, 1 failed');
    expect(summarizeOutcomes([failed])).toBe('Could not book this session');
    expect(summarizeOutcomes([failed, failed])).toBe('Could not book these 2 sessions');
  });
});
