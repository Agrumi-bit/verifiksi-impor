/**
 * Whether a Verifikator/Technical Analyst can work on (verify, analyse, decide) an assignment.
 * Normally only SUBMITTED; an assignment reopened after the company resubmitted a revision is
 * IN_PROGRESS with revisionCount > 0 and is reviewable again. A plain IN_PROGRESS (survey still
 * under way) is not. No db import — used by API routes and client components alike.
 */
export function isAssignmentReviewable(assignment: { status: string; revisionCount?: number | null }): boolean {
  if (assignment.status === "SUBMITTED") return true;
  return assignment.status === "IN_PROGRESS" && (assignment.revisionCount ?? 0) > 0;
}

/** Same check as a Prisma `where` fragment, for list queries. */
export const REVIEWABLE_ASSIGNMENT_WHERE = {
  OR: [{ status: "SUBMITTED" as const }, { status: "IN_PROGRESS" as const, revisionCount: { gt: 0 } }],
};
