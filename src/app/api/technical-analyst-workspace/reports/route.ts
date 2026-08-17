import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import { overallTechnicalStatus, technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";

/**
 * Unlike verifikator/surveyor's report list (per-location-visit), a technical analyst's own
 * "report" is the assignment-level analysis itself — there's no separate document to open, the
 * Analisis Teknis tab on the assignment IS the report. Only surfaces assignments where at least
 * one module has been given a verdict — an untouched assignment isn't a report yet.
 */
export async function GET() {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const assignments = await db.assignment.findMany({
    where: { technicalReviewerId: technicalAnalystId },
    include: { application: true },
    orderBy: { updatedAt: "desc" },
  });

  const data = assignments
    .map((assignment) => {
      const payload = assignment.application.payload as { companyName?: string } | null;
      const technicalAnalysisData = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});
      const hasAnyVerdict = Object.values(technicalAnalysisData).some((module) => module.status && module.status !== "PENDING");
      return {
        id: assignment.id,
        assignmentNumber: assignment.assignmentNumber,
        applicationNumber: assignment.application.applicationNumber,
        companyName: payload?.companyName ?? "—",
        verificationType: assignment.application.verificationType,
        assignmentStatus: assignment.status,
        validatedAt: assignment.validatedAt,
        overallStatus: overallTechnicalStatus(assignment.application.verificationType, technicalAnalysisData),
        hasAnyVerdict,
      };
    })
    .filter((row) => row.hasAnyVerdict);

  return NextResponse.json({ data });
}
