export interface QuotaSummary {
  /** Sessions used this week. */
  used: number;
  /** The weekly limit, or null when there is none (free beta, or a paid plan). */
  limit: number | null;
}

/** The plan line in the profile panel. */
export function quotaLabel(planTier: string, quota: QuotaSummary): string {
  if (planTier !== "FREE") return "Unlimited sessions";
  if (quota.limit === null) return "Free beta · no weekly limit";
  return `Free plan · ${quota.used} of ${quota.limit} sessions this week`;
}

/** "Strikes: 2 of 5 (last 30 days)", or null when there is nothing to show. */
export function strikeLabel(strikesInLast30Days: number): string | null {
  if (strikesInLast30Days <= 0) return null;
  return `Strikes: ${strikesInLast30Days} of 5 (last 30 days)`;
}
