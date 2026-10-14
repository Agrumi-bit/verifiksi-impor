import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { technicalReportPdfResponse } from "@/modules/technical-analyst-workspace/server/technical-report-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

/** Laporan Analisis Teknis as a PDF file (direct download for "Unduh PDF", PM). */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, select: { scheduleType: true } });
  if (!assignment || assignment.scheduleType !== "technical") {
    return NextResponse.json({ error: "Penugasan analisis teknis tidak ditemukan" }, { status: 404 });
  }
  return technicalReportPdfResponse(request, `/project-manager-workspace/assignments/${encodeURIComponent(id)}/technical-report`, id);
}
