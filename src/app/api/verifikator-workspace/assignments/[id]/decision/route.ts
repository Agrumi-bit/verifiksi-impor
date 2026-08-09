import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

const decisionSchema = z.object({
  decision: z.enum(["COMPLETED", "RETURNED"]),
  notes: z.string().trim().min(1, "Catatan keputusan wajib diisi"),
  // Only set by the Draft Report tab's signed-submission flow — Approve/Return
  // from the Decision Panel never sends these, so they stay optional here.
  signaturePath: z.string().trim().optional(),
  signatureDate: z.string().trim().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
  if (!assignment || assignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Keputusan hanya dapat diambil saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = decisionSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: {
      status: parsed.data.decision,
      validationNotes: parsed.data.notes,
      validatedAt: new Date(),
      ...(parsed.data.signaturePath ? { signaturePath: parsed.data.signaturePath } : {}),
      ...(parsed.data.signatureDate ? { signatureDate: new Date(parsed.data.signatureDate) } : {}),
    },
  });

  // The document-verification assignment is where a verifikator finds "tidak sesuai" problems —
  // returning it here is the one real signal the company should see as "this application needs
  // revision". Application.status has no other writer for RETURNED today, so this is additive.
  if (parsed.data.decision === "RETURNED") {
    await db.application.update({
      where: { id: assignment.applicationId },
      data: { status: "RETURNED" },
    });
    await db.applicationMessage.create({
      data: {
        applicationId: assignment.applicationId,
        direction: "SYSTEM",
        text: `Permohonan dikembalikan oleh verifikator untuk direvisi — alasan: ${parsed.data.notes}`,
      },
    });
  }

  return NextResponse.json({ data: updated });
}
