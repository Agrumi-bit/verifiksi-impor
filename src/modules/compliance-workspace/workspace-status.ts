/**
 * Where each upstream workspace stands for one application, as the Compliance Workspace sees it.
 * Derived at read time from the same fields every other workspace already writes — never stored.
 *
 * "Completed" (agreed rules):
 * - Customer Relation: every Surat Tugas it scheduled is APPROVED by the Project Manager.
 * - Surveyor / Verifikator / Technical Analyst: every assignment of that schedule type is COMPLETED.
 *   A survey assignment never reaches COMPLETED (it stops at SUBMITTED once every location is
 *   surveyed), so for a survey "done" is the PM approving its Laporan Survey — the same rule as
 *   project-manager-workspace/stage.ts.
 * - Project Manager: the LHVIU is issued.
 */

export const WORKSPACE_KEYS = ["CR", "SV", "VF", "TA", "PM"] as const;
export type WorkspaceKey = (typeof WORKSPACE_KEYS)[number];

export type WorkspaceState = "COMPLETED" | "IN_PROGRESS" | "ISSUE" | "NOT_STARTED";
export type WorkspaceStatuses = Record<WorkspaceKey, WorkspaceState>;

export const WORKSPACE_LABELS: Record<WorkspaceKey, string> = {
  CR: "Customer Relation",
  SV: "Surveyor",
  VF: "Verifikator",
  TA: "Technical Analyst",
  PM: "Project Manager",
};

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
};

export type WorkspaceStatusInput = {
  applicationStatus: string;
  /** Application.returnedByRole — who sent it back for revision, as a party. */
  returnedByRole: string | null;
  assignments: AssignmentForWorkspaceStatus[];
  lhviuIssued: boolean;
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
  if (input.applicationStatus === "RETURNED" && input.returnedByRole === "CUSTOMER_RELATIONSHIP") return "ISSUE";
  if (input.assignments.length === 0) return "IN_PROGRESS";
  return input.assignments.every((a) => a.letterStatus === "APPROVED") ? "COMPLETED" : "IN_PROGRESS";
}

function scheduledWorkspaceState(assignments: AssignmentForWorkspaceStatus[]): WorkspaceState {
  if (assignments.length === 0) return "NOT_STARTED";
  if (assignments.some(isAssignmentInIssue)) return "ISSUE";
  return assignments.every(isAssignmentDone) ? "COMPLETED" : "IN_PROGRESS";
}

export function deriveWorkspaceStatuses(input: WorkspaceStatusInput): WorkspaceStatuses {
  const ofType = (key: "SV" | "VF" | "TA") => input.assignments.filter((a) => a.scheduleType === SCHEDULE_TYPE_OF[key]);
  const SV = scheduledWorkspaceState(ofType("SV"));
  const VF = scheduledWorkspaceState(ofType("VF"));
  const TA = scheduledWorkspaceState(ofType("TA"));

  let PM: WorkspaceState;
  if (input.lhviuIssued) PM = "COMPLETED";
  else if (input.assignments.some((a) => a.pmReviewStatus !== null) || [SV, VF, TA].every((s) => s === "COMPLETED")) PM = "IN_PROGRESS";
  else PM = "NOT_STARTED";

  return { CR: customerRelationState(input), SV, VF, TA, PM };
}
