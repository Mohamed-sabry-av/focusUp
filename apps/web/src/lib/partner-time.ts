/** The time it is now in another person's time zone, like "8:15pm". Null for an unknown zone. */
export function localTimeIn(timezone: string, now: Date): string | null {
  try {
    return new Intl.DateTimeFormat("en-US", { timeZone: timezone, hour: "numeric", minute: "2-digit" })
      .format(now)
      .replace(/\s/g, "")
      .toLowerCase();
  } catch {
    return null;
  }
}

/** "Europe/Berlin · 8:15pm" (or just the zone when it cannot be read). */
export function partnerTimeLabel(timezone: string, now: Date): string {
  const time = localTimeIn(timezone, now);
  return time ? `${timezone} · ${time}` : timezone;
}
