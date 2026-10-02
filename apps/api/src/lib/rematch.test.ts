import { describe, expect, it } from 'vitest';

import { lonelyUserId } from './rematch';

const at = new Date('2026-11-20T10:00:30Z');

describe('lonelyUserId', () => {
  it('finds the one person who is in the room alone', () => {
    expect(lonelyUserId([{ userId: 'a', firstJoinedAt: at, isPresent: true }])).toBe('a');
  });

  it('is null when nobody came', () => {
    expect(lonelyUserId([])).toBeNull();
  });

  it('is null when both people have been in the room', () => {
    expect(
      lonelyUserId([
        { userId: 'a', firstJoinedAt: at, isPresent: true },
        { userId: 'b', firstJoinedAt: at, isPresent: false },
      ]),
    ).toBeNull();
  });

  it('is null when the only person has already left', () => {
    expect(lonelyUserId([{ userId: 'a', firstJoinedAt: at, isPresent: false }])).toBeNull();
  });
});
