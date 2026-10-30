import { NextResponse } from "next/server";

import { requireComplianceSession } from "@/lib/require-compliance-session";
import {
  CASE_CATEGORIES,
} from "@/modules/compliance-workspace/consolidation";
import {
  EXTRA_CHIPS,
  PAGE_SIZES,
  SCORE_FILTERS,
  SORT_KEYS,
  chipCounts,
  queryCases,
  type CaseQuery,
} from "@/modules/compliance-workspace/case-list";
import { loadComplianceCases, loadCompliancePics } from "@/modules/compliance-workspace/server/load-cases";
import { WORKSPACE_KEYS, type WorkspaceState } from "@/modules/compliance-workspace/workspace-status";

const WORKSPACE_STATES: WorkspaceState[] = ["COMPLETED", "IN_PROGRESS", "ISSUE", "NOT_STARTED"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | "" {
  return value && (allowed as readonly string[]).includes(value) ? (value as T) : "";
}

/** Parses the Daftar Permohonan query string; anything unknown is ignored rather than rejected. */
function parseQuery(params: URLSearchParams): CaseQuery {
  const workspaceState: CaseQuery["workspaceState"] = {};
  for (const key of WORKSPACE_KEYS) workspaceState[key] = oneOf(params.get(`ws${key}`), WORKSPACE_STATES);
  const pageSize = Number(params.get("pageSize"));
  return {
    q: params.get("q")?.slice(0, 100) ?? "",
    chip: oneOf(params.get("chip"), [...CASE_CATEGORIES, ...EXTRA_CHIPS]),
    lastWorkspace: oneOf(params.get("lastWorkspace"), WORKSPACE_KEYS),
    picUserId: params.get("pic") ?? "",
    submittedFrom: DAY.test(params.get("from") ?? "") ? params.get("from")! : undefined,
    submittedTo: DAY.test(params.get("to") ?? "") ? params.get("to")! : undefined,
    workspaceState,
    hasOpenIssue: oneOf(params.get("openIssue"), ["ya", "tidak"] as const),
    hasConflict: oneOf(params.get("conflict"), ["ya", "tidak"] as const),
    lhviu: oneOf(params.get("lhviu"), ["Terbit", "Belum Terbit"] as const),
    score: oneOf(params.get("score"), SCORE_FILTERS),
    sort: oneOf(params.get("sort"), SORT_KEYS) || "updated",
    dir: params.get("dir") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(params.get("page")) || 1),
    // "all" is used by Export; otherwise one of the page sizes offered in the UI.
    pageSize: params.get("pageSize") === "all" ? 1000 : (PAGE_SIZES as readonly number[]).includes(pageSize) ? pageSize : 10,
  };
}

/** Daftar Permohonan — VIU Konsumsi applications with their derived compliance state (read only). */
export async function GET(request: Request) {
  const { error } = await requireComplianceSession();
  if (error) return error;

  const query = parseQuery(new URL(request.url).searchParams);
  const [rows, pics] = await Promise.all([loadComplianceCases(), loadCompliancePics()]);
  return NextResponse.json({ data: { ...queryCases(rows, query), counts: chipCounts(rows), pics } });
}
