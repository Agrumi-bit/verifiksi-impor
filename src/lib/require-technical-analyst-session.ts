import { NextResponse } from "next/server";

import { getServerSession, type SessionUser } from "./get-session";

export const TECHNICAL_ANALYST_ROLES = ["TECHNICAL_ANALYST", "ADMIN", "SUPER_ADMIN"];

type TechnicalAnalystSessionResult = { session: { user: SessionUser }; error: null } | { session: null; error: NextResponse };

export async function requireTechnicalAnalystSession(): Promise<TechnicalAnalystSessionResult> {
  const session = await getServerSession();
  if (!session?.user || !TECHNICAL_ANALYST_ROLES.includes(session.user.role ?? "")) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
