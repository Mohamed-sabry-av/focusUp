export interface DayGroup<T> {
  /** Stable key for the day, in the viewer's time zone. */
  key: string;
  /** "Today, October 3", "Tomorrow, October 4" or "Monday, October 5". */
  label: string;
  items: T[];
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

/** Groups sessions (already in time order) by the viewer's calendar day. */
export function groupByDay<T extends { scheduledAt: string }>(items: readonly T[], now: Date): DayGroup<T>[] {
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const groups: DayGroup<T>[] = [];
  for (const item of items) {
    const date = new Date(item.scheduledAt);
    const key = date.toDateString();
    let group = groups.find((g) => g.key === key);
    if (!group) {
      const day = date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
      const prefix = sameDay(date, now)
        ? "Today"
        : sameDay(date, tomorrow)
          ? "Tomorrow"
          : date.toLocaleDateString("en-US", { weekday: "long" });
      group = { key, label: `${prefix}, ${day}`, items: [] };
      groups.push(group);
    }
    group.items.push(item);
  }
  return groups;
}
