import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/require-admin-session";
import { deleteApplicationCompletely, previewApplicationDeletion } from "@/modules/applications/server/delete-application";

/** What deleting this application would remove — drives the confirmation dialog's list. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const summary = await previewApplicationDeletion(id);
  if (!summary) return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  return NextResponse.json({ data: summary });
}

/**
 * Permanent delete of a dummy/duplicate application (Admin, Super Admin only). The caller must
 * echo back the exact application number, so a mistyped or stale id can't wipe the wrong row —
 * the UI asks the user to type it, and this check is what actually enforces it.
 */
const deleteSchema = z.object({
  confirmApplicationNumber: z.string().trim().min(1, "Nomor permohonan wajib diisi"),
});

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const parsed = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const summary = await previewApplicationDeletion(id);
  if (!summary) return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });

  if (parsed.data.confirmApplicationNumber !== summary.applicationNumber) {
    return NextResponse.json(
      { error: `Nomor permohonan tidak cocok — ketik tepat "${summary.applicationNumber}" untuk menghapus.` },
      { status: 400 },
    );
  }

  const deleted = await deleteApplicationCompletely(id);
  if (!deleted) return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });

  console.info(
    `Application ${deleted.applicationNumber} deleted by ${session.user.email ?? session.user.id} (${session.user.role ?? "-"})`,
  );
  return NextResponse.json({ data: deleted });
}
