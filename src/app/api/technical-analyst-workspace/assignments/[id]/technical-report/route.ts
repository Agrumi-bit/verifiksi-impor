import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import { buildTechnicalReportData } from "@/modules/technical-analyst-workspace/server/technical-report-data";

/** Laporan Analisis Teknis for the Technical Analyst's own assignment (Draft Report → Generate Report). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    include: { application: true, technicalReviewer: { select: { name: true } } },
  });
  if (!assignment || assignment.technicalReviewerId !== session.user.id) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: await buildTechnicalReportData(assignment) });
}
