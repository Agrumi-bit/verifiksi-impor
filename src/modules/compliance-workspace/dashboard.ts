import type { CaseRow } from "./case-list";
import { CASE_CATEGORIES, type CaseCategory, type FindingKind } from "./consolidation";
import { WORKSPACE_KEYS, type WorkspaceKey } from "./workspace-status";

/** Compliance Dashboard figures (pure) — every number is a count over real cases and findings. */

export type DashboardSummary = {
  totalCases: number;
  byCategory: Record<CaseCategory, number>;
  /** Cases still waiting for handover, by the workspace they are held at. */
  waitingAt: Record<WorkspaceKey, number>;
  readyForConsolidation: number;
  activeFindings: Record<Exclude<FindingKind, "RESOLVED">, number>;
  resolvedFindings: number;
  lhviuIssued: number;
  reviewFlagged: number;
  /** Mean compliance score of handed-over cases (null when there are none). */
  averageScore: number | null;
};

export function summarizeDashboard(cases: CaseRow[], findings: { kind: FindingKind }[]): DashboardSummary {
  const byCategory = Object.fromEntries(CASE_CATEGORIES.map((category) => [category, 0])) as Record<CaseCategory, number>;
  const waitingAt = Object.fromEntries(WORKSPACE_KEYS.map((key) => [key, 0])) as Record<WorkspaceKey, number>;
  const scores: number[] = [];
  for (const row of cases) {
    byCategory[row.category] += 1;
    if (row.category === "MH") waitingAt[row.lastWorkspace] += 1;
    else scores.push(row.summary.score);
  }
  const activeFindings = { OPEN: 0, KLARIFIKASI: 0, CONFLICT: 0 };
  let resolvedFindings = 0;
  for (const finding of findings) {
    if (finding.kind === "RESOLVED") resolvedFindings += 1;
    else activeFindings[finding.kind] += 1;
  }
  return {
    totalCases: cases.length,
    byCategory,
    waitingAt,
    readyForConsolidation: cases.filter((row) => row.readiness === "ready").length,
    activeFindings,
    resolvedFindings,
    lhviuIssued: cases.filter((row) => row.lhviuIssued).length,
    reviewFlagged: cases.filter((row) => row.reviewFlag).length,
    averageScore: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length) : null,
  };
}

/** How urgent a case is for Compliance: open issue > follow-up > other active findings > flagged for review. */
function attentionRank(row: CaseRow): number {
  if (row.category === "OI") return 4;
  if (row.category === "PTL") return 3;
  if (row.activeFindings.length > 0) return 2;
  return row.reviewFlag ? 1 : 0;
}

/** Cases that need Compliance now — any active finding or review flag, most urgent and most recent first. */
export function casesNeedingAttention(cases: CaseRow[], limit = 6): CaseRow[] {
  return cases
    .filter((row) => attentionRank(row) > 0)
    .sort((a, b) => attentionRank(b) - attentionRank(a) || b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit);
}
