import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Route guard (Next 16 "proxy", the replacement for middleware).
 *
 * It only checks that a session cookie exists, to avoid showing app pages to
 * visitors who are logged out. It does not prove the session is valid: the API
 * checks that on every request and the pages handle a 401 themselves.
 */
const PROTECTED_PREFIXES = ["/dashboard", "/session", "/onboarding"];
const GUEST_ONLY = ["/login", "/register"];

function startsWithAny(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function proxy(request: NextRequest): NextResponse {
  const { pathname, search } = request.nextUrl;
  const hasSession = Boolean(getSessionCookie(request, { cookiePrefix: "focusup" }));

  if (!hasSession && startsWithAny(pathname, PROTECTED_PREFIXES)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (hasSession && startsWithAny(pathname, GUEST_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/session/:path*", "/onboarding/:path*", "/login", "/register"],
};
