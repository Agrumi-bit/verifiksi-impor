export const ASSIGNMENT_STATUSES = [
  "ASSIGNED",
  "SCHEDULED",
  "IN_PROGRESS",
  "SUBMITTED",
  "RETURNED",
  "COMPLETED",
] as const;
export type AssignmentStatusValue = (typeof ASSIGNMENT_STATUSES)[number];

export const ASSIGNMENT_STATUS_LABELS: Record<AssignmentStatusValue, string> = {
  ASSIGNED: "Assigned",
  SCHEDULED: "Scheduled",
  IN_PROGRESS: "In Progress",
  SUBMITTED: "Submitted",
  RETURNED: "Returned",
  COMPLETED: "Completed",
};

export function assignmentStatusBadgeVariant(
  status: AssignmentStatusValue,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "COMPLETED") return "default";
  if (status === "RETURNED") return "destructive";
  if (status === "ASSIGNED") return "outline";
  return "secondary";
}

export const ASSIGNMENT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type AssignmentPriorityValue = (typeof ASSIGNMENT_PRIORITIES)[number];

export const ASSIGNMENT_PRIORITY_LABELS: Record<AssignmentPriorityValue, string> = {
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const LOCATION_VISIT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "COMPLETED"] as const;
export type LocationVisitStatusValue = (typeof LOCATION_VISIT_STATUSES)[number];

export const LOCATION_VISIT_STATUS_LABELS: Record<LocationVisitStatusValue, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "On Progress",
  COMPLETED: "Completed",
};

export const LOCATION_TYPE_LABELS: Record<string, string> = {
  KANTOR: "Main Office (Kantor)",
  GUDANG: "Warehouse (Gudang)",
  PABRIK: "Production Floor (Pabrik)",
};

export const LOCATION_TYPE_ICON: Record<string, string> = {
  KANTOR: "apartment",
  GUDANG: "inventory_2",
  PABRIK: "precision_manufacturing",
};

export type ScheduleStatusValue = "SCHEDULED" | "ON_PROGRESS" | "COMPLETED";

export const SCHEDULE_STATUS_META: Record<ScheduleStatusValue, { label: string; bg: string; icon: string }> = {
  SCHEDULED: { label: "Scheduled", bg: "#5f5e5e", icon: "event_available" },
  ON_PROGRESS: { label: "On Progress", bg: "#e0662e", icon: "schedule" },
  COMPLETED: { label: "Completed", bg: "#1a9850", icon: "check_circle" },
};

export function mapToScheduleStatus(status: AssignmentStatusValue): ScheduleStatusValue {
  if (status === "SUBMITTED" || status === "COMPLETED") return "COMPLETED";
  if (status === "IN_PROGRESS" || status === "RETURNED") return "ON_PROGRESS";
  return "SCHEDULED";
}

export const SURVEY_REPORT_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "RETURNED",
  "APPROVED",
] as const;
export type SurveyReportStatusValue = (typeof SURVEY_REPORT_STATUSES)[number];

export const SURVEY_REPORT_STATUS_LABELS: Record<SurveyReportStatusValue, string> = {
  DRAFT: "Draft",
  SUBMITTED: "Submitted",
  RETURNED: "Returned",
  APPROVED: "Approved",
};

export function surveyReportStatusBadgeVariant(
  status: SurveyReportStatusValue,
): "default" | "secondary" | "destructive" | "outline" {
  if (status === "APPROVED") return "default";
  if (status === "RETURNED") return "destructive";
  if (status === "DRAFT") return "outline";
  return "secondary";
}
