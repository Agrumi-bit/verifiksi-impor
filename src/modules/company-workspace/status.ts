export const APPLICATION_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "ADMINISTRATIVE_REVIEW",
  "SURVEY_SCHEDULED",
  "FIELD_VERIFICATION",
  "VERIFICATION",
  "TECHNICAL_REVIEW",
  "COMPLIANCE_REVIEW",
  "REPORT_GENERATION",
  "COMPLETED",
  "RETURNED",
  "REJECTED",
  "WITHDRAWN",
] as const;

export type ApplicationStatusValue = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatusValue, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  ADMINISTRATIVE_REVIEW: "Administrative Review",
  SURVEY_SCHEDULED: "Survey Scheduled",
  FIELD_VERIFICATION: "Field Verification",
  VERIFICATION: "Verification",
  TECHNICAL_REVIEW: "Technical Review",
  COMPLIANCE_REVIEW: "Compliance Review",
  REPORT_GENERATION: "Report Generation",
  COMPLETED: "Completed",
  RETURNED: "Returned",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export const TERMINAL_STATUSES: ApplicationStatusValue[] = [
  "COMPLETED",
  "REJECTED",
  "WITHDRAWN",
];

export const ACTIVE_STATUSES: ApplicationStatusValue[] = APPLICATION_STATUSES.filter(
  (status) => !TERMINAL_STATUSES.includes(status),
);

export const REQUIRES_ACTION_STATUSES: ApplicationStatusValue[] = ["DRAFT", "RETURNED"];

export function statusBadgeVariant(
  status: ApplicationStatusValue,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "REJECTED" || status === "WITHDRAWN") return "destructive";
  if (status === "DRAFT" || status === "RETURNED") return "outline";
  return "secondary";
}
