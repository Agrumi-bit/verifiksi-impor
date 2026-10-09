import "server-only";

import { db } from "@/lib/db";
import { readDocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review-store";
import type { DocumentReportReviewDecision } from "@/modules/technical-analyst-workspace/document-report-review";

/*
 * Assignment.pmReviewedByName (migration 39) is read/written with SQL, like documentReportReview,
 * so the routes run against a Prisma client generated before the column existed.
 */
export async function readPmReviewedByName(assignmentId: string): Promise<string | null> {
  const rows = await db.$queryRaw<{ pmReviewedByName: string | null }[]>`
    SELECT "pmReviewedByName" FROM "assignment" WHERE "id" = ${assignmentId}`;
  return rows[0]?.pmReviewedByName ?? null;
}

export async function writePmReviewedByName(assignmentId: string, name: string | null): Promise<void> {
  await db.$executeRaw`UPDATE "assignment" SET "pmReviewedByName" = ${name} WHERE "id" = ${assignmentId}`;
}

export type DocumentReportSignoff = {
  /** Technical Analyst's review of this report ("Diperiksa Oleh"). */
  technicalReview: { decision: DocumentReportReviewDecision; verifiedAt: string | null; verifiedByName: string | null } | null;
  /** Project Manager who approved the report ("Disetujui Oleh"). */
  pmReviewedByName: string | null;
};

/** Who checked / approved a Laporan Verifikasi Dokumen, for the report's Halaman Persetujuan. */
export async function loadDocumentReportSignoff(assignment: { id: string; applicationId: string }): Promise<DocumentReportSignoff> {
  const technical = await db.assignment.findFirst({
    where: { applicationId: assignment.applicationId, scheduleType: "technical" },
    orderBy: { createdAt: "desc" },
    select: { id: true, technicalReviewer: { select: { name: true } } },
  });
  let technicalReview: DocumentReportSignoff["technicalReview"] = null;
  if (technical) {
    const review = await readDocumentReportReview(technical.id);
    if (review.decision) {
      technicalReview = {
        decision: review.decision,
        verifiedAt: review.verifiedAt,
        verifiedByName: review.verifiedByName ?? technical.technicalReviewer?.name ?? null,
      };
    }
  }
  return { technicalReview, pmReviewedByName: await readPmReviewedByName(assignment.id) };
}
