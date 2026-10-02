const MAX_LENGTH = 30;
const MIN_LENGTH = 3;
const BASE_MAX = 24;

export type UsernameTaken = (username: string) => Promise<boolean>;

/** Turns the part of an email before the "@" into a valid username base. */
export function usernameBaseFromEmail(email: string): string {
  const at = email.indexOf("@");
  const localPart = at >= 0 ? email.slice(0, at) : email;
  const cleaned = localPart
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, BASE_MAX);
  return cleaned.length >= MIN_LENGTH ? cleaned : "user";
}

function randomSuffix(digits: number): string {
  const min = 10 ** (digits - 1);
  return Math.floor(min + Math.random() * 9 * min).toString();
}

/**
 * Picks a unique username for a new account. Tries the plain base first,
 * then base-1234 a few times, then a longer suffix. Matches the profile
 * rules (3-30 characters; letters, numbers, "_" and "-").
 */
export async function generateUniqueUsername(
  email: string,
  isTaken: UsernameTaken,
): Promise<string> {
  const base = usernameBaseFromEmail(email);

  if (!(await isTaken(base))) return base;

  for (let attempt = 0; attempt < 8; attempt++) {
    const candidate = `${base}-${randomSuffix(4)}`.slice(0, MAX_LENGTH);
    if (!(await isTaken(candidate))) return candidate;
  }

  const fallback = `${base}-${randomSuffix(8)}`.slice(0, MAX_LENGTH);
  if (!(await isTaken(fallback))) return fallback;

  throw new Error("Could not generate a unique username");
}
