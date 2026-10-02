export type TaskKind = 'DESK' | 'WALK';

/** The preferences that decide how well two bookings fit (camera, Quiet, Desk/Walk). */
export interface BookingPreferences {
  cameraOn: boolean;
  quiet: boolean;
  taskType: TaskKind;
}

export interface RankableBooking extends BookingPreferences {
  userId: string;
  createdAt: Date;
}

/**
 * Orders compatible waiting bookings from best to worst partner for `requester`:
 *   1. someone the requester has favorited
 *   2. same camera choice
 *   3. same Quiet choice
 *   4. same Desk/Walk type
 *   5. who has waited longest
 *
 * Preferences only order the candidates, they never remove one: two people who
 * differ on camera or Quiet can still be matched when nobody better is waiting.
 * Pure function, so the rules are easy to test.
 */
export function rankCandidates<T extends RankableBooking>(
  requester: BookingPreferences,
  candidates: readonly T[],
  favoriteIds: ReadonlySet<string>,
): T[] {
  const score = (c: T): number[] => [
    favoriteIds.has(c.userId) ? 0 : 1,
    c.cameraOn === requester.cameraOn ? 0 : 1,
    c.quiet === requester.quiet ? 0 : 1,
    c.taskType === requester.taskType ? 0 : 1,
  ];

  return [...candidates].sort((a, b) => {
    const sa = score(a);
    const sb = score(b);
    for (let i = 0; i < sa.length; i++) {
      const diff = (sa[i] as number) - (sb[i] as number);
      if (diff !== 0) return diff;
    }
    return a.createdAt.getTime() - b.createdAt.getTime();
  });
}
