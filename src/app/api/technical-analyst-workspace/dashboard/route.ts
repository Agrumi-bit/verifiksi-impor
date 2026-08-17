import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import { overallTechnicalStatus, technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";

export async function GET() {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

  const assignments = await db.assignment.findMany({
    where: { technicalReviewerId: technicalAnalystId },
    include: { application: true },
    orderBy: { updatedAt: "desc" },
  });

  const rows = assignments.map((assignment) => {
    const payload = assignment.application.payload as { companyName?: string } | null;
    const technicalAnalysisData = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});
    return {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: assignment.application.verificationType,
      status: assignment.status,
      dueDate: assignment.dueDate,
      overallStatus: overallTechnicalStatus(assignment.application.verificationType, technicalAnalysisData),
    };
  });

  const stats = {
    total: rows.length,
    belumDianalisis: rows.filter((r) => r.overallStatus === "PENDING").length,
    sesuai: rows.filter((r) => r.overallStatus === "SESUAI").length,
    tidakSesuai: rows.filter((r) => r.overallStatus === "TIDAK_SESUAI").length,
  };

  return NextResponse.json({
    stats,
    recentAssignments: rows.slice(0, 5),
  });
}
