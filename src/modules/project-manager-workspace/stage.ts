export type SiblingForStage = {
  scheduleType: string | null;
  status: string;
  dueDate: string | null;
  locationVisits: { status: string }[];
};

export const APPLICATION_STAGE_KEYS = [
  "Submitted",
  "Document Verification",
  "Survey Assignment",
  "Field Survey",
  "Survey Report Review",
  "Verification Review",
  "Completed",
] as const;
export type ApplicationStageKey = (typeof APPLICATION_STAGE_KEYS)[number];

export type ApplicationOverallStatus = "Submitted" | "In Progress" | "Revision Required" | "Overdue" | "Completed";

export type ApplicationStageResult = {
  stage: ApplicationStageKey;
  status: ApplicationOverallStatus;
  slaLabel: string;
  slaDetail: string;
  slaColor: string;
};

/**
 * Derives an application's overall pipeline stage + status + SLA from its real sibling
 * assignments (survey/dokumen/technical) — never stored, always recomputed from the same
 * `Assignment.status`/`LocationVisit.status`/`dueDate` fields every other workspace already
 * reads. This is a heuristic over 3 independently-scheduled assignments (CR can schedule them
 * in any order), not a strict enforced pipeline — "furthest behind sibling wins" is the
 * simplest defensible rule, not a claim about the real business process.
 */
export function computeApplicationStage(siblings: SiblingForStage[]): ApplicationStageResult {
  const dokumen = siblings.find((s) => s.scheduleType === "dokumen") ?? null;
  const survey = siblings.find((s) => s.scheduleType === "survey") ?? null;
  const technical = siblings.find((s) => s.scheduleType === "technical") ?? null;

  const anyReturned = siblings.some((s) => s.status === "RETURNED");
  const relevant = [dokumen, survey, technical].filter((s): s is SiblingForStage => s !== null);

  let stage: ApplicationStageKey;
  if (relevant.length === 0) {
    stage = "Submitted";
  } else if (dokumen && dokumen.status !== "COMPLETED") {
    stage = "Document Verification";
  } else if (!survey) {
    stage = dokumen ? "Survey Assignment" : "Document Verification";
  } else if (survey.locationVisits.length === 0 || survey.locationVisits.every((v) => v.status === "NOT_STARTED")) {
    stage = "Survey Assignment";
  } else if (!survey.locationVisits.every((v) => v.status === "COMPLETED")) {
    stage = "Field Survey";
  } else if (survey.status !== "COMPLETED") {
    stage = "Survey Report Review";
  } else if (technical && technical.status !== "COMPLETED") {
    stage = "Verification Review";
  } else if (relevant.every((s) => s.status === "COMPLETED")) {
    stage = "Completed";
  } else {
    stage = "Verification Review";
  }

  const nearestDueDate = relevant
    .map((s) => s.dueDate)
    .filter((d): d is string => d !== null)
    .sort()[0];

  let slaLabel = "Tidak ada due date";
  let slaDetail = "—";
  let slaColor = "#8a7565";
  if (nearestDueDate) {
    const days = Math.ceil((new Date(nearestDueDate).getTime() - Date.now()) / 86400000);
    if (stage === "Completed") {
      slaLabel = "Selesai";
      slaDetail = "Selesai";
      slaColor = "#1a9850";
    } else if (days < 0) {
      slaLabel = "Overdue";
      slaDetail = `${Math.abs(days)} hari terlambat`;
      slaColor = "#e15241";
    } else if (days === 0) {
      slaLabel = "Due Today";
      slaDetail = "Jatuh tempo hari ini";
      slaColor = "#c98a1f";
    } else if (days <= 2) {
      slaLabel = "At Risk";
      slaDetail = `${days} hari lagi`;
      slaColor = "#c98a1f";
    } else {
      slaLabel = "On Track";
      slaDetail = `${days} hari lagi`;
      slaColor = "#1a9850";
    }
  }

  let status: ApplicationOverallStatus;
  if (stage === "Completed") status = "Completed";
  else if (anyReturned) status = "Revision Required";
  else if (nearestDueDate && new Date(nearestDueDate).getTime() < Date.now()) status = "Overdue";
  else if (relevant.length === 0) status = "Submitted";
  else status = "In Progress";

  return { stage, status, slaLabel, slaDetail, slaColor };
}
