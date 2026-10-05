import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/require-admin-session";
import { returnApplicationForRevision } from "@/modules/applications/return-for-revision";
import { returnRequestSchema } from "@/modules/applications/return-request";

/** "Kembalikan untuk Revisi" from the admin Application List / Detail (Admin, Super Admin). */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const parsed = returnRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const result = await returnApplicationForRevision({
    applicationId: id,
    source: "ADMIN",
    actor: { id: session.user.id, name: session.user.name, role: session.user.role },
    reason: parsed.data.reason,
    sections: parsed.data.sections,
  });
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ data: { status: "RETURNED" } });
}
