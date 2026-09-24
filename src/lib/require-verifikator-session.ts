import { NextResponse } from "next/server";

import { getServerSession, type SessionUser } from "./get-session";

export const VERIFIKATOR_ROLES = ["VERIFIKATOR", "ADMIN", "SUPER_ADMIN"];

type VerifikatorSessionResult = { session: { user: SessionUser }; error: null } | { session: null; error: NextResponse };

export async function requireVerifikatorSession(): Promise<VerifikatorSessionResult> {
  const session = await getServerSession();
  if (!session?.user || !VERIFIKATOR_ROLES.includes(session.user.role ?? "")) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
