import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";

const ALLOWED_ROLES = ["SURVEYOR", "VERIFIKATOR", "TECHNICAL_ANALYST"];

export async function GET(request: Request) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const people = await db.user.findMany({
    where: {
      role: role && ALLOWED_ROLES.includes(role) ? role : { in: ALLOWED_ROLES },
      banned: { not: true },
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ data: people });
}
