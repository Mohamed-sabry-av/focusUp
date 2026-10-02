import { FREE_CANCEL_HOURS, isFreeCancellation } from "@focusUp/shared-types";

export interface CancelCopy {
  /** True when cancelling now costs nothing. */
  free: boolean;
  title: string;
  body: string;
  confirmLabel: string;
}

/**
 * What the cancel confirmation says. It uses the same rule as the server (shared-types), so the
 * warning about a strike is shown exactly when a strike would be given.
 */
export function cancelCopy(slot: Date | string, now: Date, partnerName?: string | null): CancelCopy {
  const free = isFreeCancellation(slot, now);
  const who = partnerName ? `${partnerName} will be matched with someone else.` : "Your partner will be matched with someone else.";

  if (free) {
    return {
      free,
      title: "Cancel this session?",
      body: `This session is more than ${FREE_CANCEL_HOURS} hour away, so cancelling is free. ${who}`,
      confirmLabel: "Cancel session",
    };
  }
  return {
    free,
    title: "Cancel this session late?",
    body: `This session starts in less than ${FREE_CANCEL_HOURS} hour. Cancelling now counts as a late cancellation and adds a strike to your account (5 strikes in 30 days pause booking for 3 days). ${who}`,
    confirmLabel: "Cancel and take the strike",
  };
}
