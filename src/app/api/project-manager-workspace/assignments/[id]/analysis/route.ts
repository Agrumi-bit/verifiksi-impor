import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { buildAnalysisData } from "@/modules/technical-analyst-workspace/server/analysis-data";

/** Read-only Analisis Teknis data for the PM's Analisis tab (same shape as the Technical Analyst's). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, include: { application: true } });
  if (!assignment || assignment.scheduleType !== "technical") {
    return NextResponse.json({ error: "Penugasan analisis teknis tidak ditemukan" }, { status: 404 });
  }
  return NextResponse.json({ data: { ...buildAnalysisData(assignment), reviewable: false } });
}
