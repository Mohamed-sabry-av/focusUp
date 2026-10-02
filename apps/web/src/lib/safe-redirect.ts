/**
 * Returns `target` only if it is a path inside this app ("/dashboard", "/session/abc?x=1").
 * Anything else (another site, "//evil.com", "/\\evil.com") falls back to `fallback`,
 * so a crafted `?next=` link cannot send someone to another site after login.
 */
export function safeRedirectPath(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target) return fallback;
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) {
    return fallback;
  }
  return target;
}
