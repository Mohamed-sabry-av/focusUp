import { describe, expect, it } from 'vitest';

import {
  computePhase,
  joinOpensAt,
  nextExtension,
  personalEnd,
  sessionEnd,
  type PhaseInput,
} from './session-phase';

const scheduledAt = new Date('2026-11-20T10:00:00Z');

function input(overrides: Partial<PhaseInput> & { minutesFromStart: number }): PhaseInput {
  const { minutesFromStart, ...rest } = overrides;
  return {
    status: 'CONFIRMED',
    isSolo: false,
    scheduledAt,
    durationMin: 50,
    now: new Date(scheduledAt.getTime() + minutesFromStart * 60_000),
    partnerHasJoined: false,
    extendedUntil: null,
    ...rest,
  };
}

describe('computePhase', () => {
  it('is UPCOMING until the room opens 5 minutes early, then LOBBY until the start', () => {
    expect(computePhase(input({ minutesFromStart: -30 }))).toBe('UPCOMING');
    expect(computePhase(input({ minutesFromStart: -5 }))).toBe('LOBBY');
    expect(computePhase(input({ minutesFromStart: -0.5 }))).toBe('LOBBY');
  });

  it('walks through waiting, re-match, solo offer and absent when the partner never comes', () => {
    expect(computePhase(input({ minutesFromStart: 0 }))).toBe('WAITING_FOR_PARTNER');
    expect(computePhase(input({ minutesFromStart: 0.9 }))).toBe('WAITING_FOR_PARTNER');
    expect(computePhase(input({ minutesFromStart: 1 }))).toBe('FINDING_REMATCH');
    expect(computePhase(input({ minutesFromStart: 3 }))).toBe('SOLO_OFFER');
    expect(computePhase(input({ minutesFromStart: 5 }))).toBe('PARTNER_ABSENT');
  });

  it('is IN_SESSION once the partner has joined, the session is active, or it is solo', () => {
    expect(computePhase(input({ minutesFromStart: 2, partnerHasJoined: true }))).toBe('IN_SESSION');
    expect(computePhase(input({ minutesFromStart: 2, status: 'ACTIVE' }))).toBe('IN_SESSION');
    expect(computePhase(input({ minutesFromStart: 4, isSolo: true }))).toBe('IN_SESSION');
  });

  it('moves to CHECK_OUT at the end of the booked time', () => {
    expect(computePhase(input({ minutesFromStart: 49, status: 'ACTIVE' }))).toBe('IN_SESSION');
    expect(computePhase(input({ minutesFromStart: 50, status: 'ACTIVE' }))).toBe('CHECK_OUT');
  });

  it('is ENDED for finished sessions', () => {
    expect(computePhase(input({ minutesFromStart: 20, status: 'COMPLETED' }))).toBe('ENDED');
    expect(computePhase(input({ minutesFromStart: 20, status: 'NO_SHOW' }))).toBe('ENDED');
    expect(computePhase(input({ minutesFromStart: -20, status: 'CANCELLED' }))).toBe('ENDED');
  });

  it('is EXTENDED for the person who kept going, even when the session is completed', () => {
    const extendedUntil = new Date(scheduledAt.getTime() + 65 * 60_000);
    expect(computePhase(input({ minutesFromStart: 55, status: 'ACTIVE', extendedUntil }))).toBe('EXTENDED');
    expect(computePhase(input({ minutesFromStart: 55, status: 'COMPLETED', extendedUntil }))).toBe('EXTENDED');
    expect(computePhase(input({ minutesFromStart: 66, status: 'COMPLETED', extendedUntil }))).toBe('ENDED');
  });
});

describe('times', () => {
  it('opens the room 5 minutes before the start', () => {
    expect(joinOpensAt(scheduledAt).toISOString()).toBe('2026-11-20T09:55:00.000Z');
  });

  it('ends at start plus duration', () => {
    expect(sessionEnd(scheduledAt, 50).toISOString()).toBe('2026-11-20T10:50:00.000Z');
  });

  it('uses the extension as the personal end only when it is later', () => {
    const later = new Date('2026-11-20T11:05:00Z');
    expect(personalEnd(scheduledAt, 50, later)).toEqual(later);
    expect(personalEnd(scheduledAt, 50, new Date('2026-11-20T10:30:00Z')).toISOString()).toBe(
      '2026-11-20T10:50:00.000Z',
    );
    expect(personalEnd(scheduledAt, 50, null).toISOString()).toBe('2026-11-20T10:50:00.000Z');
  });
});

describe('nextExtension', () => {
  it('adds 15 minutes to the booked end, then to the previous extension, twice at most', () => {
    const first = nextExtension({ scheduledAt, durationMin: 50, extendedUntil: null, extensionCount: 0 });
    expect(first?.toISOString()).toBe('2026-11-20T11:05:00.000Z');

    const second = nextExtension({ scheduledAt, durationMin: 50, extendedUntil: first, extensionCount: 1 });
    expect(second?.toISOString()).toBe('2026-11-20T11:20:00.000Z');

    expect(nextExtension({ scheduledAt, durationMin: 50, extendedUntil: second, extensionCount: 2 })).toBeNull();
  });
});
