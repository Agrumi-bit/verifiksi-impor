import type { Role } from "./roles";

/**
 * Single source of truth for "which URL does this role belong to" — shared by `src/proxy.ts`
 * (enforcement: redirects wrong-role visitors away) and `login-form.tsx` (where to send a user
 * right after signing in). Keeping one shared map is what prevents the two from drifting apart,
 * which is exactly how a role like PROJECT_MANAGER previously fell through to the admin area:
 * the login redirect map didn't know about it and neither did any enforcement layer.
 */
export const ROLE_HOME: Record<Role, string> = {
  SUPER_ADMIN: "/",
  ADMIN: "/",
  SURVEYOR: "/surveyor-workspace",
  VERIFIKATOR: "/verifikator-workspace",
  TECHNICAL_ANALYST: "/technical-analyst-workspace",
  PROJECT_MANAGER: "/project-manager-workspace",
  PERUSAHAAN: "/company-workspace",
  CUSTOMER_RELATIONSHIP: "/customer-relation-workspace",
  // No workspace has been built for these roles yet — not fabricated, sent to an honest
  // "belum ada workspace" holding page instead of silently falling into the admin area.
  COMPLIANCE: "/no-workspace",
  GOVERNMENT: "/no-workspace",
};

/** Roles allowed into each workspace path prefix. ADMIN/SUPER_ADMIN can always reach every workspace (support/impersonation), same as every `require-*-session.ts` API guard already does. */
export const WORKSPACE_ACCESS: { prefix: string; roles: Role[] }[] = [
  { prefix: "/surveyor-workspace", roles: ["SURVEYOR", "ADMIN", "SUPER_ADMIN"] },
  { prefix: "/verifikator-workspace", roles: ["VERIFIKATOR", "ADMIN", "SUPER_ADMIN"] },
  { prefix: "/technical-analyst-workspace", roles: ["TECHNICAL_ANALYST", "ADMIN", "SUPER_ADMIN"] },
  { prefix: "/project-manager-workspace", roles: ["PROJECT_MANAGER", "ADMIN", "SUPER_ADMIN"] },
  { prefix: "/company-workspace", roles: ["PERUSAHAAN", "ADMIN", "SUPER_ADMIN"] },
  { prefix: "/customer-relation-workspace", roles: ["CUSTOMER_RELATIONSHIP", "ADMIN", "SUPER_ADMIN"] },
];

/** Anything not matched by WORKSPACE_ACCESS and not in PUBLIC_PATHS falls here — the `(dashboard)` admin area (root "/", /applications, /company, /system-configuration, /user-management, ...). Default-deny keeps this safe without having to enumerate every admin sub-path. */
export const ADMIN_ONLY_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

/** Reachable by any authenticated role, no workspace match required. */
export const PUBLIC_PATHS = ["/login", "/signup", "/no-workspace"];
