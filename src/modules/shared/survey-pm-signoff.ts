import "server-only";

import { db } from "@/lib/db";
import { readPmReviewedByName } from "@/modules/verifikator-workspace/report-signoff";

type ReviewedAssignment = { id: string; pmReviewStatus: string | null; pmReviewedAt: Date | null };

/**
 * The Project Manager's decision on the Laporan Survey a location report belongs to, for the
 * report's cover date and its Halaman Persetujuan ("Disetujui Oleh"). A survey result belongs to the
 * application location, whichever survey assignment recorded it, so the PM may have approved the
 * report on the assignment the report was opened from rather than on the visit's own assignment:
 * the visit's assignment counts first, then the opened one when it is a survey assignment of the
 * same application.
 */
export async function surveyPmSignoff(
  visitAssignment: ReviewedAssignment & { applicationId: string },
  openedAssignmentNumber?: string,
): Promise<{ pmReviewStatus: string | null; pmReviewedAt: Date | null; pmReviewedByName: string | null }> {
  let reviewed: ReviewedAssignment = visitAssignment;
  if (reviewed.pmReviewStatus !== "APPROVED" && openedAssignmentNumber) {
    const opened = await db.assignment.findUnique({
      where: { assignmentNumber: openedAssignmentNumber },
      select: { id: true, applicationId: true, scheduleType: true, pmReviewStatus: true, pmReviewedAt: true },
    });
    if (opened && opened.applicationId === visitAssignment.applicationId && opened.scheduleType === "survey" && opened.pmReviewStatus) reviewed = opened;
  }
  return {
    pmReviewStatus: reviewed.pmReviewStatus,
    pmReviewedAt: reviewed.pmReviewedAt,
    pmReviewedByName: reviewed.pmReviewStatus ? await readPmReviewedByName(reviewed.id) : null,
  };
}
