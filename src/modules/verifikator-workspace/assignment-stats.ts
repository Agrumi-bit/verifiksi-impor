import { db } from "@/lib/db";

export type AssignmentStatCounts = {
  total: number;
  waiting: number;
  inReview: number;
  completed: number;
};

/**
 * Shared across Dashboard and My Assignment (design's `assignmentStats`).
 * AssignmentStatus has no field-visit concept (Rescheduled/Cancelled) — only
 * these 4 real buckets exist, so both pages summarize the same way.
 */
export async function getAssignmentStatCounts(verifikatorId: string): Promise<AssignmentStatCounts> {
  const grouped = await db.assignment.groupBy({
    by: ["status"],
    where: { verifikatorId },
    _count: { _all: true },
  });

  const counts = Object.fromEntries(grouped.map((g) => [g.status, g._count._all])) as Record<string, number>;
  const waiting = (counts.ASSIGNED ?? 0) + (counts.SCHEDULED ?? 0) + (counts.IN_PROGRESS ?? 0);
  const inReview = counts.SUBMITTED ?? 0;
  const completed = counts.COMPLETED ?? 0;
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return { total, waiting, inReview, completed };
}
