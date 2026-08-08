import { NextResponse } from "next/server";

import { getServerSession, type SessionUser } from "./get-session";

export const CUSTOMER_RELATION_ROLES = ["CUSTOMER_RELATIONSHIP", "ADMIN", "SUPER_ADMIN"];

type CustomerRelationSessionResult =
  | { session: { user: SessionUser }; error: null }
  | { session: null; error: NextResponse };

export async function requireCustomerRelationSession(): Promise<CustomerRelationSessionResult> {
  const session = await getServerSession();
  if (!session?.user || !CUSTOMER_RELATION_ROLES.includes(session.user.role ?? "")) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session, error: null };
}
