/** "2:30am" in the viewer's time zone. */
export function clockLabel(date: Date): string {
  return date
    .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    .replace(/\s/g, "")
    .toLowerCase();
}

function ordinal(day: number): string {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

/** "Saturday, Oct 3rd" in the viewer's time zone. */
export function dayLabel(date: Date): string {
  const weekday = date.toLocaleDateString("en-US", { weekday: "long" });
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${weekday}, ${month} ${ordinal(date.getDate())}`;
}
