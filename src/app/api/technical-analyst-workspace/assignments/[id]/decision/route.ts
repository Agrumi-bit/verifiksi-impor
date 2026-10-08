import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { isAssignmentReviewable } from "@/modules/applications/assignment-review-state";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import { returnApplicationForRevision } from "@/modules/applications/return-for-revision";
import { allModulesDecided, decisionSchema, technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { isDocumentReportVerified } from "@/modules/technical-analyst-workspace/document-report-review";
import { readDocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review-store";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, include: { application: true } });
  if (!assignment || assignment.technicalReviewerId !== technicalAnalystId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (!isAssignmentReviewable(assignment)) {
    return NextResponse.json(
      { error: "Keputusan hanya dapat diambil saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const technicalAnalysisData = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});
  if (!allModulesDecided(assignment.application.verificationType, technicalAnalysisData, (assignment.application.payload as { importTypes?: string[] } | null)?.importTypes)) {
    return NextResponse.json(
      { error: "Seluruh modul analisis teknis harus dinilai terlebih dahulu." },
      { status: 400 },
    );
  }
  if (!isDocumentReportVerified(await readDocumentReportReview(assignment.id))) {
    return NextResponse.json(
      { error: "Laporan Verifikasi Dokumen harus direview dengan hasil Verified terlebih dahulu." },
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
    await returnApplicationForRevision({
      applicationId: assignment.applicationId,
      source: "TECHNICAL_ANALYST",
      actor: { id: technicalAnalystId, name: session.user.name, role: session.user.role },
      reason: parsed.data.notes,
    });
  }

  return NextResponse.json({ data: updated });
}
