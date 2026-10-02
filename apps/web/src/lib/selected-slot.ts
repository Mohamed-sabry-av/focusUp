/** A time the person picked on the calendar and has not booked yet. */
export interface SelectedSlot {
  id: string;
  dateLabel: string;
  timeRange: string;
  durationMin: number;
  slotTime: string;
}

/** What happened to a slot when the person pressed Book. Shown next to the slot. */
export interface SlotOutcome {
  kind: "matched" | "waiting" | "failed";
  message: string;
}

export function summarizeOutcomes(outcomes: ReadonlyArray<SlotOutcome>): string {
  const booked = outcomes.filter((o) => o.kind !== "failed").length;
  const failed = outcomes.length - booked;
  if (failed === 0) return `${booked} session${booked !== 1 ? "s" : ""} booked!`;
  if (booked === 0) return `Could not book ${failed === 1 ? "this session" : `these ${failed} sessions`}`;
  return `${booked} booked, ${failed} failed`;
}

function formatClock(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  return `${hour12}:${minutes}${suffix}`;
}

/** Builds the slot object for a start time and duration, in the browser's timezone. */
export function buildSelectedSlot(start: Date, durationMin: number): SelectedSlot {
  const end = new Date(start.getTime() + durationMin * 60_000);
  return {
    id: `${start.toISOString()}-${durationMin}`,
    dateLabel: start.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }),
    timeRange: `${formatClock(start)} - ${formatClock(end)}`,
    durationMin,
    slotTime: start.toISOString(),
  };
}
