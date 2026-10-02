import { describe, expect, it } from 'vitest';

import { activeSuspensionEnd, bookingErrorMessage, BookingRequestError } from './booking-errors';
import { DEFAULT_BOOKING_OPTIONS, optionBadges, taskLabel } from './booking-options';
import { quotaLabel, strikeLabel } from './quota-text';

describe('booking options', () => {
  it('defaults to Anything, not Quiet, Prefer Favorites on', () => {
    expect(DEFAULT_BOOKING_OPTIONS).toEqual({ quiet: false, taskType: 'ANY', preferFavorites: true });
  });

  it('uses the Focusmate-style names', () => {
    expect(taskLabel('DESK')).toBe('Desk');
    expect(taskLabel('WALK')).toBe('Moving');
    expect(taskLabel('ANY')).toBe('Anything');
  });

  it('lists only real preferences as badges', () => {
    expect(optionBadges({ quiet: false, taskType: 'ANY' })).toEqual([]);
    expect(optionBadges({ quiet: true, taskType: 'ANY' })).toEqual(['Quiet mode']);
    expect(optionBadges({ quiet: true, taskType: 'WALK' })).toEqual(['Quiet mode', 'Moving']);
    expect(optionBadges({ quiet: false, taskType: 'DESK' })).toEqual(['Desk']);
  });
});

describe('bookingErrorMessage', () => {
  it('passes the API message through', () => {
    expect(bookingErrorMessage(new BookingRequestError('You can have at most 3 upcoming bookings at a time', 409))).toBe(
      'You can have at most 3 upcoming bookings at a time',
    );
  });

  it('shows the suspension end in a readable form, not as an ISO date', () => {
    const message = bookingErrorMessage(
      new BookingRequestError('Your account is suspended until 2026-10-08T12:00:00.000Z because of missed sessions', 403),
    );
    expect(message).toMatch(/^Your account is suspended until /);
    expect(message).not.toContain('2026-10-08T');
  });

  it('explains a network failure', () => {
    expect(bookingErrorMessage(new TypeError('Failed to fetch'))).toContain('Could not reach the server');
  });

  it('falls back to a generic message', () => {
    expect(bookingErrorMessage(undefined)).toBe('Could not book this session. Please try again.');
  });
});

describe('activeSuspensionEnd', () => {
  const now = new Date('2026-10-05T10:00:00Z');

  it('returns the end date while the suspension is running', () => {
    expect(activeSuspensionEnd('2026-10-07T10:00:00Z', now)?.toISOString()).toBe('2026-10-07T10:00:00.000Z');
  });

  it('returns null when there is none or it has ended', () => {
    expect(activeSuspensionEnd(null, now)).toBeNull();
    expect(activeSuspensionEnd(undefined, now)).toBeNull();
    expect(activeSuspensionEnd('2026-10-05T09:59:00Z', now)).toBeNull();
  });
});

describe('quota and strike text', () => {
  it('says there is no limit during the free beta and for paid plans', () => {
    expect(quotaLabel('FREE', { used: 4, limit: null })).toBe('Free beta · no weekly limit');
    expect(quotaLabel('PRO', { used: 9, limit: null })).toBe('Unlimited sessions');
  });

  it('shows usage once there is a limit', () => {
    expect(quotaLabel('FREE', { used: 4, limit: 6 })).toBe('Free plan · 4 of 6 sessions this week');
  });

  it('shows strikes only when there are some', () => {
    expect(strikeLabel(0)).toBeNull();
    expect(strikeLabel(2)).toBe('Strikes: 2 of 5 (last 30 days)');
  });
});
