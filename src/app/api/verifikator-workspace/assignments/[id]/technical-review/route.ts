import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { readDocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review-store";

/**
 * The Technical Analyst's review of this verifikator's Laporan Verifikasi Dokumen (read-only for the
 * verifikator) — taken from the application's technical assignment. Null when there is none yet.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, select: { applicationId: true, verifikatorId: true } });
  if (!assignment || assignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const technical = await db.assignment.findFirst({
    where: { applicationId: assignment.applicationId, scheduleType: "technical" },
    orderBy: { createdAt: "desc" },
    select: { id: true, technicalReviewer: { select: { name: true } } },
  });
  if (!technical) return NextResponse.json({ data: null });

  return NextResponse.json({
    data: { review: await readDocumentReportReview(technical.id), technicalReviewerName: technical.technicalReviewer?.name ?? null },
  });
}
