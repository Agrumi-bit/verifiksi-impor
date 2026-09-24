import type { ApplicationStatusValue } from "./status";

/**
 * The design's 8-stage workflow stepper (Draft/Submitted/Review/Survey/
 * Verifikasi/Technical Review/Compliance Check/Report Release) maps cleanly
 * onto our real ApplicationStatusValue enum — two statuses collapse into a
 * single visual stage where the difference isn't meaningful to the company
 * (SURVEY_SCHEDULED + FIELD_VERIFICATION are both "Survey" from their POV;
 * REPORT_GENERATION + COMPLETED are both "Report Release").
 */
export const WORKFLOW_STAGE_LABELS = [
  "Draft",
  "Submitted",
  "Review",
  "Survey",
  "Verifikasi",
  "Technical Review",
  "Compliance Check",
  "Report Release",
] as const;

const STAGE_INDEX: Record<ApplicationStatusValue, number> = {
  DRAFT: 0,
  SUBMITTED: 1,
  ADMINISTRATIVE_REVIEW: 2,
  SURVEY_SCHEDULED: 3,
  FIELD_VERIFICATION: 3,
  VERIFICATION: 4,
  TECHNICAL_REVIEW: 5,
  COMPLIANCE_REVIEW: 6,
  REPORT_GENERATION: 7,
  COMPLETED: 7,
  // Terminal-but-not-done statuses don't sit on the happy-path stepper —
  // stage index is only used for the stepper when !isTerminal.
  RETURNED: 2,
  REJECTED: 2,
  WITHDRAWN: 2,
};

const TERMINAL_DISPLAY: Record<"RETURNED" | "REJECTED" | "WITHDRAWN", { color: string; bgSoft: string }> = {
  RETURNED: { color: "#a6791f", bgSoft: "#faf1de" },
  REJECTED: { color: "#c1361f", bgSoft: "#fce8e6" },
  WITHDRAWN: { color: "#8a7565", bgSoft: "#f2ece5" },
};

export type ApplicationStatusDisplay = {
  label: string;
  color: string;
  bgSoft: string;
  progress: number;
  stageIndex: number;
  isTerminal: boolean;
};

/** Single source for status → stepper stage / badge color / progress %, shared by List and Detail. */
export function getApplicationStatusDisplay(status: ApplicationStatusValue): ApplicationStatusDisplay {
  const stageIndex = STAGE_INDEX[status];
  const isTerminal = status === "RETURNED" || status === "REJECTED" || status === "WITHDRAWN";
  const label = isTerminal
    ? status === "RETURNED"
      ? "Returned"
      : status === "REJECTED"
        ? "Rejected"
        : "Withdrawn"
    : WORKFLOW_STAGE_LABELS[stageIndex];

  if (isTerminal) {
    const { color, bgSoft } = TERMINAL_DISPLAY[status];
    return { label, color, bgSoft, progress: stageIndex, isTerminal: true, stageIndex };
  }

  const progress = status === "COMPLETED" ? 100 : Math.round((stageIndex / (WORKFLOW_STAGE_LABELS.length - 1)) * 100);
  return {
    label,
    color: status === "COMPLETED" ? "#1a7a4c" : "#e0662e",
    bgSoft: status === "COMPLETED" ? "#e2f7ea" : "#fdeadd",
    progress,
    stageIndex,
    isTerminal: false,
  };
}
