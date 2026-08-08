import type { ApplicationStatusValue } from "@/modules/company-workspace/status";

export const APPLICATION_STATUS_STYLE: Record<ApplicationStatusValue, { bg: string; color: string }> = {
  DRAFT: { bg: "#f2f0ee", color: "#8a7565" },
  SUBMITTED: { bg: "#e6e9fb", color: "#4a4fb0" },
  ADMINISTRATIVE_REVIEW: { bg: "#e6e9fb", color: "#4a4fb0" },
  SURVEY_SCHEDULED: { bg: "#e6e9fb", color: "#4a4fb0" },
  FIELD_VERIFICATION: { bg: "#e6e9fb", color: "#4a4fb0" },
  VERIFICATION: { bg: "#e6e9fb", color: "#4a4fb0" },
  TECHNICAL_REVIEW: { bg: "#e6e9fb", color: "#4a4fb0" },
  COMPLIANCE_REVIEW: { bg: "#e6e9fb", color: "#4a4fb0" },
  REPORT_GENERATION: { bg: "#e6e9fb", color: "#4a4fb0" },
  COMPLETED: { bg: "#e2f7ea", color: "#1a7a4c" },
  RETURNED: { bg: "#f2f0ee", color: "#8a7565" },
  REJECTED: { bg: "#fce8e6", color: "#ba1a1a" },
  WITHDRAWN: { bg: "#f2f0ee", color: "#8a7565" },
};
