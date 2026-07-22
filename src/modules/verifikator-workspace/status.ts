export {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  assignmentStatusBadgeVariant,
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_PRIORITY_LABELS,
  LOCATION_VISIT_STATUSES,
  LOCATION_VISIT_STATUS_LABELS,
  LOCATION_TYPE_LABELS,
  LOCATION_TYPE_ICON,
  type AssignmentStatusValue,
  type AssignmentPriorityValue,
  type LocationVisitStatusValue,
} from "@/modules/surveyor-workspace/status";

export const DOC_VERIFICATION_STATUSES = ["PENDING", "VALID", "NEED_REVISION", "REJECTED"] as const;
export type DocVerificationStatusValue = (typeof DOC_VERIFICATION_STATUSES)[number];

export const DOC_VERIFICATION_STATUS_LABELS: Record<DocVerificationStatusValue, string> = {
  PENDING: "Belum Diperiksa",
  VALID: "Valid",
  NEED_REVISION: "Need Revision",
  REJECTED: "Rejected",
};

export const DOC_VERIFICATION_STATUS_BADGE: Record<DocVerificationStatusValue, string> = {
  PENDING: "bg-[#eef0f6] text-[#5b6478]",
  VALID: "bg-[#e1f3ea] text-[#0f7a4d]",
  NEED_REVISION: "bg-[#fdedd6] text-[#b3650c]",
  REJECTED: "bg-[#fbe4e4] text-[#c1352b]",
};

export const PRODUCT_VERIFICATION_STATUSES = ["PENDING", "VERIFIED", "NEED_REVISION", "REJECTED"] as const;
export type ProductVerificationStatusValue = (typeof PRODUCT_VERIFICATION_STATUSES)[number];

export const PRODUCT_VERIFICATION_STATUS_LABELS: Record<ProductVerificationStatusValue, string> = {
  PENDING: "Belum Diperiksa",
  VERIFIED: "Verified",
  NEED_REVISION: "Need Revision",
  REJECTED: "Rejected",
};

export const PRODUCT_VERIFICATION_STATUS_BADGE: Record<ProductVerificationStatusValue, string> = {
  PENDING: "bg-[#eef0f6] text-[#5b6478]",
  VERIFIED: "bg-[#e1f3ea] text-[#0f7a4d]",
  NEED_REVISION: "bg-[#fdedd6] text-[#b3650c]",
  REJECTED: "bg-[#fbe4e4] text-[#c1352b]",
};

export type ValidationDecisionValue = "COMPLETED" | "RETURNED";

export const VALIDATION_DECISION_LABELS: Record<ValidationDecisionValue, string> = {
  COMPLETED: "Approved",
  RETURNED: "Returned for Revision",
};
