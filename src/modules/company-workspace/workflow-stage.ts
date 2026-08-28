import type { ApplicationStatusValue } from "./status";

type StageAssignment = {
  scheduleType: string | null;
  status: string;
  verifikatorId: string | null;
  technicalReviewerId: string | null;
};

type StageApplication = {
  status: ApplicationStatusValue;
  crDocumentVerifications: unknown;
};

type ScheduleKind = "survey" | "dokumen" | "technical";

// `scheduleType` is null on legacy rows created before the field existed —
// same fallback Customer Relation's own workflow view uses.
function scheduleKindOf(assignment: StageAssignment): ScheduleKind {
  if (assignment.scheduleType === "survey" || assignment.scheduleType === "dokumen" || assignment.scheduleType === "technical") {
    return assignment.scheduleType;
  }
  if (assignment.verifikatorId) return "dokumen";
  if (assignment.technicalReviewerId) return "technical";
  return "survey";
}

/**
 * `Application.status` only ever moves SUBMITTED -> RETURNED/REJECTED/WITHDRAWN
 * (or stays SUBMITTED forever on the happy path) — no route advances it through
 * the intermediate pipeline stages. This derives the company-facing stage from
 * the sibling Assignment rows Customer Relation/surveyor/verifikator/technical
 * analyst actually write to, so the workflow stepper reflects real progress
 * instead of freezing at "Submitted".
 */
export function computeDisplayStatus(application: StageApplication, assignments: StageAssignment[]): ApplicationStatusValue {
  if (application.status !== "SUBMITTED") return application.status;

  if (assignments.length === 0) {
    const reviewed =
      application.crDocumentVerifications != null &&
      typeof application.crDocumentVerifications === "object" &&
      Object.keys(application.crDocumentVerifications as object).length > 0;
    return reviewed ? "ADMINISTRATIVE_REVIEW" : "SUBMITTED";
  }

  const byKind: Record<ScheduleKind, StageAssignment[]> = { survey: [], dokumen: [], technical: [] };
  for (const assignment of assignments) byKind[scheduleKindOf(assignment)].push(assignment);

  const kindsPresent = (["survey", "dokumen", "technical"] as const).filter((kind) => byKind[kind].length > 0);
  const allComplete = kindsPresent.every((kind) => byKind[kind].every((a) => a.status === "COMPLETED"));
  if (allComplete) return "COMPLETED";

  if (byKind.technical.length > 0) return "TECHNICAL_REVIEW";
  if (byKind.dokumen.length > 0) return "VERIFICATION";
  if (byKind.survey.length > 0) return "SURVEY_SCHEDULED";

  return "SUBMITTED";
}
