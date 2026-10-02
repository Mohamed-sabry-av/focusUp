/** The room opens this long before the start (same rule as the server). */
export const JOIN_OPENS_BEFORE_MIN = 5;

const MINUTE = 60 * 1000;

export type JoinState = "later" | "open" | "ended";

/**
 * Whether a person can go into the session room now. The server enforces the same window when
 * it issues the video token; this only decides what the calendar shows.
 */
export function joinState(scheduledAt: Date | string, durationMin: number, now: Date): JoinState {
  const start = new Date(scheduledAt).getTime();
  if (now.getTime() >= start + durationMin * MINUTE) return "ended";
  if (now.getTime() >= start - JOIN_OPENS_BEFORE_MIN * MINUTE) return "open";
  return "later";
}

/** When the Join button appears, for the label under a session that is not open yet. */
export function joinOpensAt(scheduledAt: Date | string): Date {
  return new Date(new Date(scheduledAt).getTime() - JOIN_OPENS_BEFORE_MIN * MINUTE);
}
