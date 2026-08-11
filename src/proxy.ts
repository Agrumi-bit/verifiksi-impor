import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

export function proxy(request: NextRequest) {
  const sessionCookie = getSessionCookie(request);

  if (!sessionCookie) {
    if (request.nextUrl.pathname.startsWith("/api")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // api/system-audit is a temporary, secret-header-gated diagnostic/backfill
  // route family — excluded here only because it has no session to present.
  // Remove this exclusion together with the route once it's done.
  matcher: ["/((?!login|api/auth|api/system-audit|_next/static|_next/image|favicon.ico).*)"],
};
