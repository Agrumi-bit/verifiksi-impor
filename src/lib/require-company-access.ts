import { NextResponse } from "next/server";

import { getServerSession, type SessionUser } from "./get-session";
import { ADMIN_ROLES } from "./require-admin-session";

/**
 * Access to one company's own data from the application wizard: Admin/Super Admin for any
 * company, a PERUSAHAAN account only for the company it belongs to. Everyone else — and anyone
 * not signed in — is refused.
 */
export async function requireCompanyAccess(
  companyId: string,
): Promise<{ user: SessionUser; error: null } | { user: null; error: NextResponse }> {
  const session = await getServerSession();
  const user = session?.user;
  const role = user?.role ?? "";
  const allowed = Boolean(user) && (ADMIN_ROLES.includes(role) || (role === "PERUSAHAAN" && user?.companyId === companyId));
  if (!user || !allowed) {
    return { user: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user, error: null };
}
