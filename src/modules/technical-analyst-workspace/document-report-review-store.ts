import "server-only";

import { db } from "@/lib/db";
import { parseDocumentReportReview, type DocumentReportReview } from "./document-report-review";

/*
 * Assignment.documentReportReview (migration 35) is read/written with SQL rather than the generated
 * Prisma client so these routes compile and run against a client generated before the column was
 * added (the Docker build regenerates it; local dev may not have yet). The column is plain JSONB.
 */

export async function readDocumentReportReview(assignmentId: string): Promise<DocumentReportReview> {
  const rows = await db.$queryRaw<{ documentReportReview: unknown }[]>`
    SELECT "documentReportReview" FROM "assignment" WHERE "id" = ${assignmentId}`;
  return parseDocumentReportReview(rows[0]?.documentReportReview ?? null);
}

export async function writeDocumentReportReview(assignmentId: string, review: DocumentReportReview): Promise<void> {
  await db.$executeRaw`
    UPDATE "assignment" SET "documentReportReview" = ${JSON.stringify(review)}::jsonb WHERE "id" = ${assignmentId}`;
}
