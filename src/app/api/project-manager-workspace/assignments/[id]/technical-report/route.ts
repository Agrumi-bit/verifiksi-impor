import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildKonsumsiImportPlan, buildModalKerjaFromApplication } from "@/modules/applications/viu-import-plan";
import { technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import { readDocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review-store";

/** Read-only data for the printable Laporan Analisis Teknis (PM — LHVIU tab and its own page). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    include: { application: true, technicalReviewer: { select: { name: true } } },
  });
  if (!assignment || assignment.scheduleType !== "technical") {
    return NextResponse.json({ error: "Penugasan analisis teknis tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const kantor = payload.locations?.find((loc) => loc.locationType === "KANTOR") ?? payload.locations?.[0];

  return NextResponse.json({
    data: {
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      verificationType: assignment.application.verificationType,
      importTypes: payload.importTypes ?? [],
      companyName: payload.companyName,
      nibNumber: payload.nibNumber ?? null,
      businessAddress: kantor ? `${kantor.address}, ${kantor.city}, ${kantor.province}` : null,
      status: assignment.status,
      technicalReviewerName: assignment.technicalReviewer?.name ?? null,
      validatedAt: assignment.validatedAt,
      validationNotes: assignment.validationNotes,
      pmReviewStatus: assignment.pmReviewStatus,
      pmReviewedAt: assignment.pmReviewedAt,
      technicalAnalysisData: technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {}),
      documentReportReview: await readDocumentReportReview(assignment.id),
      konsumsiImportPlan: buildKonsumsiImportPlan(payload),
      modalKerjaFromApplication: buildModalKerjaFromApplication(payload),
    },
  });
}
