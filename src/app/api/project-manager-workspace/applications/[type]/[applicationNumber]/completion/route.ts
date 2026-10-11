import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { cancelApplicationCompletion } from "@/modules/project-manager-workspace/lhviu-completion";

const deleteSchema = z.object({
  reason: z.string().trim().min(5, "Alasan pembatalan minimal 5 karakter").max(1000),
});

/** "Batalkan Completed" — reverts a completed application so the remaining reports can be reviewed. */
export async function DELETE(request: Request, { params }: { params: Promise<{ type: string; applicationNumber: string }> }) {
  const { session, error } = await requireProjectManagerSession();
  if (error) return error;
  const { applicationNumber } = await params;
  const application = await db.application.findUnique({ where: { applicationNumber }, select: { id: true } });
  if (!application) return NextResponse.json({ error: "Aplikasi tidak ditemukan" }, { status: 404 });

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  const result = await cancelApplicationCompletion(application.id, session.user, parsed.data.reason);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ data: { status: result.status } });
}
