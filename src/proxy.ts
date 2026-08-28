import { NextResponse, type NextRequest } from "next/server";

import { auth } from "@/lib/auth";
import { ROLE_HOME, WORKSPACE_ACCESS, ADMIN_ONLY_ROLES, PUBLIC_PATHS } from "@/modules/users/workspace-routes";
import type { Role } from "@/modules/users/roles";

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function roleHome(role: string): string {
  return ROLE_HOME[role as Role] ?? "/login";
}

/**
 * Next.js 16 renamed `middleware.ts` to `proxy.ts` (runs Node.js runtime by default here, so a
 * real DB-backed session check via `auth.api.getSession` is fine — no edge-runtime workaround
 * needed). This is the enforcement layer that was completely missing before: every page route
 * (not just API routes) now gets checked against the visitor's real role, not just whichever
 * page they happened to type or click into. Login's own redirect-by-role logic
 * (`login-form.tsx`) picks a sensible landing page, but nothing stopped someone from then
 * navigating to `/` (the admin area) or another workspace directly — this does.
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await auth.api.getSession({ headers: request.headers });
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (isPublicPath(pathname)) {
    // Logged-in users don't need the login/signup form again — send them home instead of showing it.
    if ((pathname === "/login" || pathname === "/signup") && role) {
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
    return NextResponse.next();
  }

  if (!session?.user || !role) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  const workspace = WORKSPACE_ACCESS.find((w) => pathname === w.prefix || pathname.startsWith(`${w.prefix}/`));
  if (workspace) {
    if (!workspace.roles.includes(role as Role)) {
      return NextResponse.redirect(new URL(roleHome(role), request.url));
    }
    // A self-registered ("Sign Up") company account starts with no companyId — Better Auth
    // never lets the client set it (src/lib/auth.ts). Force it through onboarding first so it
    // can't sit on an empty Company Workspace forever; ADMIN/SUPER_ADMIN browsing in for
    // support are never PERUSAHAAN, so they're unaffected.
    if (workspace.prefix === "/company-workspace" && role === "PERUSAHAAN") {
      const companyId = (session.user as { companyId?: string | null }).companyId;
      const isOnboardingPath = pathname === "/company-workspace/onboarding";
      if (!companyId && !isOnboardingPath) {
        return NextResponse.redirect(new URL("/company-workspace/onboarding", request.url));
      }
      if (companyId && isOnboardingPath) {
        return NextResponse.redirect(new URL("/company-workspace", request.url));
      }
    }
    return NextResponse.next();
  }

  // Not a known workspace path and not public — this is the admin area (`(dashboard)` route
  // group: "/", "/applications", "/company", "/system-configuration", "/user-management", ...).
  // Default-deny unless ADMIN/SUPER_ADMIN, rather than trying to enumerate every admin sub-path.
  if (!ADMIN_ONLY_ROLES.includes(role as Role)) {
    return NextResponse.redirect(new URL(roleHome(role), request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|css|js)$).*)"],
};
