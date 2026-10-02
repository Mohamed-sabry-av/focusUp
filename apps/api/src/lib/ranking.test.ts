import { describe, it, expect } from 'vitest';
import { rankCandidates, type RankableBooking } from './ranking';

const base = new Date('2026-10-05T10:00:00Z');
let n = 0;

function booking(over: Partial<RankableBooking> & { userId: string }): RankableBooking {
  n += 1;
  return {
    cameraOn: true,
    quiet: false,
    taskType: 'DESK',
    createdAt: new Date(base.getTime() + n * 1000),
    ...over,
  };
}

const me = { cameraOn: true, quiet: false, taskType: 'DESK' as const };
const ids = (list: RankableBooking[]) => list.map((c) => c.userId);

describe('rankCandidates', () => {
  it('puts favorites first, even if they fit worse and booked later', () => {
    const stranger = booking({ userId: 'stranger' });
    const favorite = booking({ userId: 'favorite', cameraOn: false, quiet: true, taskType: 'WALK' });
    expect(ids(rankCandidates(me, [stranger, favorite], new Set(['favorite'])))).toEqual([
      'favorite',
      'stranger',
    ]);
  });

  it('prefers the same camera choice over everything except favorites', () => {
    const sameCameraButQuiet = booking({ userId: 'a', quiet: true, taskType: 'WALK' });
    const otherCameraPerfectOtherwise = booking({ userId: 'b', cameraOn: false });
    expect(ids(rankCandidates(me, [otherCameraPerfectOtherwise, sameCameraButQuiet], new Set()))).toEqual([
      'a',
      'b',
    ]);
  });

  it('then prefers the same Quiet choice', () => {
    const loud = booking({ userId: 'loud' });
    const quiet = booking({ userId: 'quiet', quiet: true });
    expect(ids(rankCandidates(me, [quiet, loud], new Set()))).toEqual(['loud', 'quiet']);
    expect(ids(rankCandidates({ ...me, quiet: true }, [loud, quiet], new Set()))).toEqual(['quiet', 'loud']);
  });

  it('then prefers the same Desk/Walk type', () => {
    const walk = booking({ userId: 'walk', taskType: 'WALK' });
    const desk = booking({ userId: 'desk' });
    expect(ids(rankCandidates(me, [walk, desk], new Set()))).toEqual(['desk', 'walk']);
  });

  it('breaks ties by who has waited longest', () => {
    const first = booking({ userId: 'first' });
    const second = booking({ userId: 'second' });
    expect(ids(rankCandidates(me, [second, first], new Set()))).toEqual(['first', 'second']);
  });

  it('still returns people who differ on every preference (nothing is filtered out)', () => {
    const opposite = booking({ userId: 'opposite', cameraOn: false, quiet: true, taskType: 'WALK' });
    expect(ids(rankCandidates(me, [opposite], new Set()))).toEqual(['opposite']);
  });

  it('does not change the input array', () => {
    const list = [booking({ userId: 'x', cameraOn: false }), booking({ userId: 'y' })];
    const copy = [...list];
    rankCandidates(me, list, new Set());
    expect(list).toEqual(copy);
  });
});
