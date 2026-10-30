import {
  CASE_CATEGORIES,
  caseCategory,
  completedWorkspaceCount,
  complianceSummary,
  handoverStatus,
  lastWorkspace,
  readiness,
  type CaseCategory,
  type ComplianceStatusValue,
  type ComplianceSummary,
  type FindingKind,
  type HandoverStatus,
  type Readiness,
} from "./consolidation";
import { WORKSPACE_KEYS, deriveWorkspaceStatuses, type WorkspaceKey, type WorkspaceState, type WorkspaceStatusInput, type WorkspaceStatuses } from "./workspace-status";

/**
 * The Daftar Permohonan model: one row per VIU Konsumsi application, built from real data, and the
 * pure filter/sort/paginate the API applies. No React, no database.
 */

export type CaseFinding = { id: string; issueNumber: string; kind: FindingKind; title: string; sourceWorkspace: string };

export type CaseSource = WorkspaceStatusInput & {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  nib: string;
  /** Effective Tanggal Pengajuan (submissionDate, else createdAt) as ISO. */
  submittedAt: string;
  submittedIsSystemDate: boolean;
  /** Latest change across the application, its assignments and Compliance's own records. */
  updatedAt: string;
  lhviuNumber: string | null;
  lhviuIssuedAt: string | null;
  complianceStatus: ComplianceStatusValue;
  picUserId: string | null;
  picName: string | null;
  reviewFlag: boolean;
  finalReviewDone: boolean;
  dossierComplete: boolean;
  findings: CaseFinding[];
};

export type CaseRow = {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  nib: string;
  submittedAt: string;
  submittedIsSystemDate: boolean;
  updatedAt: string;
  workspaces: WorkspaceStatuses;
  completedWorkspaces: number;
  lastWorkspace: WorkspaceKey;
  handover: HandoverStatus;
  readiness: Readiness;
  category: CaseCategory;
  complianceStatus: ComplianceStatusValue;
  summary: ComplianceSummary;
  lhviuIssued: boolean;
  lhviuNumber: string | null;
  lhviuIssuedAt: string | null;
  picUserId: string | null;
  picName: string | null;
  reviewFlag: boolean;
  activeFindings: CaseFinding[];
  hasConflict: boolean;
};

export function buildCaseRow(source: CaseSource): CaseRow {
  const workspaces = deriveWorkspaceStatuses(source);
  const activeFindings = source.findings.filter((finding) => finding.kind !== "RESOLVED");
  return {
    applicationId: source.applicationId,
    applicationNumber: source.applicationNumber,
    companyName: source.companyName,
    nib: source.nib,
    submittedAt: source.submittedAt,
    submittedIsSystemDate: source.submittedIsSystemDate,
    updatedAt: source.updatedAt,
    workspaces,
    completedWorkspaces: completedWorkspaceCount(workspaces),
    lastWorkspace: lastWorkspace(workspaces),
    handover: handoverStatus(workspaces, source.complianceStatus),
    readiness: readiness(workspaces, source.findings),
    category: caseCategory(workspaces, source.complianceStatus, source.findings),
    complianceStatus: source.complianceStatus,
    summary: complianceSummary(workspaces, source.findings, source),
    lhviuIssued: source.lhviuIssued,
    lhviuNumber: source.lhviuNumber,
    lhviuIssuedAt: source.lhviuIssuedAt,
    picUserId: source.picUserId,
    picName: source.picName,
    reviewFlag: source.reviewFlag,
    activeFindings,
    hasConflict: activeFindings.some((finding) => finding.kind === "CONFLICT"),
  };
}

export const SORT_KEYS = ["updated", "number", "submitted", "status", "issues"] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const PAGE_SIZES = [10, 25, 50] as const;
export const SCORE_FILTERS = ["100", "90", "75", "lt75"] as const;
/** Quick chips beyond the six categories. */
export const EXTRA_CHIPS = ["LH", "REVIEW"] as const;
export type QuickChip = CaseCategory | (typeof EXTRA_CHIPS)[number];

export type CaseQuery = {
  q?: string;
  /** Status dropdown, summary card or quick chip. */
  chip?: QuickChip | "";
  lastWorkspace?: WorkspaceKey | "";
  picUserId?: string | "";
  /** Tanggal masuk range, YYYY-MM-DD (inclusive). */
  submittedFrom?: string;
  submittedTo?: string;
  workspaceState?: Partial<Record<WorkspaceKey, WorkspaceState | "">>;
  hasOpenIssue?: "ya" | "tidak" | "";
  hasConflict?: "ya" | "tidak" | "";
  lhviu?: "Terbit" | "Belum Terbit" | "";
  score?: (typeof SCORE_FILTERS)[number] | "";
  sort?: SortKey;
  dir?: "asc" | "desc";
  page?: number;
  pageSize?: number;
};

