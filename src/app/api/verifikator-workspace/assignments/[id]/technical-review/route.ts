import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { readDocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review-store";
import { readPmReviewedByName } from "@/modules/verifikator-workspace/report-signoff";

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
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    select: { id: true, applicationId: true, verifikatorId: true, status: true, pmReviewStatus: true, pmReviewNote: true, pmReviewedAt: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const technical = await db.assignment.findFirst({
    where: { applicationId: assignment.applicationId, scheduleType: "technical" },
    orderBy: { createdAt: "desc" },
    select: { id: true, technicalReviewer: { select: { name: true } } },
  });
  // A PM "Kembalikan untuk Revisi" leaves its note on this assignment with no pmReviewStatus.
  const pmRevision = !assignment.pmReviewStatus && assignment.pmReviewNote
    ? { note: assignment.pmReviewNote, requestedAt: assignment.pmReviewedAt, byName: await readPmReviewedByName(assignment.id) }
    : null;

  return NextResponse.json({
    data: {
      review: technical ? await readDocumentReportReview(technical.id) : null,
      technicalReviewerName: technical?.technicalReviewer?.name ?? null,
      pmRevision,
    },
  });
}
