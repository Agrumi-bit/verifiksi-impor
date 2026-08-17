import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import { allModulesDecided, decisionSchema, technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, include: { application: true } });
  if (!assignment || assignment.technicalReviewerId !== technicalAnalystId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Keputusan hanya dapat diambil saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const technicalAnalysisData = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});
  if (!allModulesDecided(assignment.application.verificationType, technicalAnalysisData)) {
    return NextResponse.json(
      { error: "Seluruh modul analisis teknis harus dinilai terlebih dahulu." },
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
    },
  });

  if (parsed.data.decision === "RETURNED") {
    await db.application.update({
      where: { id: assignment.applicationId },
      data: { status: "RETURNED" },
    });
    await db.applicationMessage.create({
      data: {
        applicationId: assignment.applicationId,
        direction: "SYSTEM",
        text: `Permohonan dikembalikan oleh technical analyst untuk direvisi — alasan: ${parsed.data.notes}`,
      },
    });
  }

  return NextResponse.json({ data: updated });
}
