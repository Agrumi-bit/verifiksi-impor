import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import { technicalReportPdfResponse } from "@/modules/technical-analyst-workspace/server/technical-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** Laporan Analisis Teknis as a PDF file (direct download for "Unduh PDF"). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, select: { technicalReviewerId: true } });
  if (!assignment || assignment.technicalReviewerId !== session.user.id) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  return technicalReportPdfResponse(request, `/technical-analyst-workspace/assignments/${encodeURIComponent(id)}/technical-report`, id);
}
