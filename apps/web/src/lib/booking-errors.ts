/** An error from the bookings API, with the HTTP status so the screen can react to it. */
export class BookingRequestError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "BookingRequestError";
    this.statusCode = statusCode;
  }
}

const SUSPENDED_PATTERN = /suspended until (\d{4}-\d{2}-\d{2}T[\d:.]+Z)/;

/** Formats an ISO date for people, in their own timezone ("Oct 8, 3:00 PM"). */
export function formatDateTime(iso: string, locale = "en-US"): string {
  return new Date(iso).toLocaleString(locale, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Turns an API error message into something to show next to a slot. The API messages
 * are already plain English; the one thing the browser adds is the suspension end
 * time in the person's own timezone instead of a raw ISO date.
 */
export function bookingErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "";
  if (!message) return "Could not book this session. Please try again.";

  const suspended = SUSPENDED_PATTERN.exec(message);
  if (suspended?.[1]) {
    return `Your account is suspended until ${formatDateTime(suspended[1])}.`;
  }

  if (error instanceof TypeError) {
    return "Could not reach the server. Check your connection and try again.";
  }
  return message;
}

/** The end of an active suspension, or null when the user can book. */
export function activeSuspensionEnd(suspendedUntil: string | null | undefined, now: Date = new Date()): Date | null {
  if (!suspendedUntil) return null;
  const end = new Date(suspendedUntil);
  return end.getTime() > now.getTime() ? end : null;
}
