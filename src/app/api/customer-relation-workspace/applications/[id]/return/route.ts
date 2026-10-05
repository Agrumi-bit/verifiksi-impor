import { NextResponse } from "next/server";

import { ADMIN_ROLES } from "@/lib/require-admin-session";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";
import { returnApplicationForRevision } from "@/modules/applications/return-for-revision";
import { returnRequestSchema } from "@/modules/applications/return-request";

/** "Kembalikan untuk Revisi" from the Customer Relation Workspace (CR, or Admin/Super Admin
 * browsing it — also while impersonating a CR user, whose own role is then what's checked). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireCustomerRelationSession();
  if (error) return error;

  const parsed = returnRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const role = session.user.role ?? "";
  const result = await returnApplicationForRevision({
    applicationId: id,
    // An Admin using the CR workspace is still recorded (and messaged) as Admin.
    source: ADMIN_ROLES.includes(role) ? "ADMIN" : "CUSTOMER_RELATIONSHIP",
    fromCrWorkspace: true,
    actor: { id: session.user.id, name: session.user.name, role },
    reason: parsed.data.reason,
    sections: parsed.data.sections,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: { status: "RETURNED" } });
}
