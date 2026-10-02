/** One row of who has been in the room (from LiveKit webhooks). */
export interface PresenceRow {
  userId: string;
  firstJoinedAt: Date | null;
  isPresent: boolean;
}

/**
 * The one person who is alone in a session: they are in the room and their partner has
 * never been seen. Null when nobody came, both came, or the person already left.
 */
export function lonelyUserId(participants: readonly PresenceRow[]): string | null {
  const joined = participants.filter((p) => p.firstJoinedAt !== null);
  const [only] = joined;
  if (joined.length !== 1 || !only || !only.isPresent) return null;
  return only.userId;
}
