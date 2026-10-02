import { describe, expect, it } from 'vitest';

import { clockLabel, dayLabel } from './session-format';

describe('clockLabel', () => {
  it('writes the time in lower case without a space', () => {
    expect(clockLabel(new Date(2026, 9, 3, 2, 30))).toBe('2:30am');
    expect(clockLabel(new Date(2026, 9, 3, 15, 5))).toBe('3:05pm');
    expect(clockLabel(new Date(2026, 9, 3, 0, 0))).toBe('12:00am');
  });
});

describe('dayLabel', () => {
  it('writes the weekday, the short month and the day with its ending', () => {
    expect(dayLabel(new Date(2026, 9, 3))).toBe('Saturday, Oct 3rd');
    expect(dayLabel(new Date(2026, 9, 1))).toBe('Thursday, Oct 1st');
    expect(dayLabel(new Date(2026, 9, 22))).toBe('Thursday, Oct 22nd');
    expect(dayLabel(new Date(2026, 9, 11))).toBe('Sunday, Oct 11th');
  });
});
