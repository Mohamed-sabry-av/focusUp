import { describe, expect, it } from 'vitest';

import { cancelCopy } from './cancel-text';
import { localTimeIn, partnerTimeLabel } from './partner-time';
import { groupByDay } from './session-groups';

const now = new Date(2026, 9, 3, 10, 0); // Sat 3 Oct 2026, 10:00 local

describe('cancelCopy', () => {
  it('says cancelling is free when the session is at least an hour away', () => {
    const copy = cancelCopy(new Date(2026, 9, 3, 11, 0), now, 'Danielle H.');
    expect(copy.free).toBe(true);
    expect(copy.body).toContain('free');
    expect(copy.body).toContain('Danielle H. will be matched with someone else');
    expect(copy.body).not.toContain('strike');
  });

  it('warns about a strike when it is less than an hour away', () => {
    const copy = cancelCopy(new Date(2026, 9, 3, 10, 59), now);
    expect(copy.free).toBe(false);
    expect(copy.body).toContain('late cancellation');
    expect(copy.body).toContain('strike');
    expect(copy.confirmLabel).toContain('strike');
  });
});

describe('partner time', () => {
  it('shows the other person\'s local time', () => {
    const utcNoon = new Date('2026-10-03T12:00:00Z');
    expect(localTimeIn('Europe/Berlin', utcNoon)).toBe('2:00pm');
    expect(partnerTimeLabel('America/New_York', utcNoon)).toBe('America/New_York · 8:00am');
  });

  it('falls back to the zone name when it is not a real zone', () => {
    expect(localTimeIn('Not/AZone', now)).toBeNull();
    expect(partnerTimeLabel('Not/AZone', now)).toBe('Not/AZone');
  });
});

describe('groupByDay', () => {
  const at = (day: number, hour: number) => ({ scheduledAt: new Date(2026, 9, day, hour, 0).toISOString() });

  it('labels today, tomorrow and later days, keeping time order', () => {
    const groups = groupByDay([at(3, 11), at(3, 14), at(4, 9), at(6, 9)], now);
    expect(groups.map((g) => g.label)).toEqual([
      'Today, October 3',
      'Tomorrow, October 4',
      'Tuesday, October 6',
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1, 1]);
  });

  it('returns nothing for no sessions', () => {
    expect(groupByDay([], now)).toEqual([]);
  });
});
