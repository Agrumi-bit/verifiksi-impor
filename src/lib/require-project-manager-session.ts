import { NextResponse } from "next/server";

import { getServerSession, type SessionUser } from "./get-session";

export const PROJECT_MANAGER_ROLES = ["PROJECT_MANAGER", "ADMIN", "SUPER_ADMIN"];

type ProjectManagerSessionResult = { session: { user: SessionUser }; error: null } | { session: null; error: NextResponse };

export async function requireProjectManagerSession(): Promise<ProjectManagerSessionResult> {
  const session = await getServerSession();
  if (!session?.user || !PROJECT_MANAGER_ROLES.includes(session.user.role ?? "")) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
