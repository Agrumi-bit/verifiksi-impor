/**
 * Where each upstream workspace stands for one application, as the Compliance Workspace sees it.
 * Derived at read time from the same fields every other workspace already writes — never stored.
 *
 * "Completed" (agreed rules):
 * - Customer Relation: the LHVIU is issued, or (before that) every Surat Tugas it scheduled is
 *   APPROVED by the Project Manager.
 * - Surveyor / Verifikator / Technical Analyst: every assignment of that schedule type is COMPLETED.
 *   A survey assignment never reaches COMPLETED (it stops at SUBMITTED once every location is
 *   surveyed), so for a survey "done" is the PM approving its Laporan Survey — the same rule as
 *   project-manager-workspace/stage.ts. A survey assignment without any location visit, while another
 *   survey assignment of the case has visits, was superseded (rescheduled — its locations were surveyed
 *   under the other one): it has no Laporan Survey to approve and does not hold the Surveyor back.
 * - Project Manager: the LHVIU is issued.
 *
 * The Technical Analyst is a workspace of VKI only. VIU Konsumsi has no Technical Analyst step: its
 * statuses carry no TA entry and a "technical" assignment, if one exists, is ignored.
 */

import type { ComplianceScheme } from "./scheme";

/** Every workspace, in process order. A scheme uses the ones its statuses carry (workspaceKeysOf). */
export const WORKSPACE_KEYS = ["CR", "SV", "VF", "TA", "PM"] as const;
export type WorkspaceKey = (typeof WORKSPACE_KEYS)[number];

export type WorkspaceState = "COMPLETED" | "IN_PROGRESS" | "ISSUE" | "NOT_STARTED";
/** CR, SV, VF and PM always; TA only for a scheme with a Technical Analyst step (VKI). */
export type WorkspaceStatuses = Record<Exclude<WorkspaceKey, "TA">, WorkspaceState> & { TA?: WorkspaceState };

export const WORKSPACE_LABELS: Record<WorkspaceKey, string> = {
  CR: "Customer Relation",
  SV: "Surveyor",
  VF: "Verifikator",
  TA: "Technical Analyst",
  PM: "Project Manager",
};

/** The workspaces of a case, in process order — the keys its statuses carry. */
export function workspaceKeysOf(statuses: WorkspaceStatuses): WorkspaceKey[] {
  return WORKSPACE_KEYS.filter((key) => statuses[key] !== undefined);
}

/** The workspaces of a scheme, in process order. */
export function schemeWorkspaceKeys(scheme: ComplianceScheme): WorkspaceKey[] {
  return scheme === "vki" ? [...WORKSPACE_KEYS] : WORKSPACE_KEYS.filter((key) => key !== "TA");
}

/** A case's state in one workspace (a workspace the scheme does not have counts as not started). */
export function stateOf(statuses: WorkspaceStatuses, key: WorkspaceKey): WorkspaceState {
  return statuses[key] ?? "NOT_STARTED";
}

export const WORKSPACE_STATE_LABELS: Record<WorkspaceState, string> = {
  COMPLETED: "Completed",
  IN_PROGRESS: "Dalam Proses",
  ISSUE: "Ada Issue",
  NOT_STARTED: "Belum Mulai",
};

export type AssignmentForWorkspaceStatus = {
  /** 'survey' | 'dokumen' | 'technical' — null for legacy rows. */
  scheduleType: string | null;
  status: string;
  letterStatus: string;
  pmReviewStatus: string | null;
  /** Survey: the assignment's location visits — only their count matters here (see supersededSurveys). */
  locationVisits?: readonly unknown[];
};

/**
 * Survey assignments that never visited a location while another survey assignment of the same case
 * did — superseded by a rescheduled assignment, so nothing is left for them to hand over. When visits
 * are unknown (not loaded) or no assignment has any, every assignment counts.
 */
function withoutSupersededSurveys(assignments: AssignmentForWorkspaceStatus[]): AssignmentForWorkspaceStatus[] {
  const visited = (a: AssignmentForWorkspaceStatus) => (a.locationVisits?.length ?? 0) > 0;
  if (assignments.some((a) => a.locationVisits === undefined) || !assignments.some(visited)) return assignments;
  return assignments.filter(visited);
}

export type WorkspaceStatusInput = {
  applicationStatus: string;
  /** Application.returnedByRole — who sent it back for revision, as a party. */
  returnedByRole: string | null;
  assignments: AssignmentForWorkspaceStatus[];
  lhviuIssued: boolean;
  /** Konsumsi when absent. */
  scheme?: ComplianceScheme;
};

const SCHEDULE_TYPE_OF: Record<"SV" | "VF" | "TA", string> = { SV: "survey", VF: "dokumen", TA: "technical" };

function isAssignmentDone(assignment: AssignmentForWorkspaceStatus): boolean {
  if (assignment.status === "COMPLETED") return true;
  return assignment.scheduleType === "survey" && assignment.pmReviewStatus === "APPROVED";
}

function isAssignmentInIssue(assignment: AssignmentForWorkspaceStatus): boolean {
  return assignment.status === "RETURNED" || assignment.pmReviewStatus === "REJECTED";
}

function customerRelationState(input: WorkspaceStatusInput): WorkspaceState {
  if (input.applicationStatus === "DRAFT") return "NOT_STARTED";
  // Surat Tugas are mostly never PM-approved in practice; an issued LHVIU closes CR's part.
  if (input.lhviuIssued) return "COMPLETED";
  if (input.applicationStatus === "RETURNED" && input.returnedByRole === "CUSTOMER_RELATIONSHIP") return "ISSUE";
  if (input.assignments.length === 0) return "IN_PROGRESS";
  return input.assignments.every((a) => a.letterStatus === "APPROVED") ? "COMPLETED" : "IN_PROGRESS";
}

function scheduledWorkspaceState(assignments: AssignmentForWorkspaceStatus[]): WorkspaceState {
  if (assignments.length === 0) return "NOT_STARTED";
  if (assignments.some(isAssignmentInIssue)) return "ISSUE";
  return assignments.every(isAssignmentDone) ? "COMPLETED" : "IN_PROGRESS";
}

/** VIU Konsumsi has no Technical Analyst step: drop a "technical" assignment wherever one exists. */
export function withoutTechnical<T extends { scheduleType: string | null }>(assignments: T[]): T[] {
  return assignments.filter((a) => a.scheduleType !== "technical");
}

export function deriveWorkspaceStatuses(raw: WorkspaceStatusInput): WorkspaceStatuses {
  const withTechnical = raw.scheme === "vki";
  const input = { ...raw, assignments: withTechnical ? raw.assignments : withoutTechnical(raw.assignments) };
  const ofType = (key: "SV" | "VF" | "TA") => input.assignments.filter((a) => a.scheduleType === SCHEDULE_TYPE_OF[key]);
  const SV = scheduledWorkspaceState(withoutSupersededSurveys(ofType("SV")));
  const VF = scheduledWorkspaceState(ofType("VF"));
  const TA = withTechnical ? scheduledWorkspaceState(ofType("TA")) : undefined;

  let PM: WorkspaceState;
  if (input.lhviuIssued) PM = "COMPLETED";
  else if (input.assignments.some((a) => a.pmReviewStatus !== null) || [SV, VF, ...(TA ? [TA] : [])].every((s) => s === "COMPLETED")) PM = "IN_PROGRESS";
  else PM = "NOT_STARTED";

  return { CR: customerRelationState(input), SV, VF, ...(TA ? { TA } : {}), PM };
}
