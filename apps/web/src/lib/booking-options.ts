export type TaskType = "DESK" | "WALK" | "ANY";

/** What the person chooses in the booking sidebar. The camera is chosen when joining, not here. */
export interface BookingOptions {
  quiet: boolean;
  taskType: TaskType;
  preferFavorites: boolean;
}

export const DEFAULT_BOOKING_OPTIONS: BookingOptions = {
  quiet: false,
  taskType: "ANY",
  preferFavorites: true,
};

export const TASK_OPTIONS: ReadonlyArray<{ id: TaskType; label: string }> = [
  { id: "DESK", label: "Desk" },
  { id: "WALK", label: "Moving" },
  { id: "ANY", label: "Anything" },
];

export const SESSION_DURATIONS = [25, 50, 75] as const;

export function taskLabel(taskType: TaskType): string {
  return TASK_OPTIONS.find((t) => t.id === taskType)?.label ?? "Anything";
}

/**
 * Short labels shown on a waiting person's card. "Anything" is the default and says
 * nothing useful, so only a real preference is listed.
 */
export function optionBadges(booking: { quiet: boolean; taskType: TaskType }): string[] {
  const badges: string[] = [];
  if (booking.quiet) badges.push("Quiet mode");
  if (booking.taskType !== "ANY") badges.push(taskLabel(booking.taskType));
  return badges;
}
