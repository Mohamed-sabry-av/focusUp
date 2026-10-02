/**
 * How a partner's name is shown to the other person: first name and the first letter of the
 * last name ("Danielle Hart" becomes "Danielle H."). One word stays as it is. The full name,
 * username and e-mail of a partner never leave the server.
 */
export function shortName(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  const [first, ...rest] = parts;
  if (!first) return 'Partner';
  const last = rest[rest.length - 1];
  const initial = last ? Array.from(last)[0] : undefined;
  return initial ? `${first} ${initial.toUpperCase()}.` : first;
}
