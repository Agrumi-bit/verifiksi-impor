import "server-only";

import { db } from "@/lib/db";
import { writePmReviewedByName } from "@/modules/verifikator-workspace/report-signoff";

/**
 * Clears the Project Manager's Approve/Tolak on a report (Assignment.pmReviewStatus) so the PM reviews
 * it again — used when a newer version of the report arrives (surveyor re-submits a location, the
 * verifikator records a new review) and when the PM chooses "Review Ulang" after deciding.
 * No-op (returns false) when the PM has not decided yet.
 */
export async function resetPmReview(assignmentId: string, message: string): Promise<boolean> {
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    select: { id: true, applicationId: true, pmReviewStatus: true },
  });
  if (!assignment?.pmReviewStatus) return false;
  await db.assignment.update({
    where: { id: assignment.id },
    data: { pmReviewStatus: null, pmReviewNote: null, pmReviewedAt: null },
  });
  await writePmReviewedByName(assignment.id, null);
  await db.applicationMessage.create({ data: { applicationId: assignment.applicationId, direction: "SYSTEM", text: message } });
  return true;
}
