import { db } from "@/lib/db";

/**
 * Called when a RETURNED application is resubmitted (RETURNED → SUBMITTED): every Verifikator /
 * Technical Analyst assignment that returned it reopens as IN_PROGRESS ("Revisi ke-N"), its
 * previous decision notes move to lastReturnNotes, and any Project Manager review of the old
 * (returned) report is cleared so the revised report can be reviewed again. Survey assignments
 * and anything COMPLETED are left alone. Returns how many assignments were reopened.
 */
export async function reopenReturnedAssignments(applicationId: string, receivedAt: Date): Promise<number> {
  const returned = await db.assignment.findMany({
    where: {
      applicationId,
      status: "RETURNED",
      OR: [{ verifikatorId: { not: null } }, { technicalReviewerId: { not: null } }],
    },
    select: { id: true, validationNotes: true },
  });
  if (returned.length === 0) return 0;

  await db.$transaction(
    returned.map((assignment) =>
      db.assignment.update({
        where: { id: assignment.id },
        data: {
          status: "IN_PROGRESS",
          revisionCount: { increment: 1 },
          revisionReceivedAt: receivedAt,
          lastReturnNotes: assignment.validationNotes,
          validationNotes: null,
          validatedAt: null,
          pmReviewStatus: null,
          pmReviewNote: null,
          pmReviewedAt: null,
        },
      }),
    ),
  );
  return returned.length;
}