/** Jakarta calendar day (YYYY-MM-DD) of an ISO timestamp. */
function dayKey(iso: string): string {
  return new Date(new Date(iso).getTime() + 7 * 3600_000).toISOString().slice(0, 10);
}

function matchesChip(row: CaseRow, chip: QuickChip): boolean {
  if (chip === "LH") return row.lhviuIssued;
  if (chip === "REVIEW") return row.reviewFlag;
  return row.category === chip;
}

function matchesScore(score: number, filter: (typeof SCORE_FILTERS)[number]): boolean {
  if (filter === "100") return score === 100;
  if (filter === "lt75") return score < 75;
  return score >= Number(filter);
}

function matches(row: CaseRow, query: CaseQuery): boolean {
  const q = query.q?.trim().toLowerCase();
  if (q && ![row.applicationNumber, row.companyName, row.nib].some((value) => value.toLowerCase().includes(q))) return false;
  if (query.chip && !matchesChip(row, query.chip)) return false;
  if (query.lastWorkspace && row.lastWorkspace !== query.lastWorkspace) return false;
  if (query.picUserId && row.picUserId !== query.picUserId) return false;
  const submittedDay = dayKey(row.submittedAt);
  if (query.submittedFrom && submittedDay < query.submittedFrom) return false;
  if (query.submittedTo && submittedDay > query.submittedTo) return false;
  for (const key of WORKSPACE_KEYS) {
    const wanted = query.workspaceState?.[key];
    if (wanted && row.workspaces[key] !== wanted) return false;
  }
  const hasOpen = row.activeFindings.some((finding) => finding.kind === "OPEN");
  if (query.hasOpenIssue && (query.hasOpenIssue === "ya") !== hasOpen) return false;
  if (query.hasConflict && (query.hasConflict === "ya") !== row.hasConflict) return false;
  if (query.lhviu && (query.lhviu === "Terbit") !== row.lhviuIssued) return false;
  if (query.score && !matchesScore(row.summary.score, query.score)) return false;
  return true;
}

const CATEGORY_RANK = Object.fromEntries(CASE_CATEGORIES.map((category, index) => [category, index])) as Record<CaseCategory, number>;

function compare(a: CaseRow, b: CaseRow, sort: SortKey): number {
  switch (sort) {
    case "number":
      return a.applicationNumber.localeCompare(b.applicationNumber);
    case "submitted":
      return a.submittedAt.localeCompare(b.submittedAt);
    case "status":
      return CATEGORY_RANK[a.category] - CATEGORY_RANK[b.category];
    case "issues":
      return a.activeFindings.length - b.activeFindings.length;
    case "updated":
    default:
      return a.updatedAt.localeCompare(b.updatedAt);
  }
}

export type CasePage = { rows: CaseRow[]; total: number; page: number; pageSize: number; pageCount: number };

export function queryCases(rows: CaseRow[], query: CaseQuery): CasePage {
  const sort = query.sort ?? "updated";
  const direction = query.dir === "asc" ? 1 : -1;
  const filtered = rows
    .filter((row) => matches(row, query))
    .sort((a, b) => compare(a, b, sort) * direction || a.applicationNumber.localeCompare(b.applicationNumber));
  const pageSize = query.pageSize && query.pageSize > 0 ? Math.min(query.pageSize, 1000) : 10;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const page = Math.min(Math.max(1, query.page ?? 1), pageCount);
  return { rows: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize, pageCount };
}

/** Counts for the summary cards and quick chips — over every case, not the filtered page. */
export function chipCounts(rows: CaseRow[]): Record<QuickChip, number> & { ALL: number } {
  const counts = { ALL: rows.length, LH: 0, REVIEW: 0 } as Record<QuickChip, number> & { ALL: number };
  for (const category of CASE_CATEGORIES) counts[category] = 0;
  for (const row of rows) {
    counts[row.category] += 1;
    if (row.lhviuIssued) counts.LH += 1;
    if (row.reviewFlag) counts.REVIEW += 1;
  }
  return counts;
}
