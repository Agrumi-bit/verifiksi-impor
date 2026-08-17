export {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  ASSIGNMENT_STATUS_PILL,
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_PRIORITY_LABELS,
  type AssignmentStatusValue,
  type AssignmentPriorityValue,
} from "@/modules/verifikator-workspace/status";

export const ASSIGNMENT_PRIORITY_BADGE: Record<string, string> = {
  LOW: "bg-[#8a95a5] text-white",
  MEDIUM: "bg-[#b3650c] text-white",
  HIGH: "bg-[#c1361f] text-white",
  CRITICAL: "bg-[#c1361f] text-white",
};

/** The 4 real approval categories PM reviews — Compliance is excluded (no workspace/model exists yet). */
export const APPROVAL_CATEGORIES = ["suratTugas", "laporanSurvey", "laporanVerifikasi", "laporanTeknis"] as const;
export type ApprovalCategory = (typeof APPROVAL_CATEGORIES)[number];

export const APPROVAL_CATEGORY_META: Record<ApprovalCategory, { label: string; msi: string; source: string; scheduleType: string | null }> = {
  suratTugas: { label: "Surat Tugas", msi: "assignment_ind", source: "Customer Relation Workspace", scheduleType: null },
  laporanSurvey: { label: "Laporan Survey", msi: "travel_explore", source: "Surveyor Workspace", scheduleType: "survey" },
  laporanVerifikasi: { label: "Laporan Verifikasi", msi: "fact_check", source: "Verifikator Workspace", scheduleType: "dokumen" },
  laporanTeknis: { label: "Laporan Teknis", msi: "insights", source: "Technical Analyst Workspace", scheduleType: "technical" },
};

export const PM_APPROVAL_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type PmApprovalStatusValue = (typeof PM_APPROVAL_STATUSES)[number];

export const PM_APPROVAL_STATUS_LABELS: Record<PmApprovalStatusValue, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const PM_APPROVAL_STATUS_BADGE: Record<PmApprovalStatusValue, string> = {
  PENDING: "bg-[#fdeadd] text-[#c14a1f]",
  APPROVED: "bg-[#e6f6ec] text-[#1a9850]",
  REJECTED: "bg-[#fdeceb] text-[#e15241]",
};

export const LETTER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING: "Pending",
  APPROVED: "Approved",
};

export const LETTER_STATUS_BADGE: Record<string, string> = {
  DRAFT: "bg-[#f1efe9] text-[#8a7565]",
  PENDING: "bg-[#fdeadd] text-[#c14a1f]",
  APPROVED: "bg-[#e6f6ec] text-[#1a9850]",
};

/** Global dashboard stat cards — VKI/VIU pending counts + approved/rejected/total across all 4 categories. */
export const PM_STAT_CARDS = [
  { key: "pendingVki" as const, label: "Pending VKI", icon: "factory", color: "#c14a1f", iconBg: "#fdeadd" },
  { key: "pendingViu" as const, label: "Pending VIU", icon: "inventory", color: "#c14a1f", iconBg: "#fdeadd" },
  { key: "approved" as const, label: "Approved", icon: "check_circle", color: "#1a9850", iconBg: "#e6f6ec" },
  { key: "rejected" as const, label: "Rejected", icon: "cancel", color: "#e15241", iconBg: "#fdeceb" },
  { key: "total" as const, label: "Total Item", icon: "list_alt", color: "#4a7ed6", iconBg: "#eaf1fd" },
];
export type PmDashboardStats = { pendingVki: number; pendingViu: number; approved: number; rejected: number; total: number };
