import { NextResponse } from "next/server";

import { getServerSession, type SessionUser } from "./get-session";

export type RoleSessionResult =
  | { session: { user: SessionUser }; error: null }
  | { session: null; error: NextResponse };

/**
 * Shared implementation behind every `require-*-session.ts` role guard. Unauthenticated and
 * wrong-role both return the same 403 "Forbidden" — matches the original per-role guards this
 * factory replaces, so callers see no behavior change.
 */
export function requireSessionWithRole(allowedRoles: readonly string[]): () => Promise<RoleSessionResult> {
  return async function requireSession() {
    const session = await getServerSession();
    if (!session?.user || !allowedRoles.includes(session.user.role ?? "")) {
      return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
    }
    return { session, error: null };
  };
}
