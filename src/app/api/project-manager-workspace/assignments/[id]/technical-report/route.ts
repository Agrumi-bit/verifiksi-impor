import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { buildTechnicalReportData } from "@/modules/technical-analyst-workspace/server/technical-report-data";

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
  return NextResponse.json({ data: await buildTechnicalReportData(assignment) });
}
