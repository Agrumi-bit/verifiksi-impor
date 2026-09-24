import { NextResponse } from "next/server";

import { getServerSession, type SessionUser } from "./get-session";

export const ADMIN_ROLES = ["SUPER_ADMIN", "ADMIN"];

type AdminSessionResult =
  | { session: { user: SessionUser }; error: null }
  | { session: null; error: NextResponse };

export async function requireAdminSession(): Promise<AdminSessionResult> {
  const session = await getServerSession();
  if (!session?.user || !ADMIN_ROLES.includes(session.user.role ?? "")) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
