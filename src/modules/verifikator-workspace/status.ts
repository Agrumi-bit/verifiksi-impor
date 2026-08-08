import type { AssignmentPriorityValue, AssignmentStatusValue } from "@/modules/surveyor-workspace/status";

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
  SCHEDULE_STATUS_META,
  mapToScheduleStatus,
  type AssignmentStatusValue,
  type AssignmentPriorityValue,
  type LocationVisitStatusValue,
  type ScheduleStatusValue,
} from "@/modules/surveyor-workspace/status";

export const DOC_VERIFICATION_STATUSES = ["PENDING", "VALID", "NEED_REVISION", "REJECTED", "NOT_APPLICABLE"] as const;
export type DocVerificationStatusValue = (typeof DOC_VERIFICATION_STATUSES)[number];

export const DOC_VERIFICATION_STATUS_LABELS: Record<DocVerificationStatusValue, string> = {
  PENDING: "Belum Diperiksa",
  VALID: "Verified",
  NEED_REVISION: "Need Revision",
  REJECTED: "Reject",
  NOT_APPLICABLE: "N/A",
};

export const DOC_VERIFICATION_STATUS_BADGE: Record<DocVerificationStatusValue, string> = {
  PENDING: "bg-[#eef0f6] text-[#5b6478]",
  VALID: "bg-[#e1f3ea] text-[#0f7a4d]",
  NEED_REVISION: "bg-[#fdedd6] text-[#b3650c]",
  REJECTED: "bg-[#fbe4e4] text-[#c1352b]",
  NOT_APPLICABLE: "bg-[#ede9fe] text-[#6d28d9]",
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

export const MACHINE_VERIFICATION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export type MachineVerificationStatusValue = (typeof MACHINE_VERIFICATION_STATUSES)[number];

export const MACHINE_VERIFICATION_STATUS_LABELS: Record<MachineVerificationStatusValue, string> = {
  PENDING: "Belum Diperiksa",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const MACHINE_VERIFICATION_STATUS_BADGE: Record<MachineVerificationStatusValue, string> = {
  PENDING: "bg-[#f2ece5] text-[#8a7565]",
  APPROVED: "bg-[#e2f7ea] text-[#1a9850]",
  REJECTED: "bg-[#fbe4de] text-[#c1352b]",
};

// MEMENUHI/TIDAK_MEMENUHI are for whole-section conclusions (e.g. "Jumlah Produksi Periode
// Satu Tahun Sebelumnya" as a category), stored under a synthetic `summary:<section>` key in
// the same `productionQtyVerifications` map — distinct from SESUAI/TIDAK_SESUAI, which are
// per-row (per product) data-match decisions keyed `<section>:<productId>`.
export const PRODUCTION_QTY_VERIFICATION_STATUSES = ["PENDING", "SESUAI", "TIDAK_SESUAI", "MEMENUHI", "TIDAK_MEMENUHI"] as const;
export type ProductionQtyVerificationStatusValue = (typeof PRODUCTION_QTY_VERIFICATION_STATUSES)[number];

export const PRODUCTION_QTY_VERIFICATION_STATUS_LABELS: Record<ProductionQtyVerificationStatusValue, string> = {
  PENDING: "Belum Diperiksa",
  SESUAI: "Sesuai",
  TIDAK_SESUAI: "Tidak Sesuai",
  MEMENUHI: "Memenuhi",
  TIDAK_MEMENUHI: "Tidak Memenuhi",
};

export const PRODUCTION_QTY_VERIFICATION_STATUS_BADGE: Record<ProductionQtyVerificationStatusValue, string> = {
  PENDING: "bg-[#f2ece5] text-[#8a7565]",
  SESUAI: "bg-[#e2f7ea] text-[#1a9850]",
  TIDAK_SESUAI: "bg-[#fbe4de] text-[#c1352b]",
  MEMENUHI: "bg-[#e2f7ea] text-[#1a9850]",
  TIDAK_MEMENUHI: "bg-[#fbe4de] text-[#c1352b]",
};

/** Synthetic key for the whole-"sebelumnya"-section conclusion, stored in the same map as per-row decisions. */
export const PRODUCTION_QTY_SEBELUMNYA_SUMMARY_KEY = "summary:sebelumnya";
/** Synthetic key for the whole-section conclusion on "Penggunaan Bahan Baku/Penolong Periode Satu Tahun Sebelumnya". */
export const PRODUCTION_QTY_PENGGUNAAN_SUMMARY_KEY = "summary:penggunaan";
/** Synthetic key for the whole-section conclusion on "Jumlah Stok Terkini Bahan Baku/Penolong". */
export const PRODUCTION_QTY_STOK_SUMMARY_KEY = "summary:stok";
/** Synthetic key for the whole-section conclusion on "Konversi Penggunaan Bahan Baku/Penolong per Jenis Produk". */
export const PRODUCTION_QTY_KONVERSI_SUMMARY_KEY = "summary:konversi";
/** Synthetic key for the whole-"rencana"-section conclusion (Kapasitas Jumlah Rencana Produksi Periode Tahun Berikutnya). */
export const PRODUCTION_QTY_RENCANA_SUMMARY_KEY = "summary:rencana";
/** Synthetic key for the whole-section conclusion on "Rencana Kebutuhan Bahan Baku/Penolong 1 Tahun ke Depan". */
export const PRODUCTION_QTY_RENCANA_KEBUTUHAN_SUMMARY_KEY = "summary:rencana-kebutuhan";
/** Synthetic key for the whole-section conclusion on "Penjualan Dalam Negeri & Ekspor". */
export const PRODUCTION_QTY_PENJUALAN_SUMMARY_KEY = "summary:penjualan";

/**
 * Per-row decision key for the Penggunaan/Stok/Rencana-Kebutuhan raw-material tables — same row
 * can carry an independent SESUAI/TIDAK_SESUAI verdict under each topic, so the topic is part of
 * the key (distinct from the `summary:<topic>` whole-section conclusion keys above).
 */
export function rawMaterialUsageRowKey(topic: "penggunaan" | "stok" | "rencana-kebutuhan", rowId: string): string {
  return `${topic}-row:${rowId}`;
}

export const ASSIGNMENT_PRIORITY_BADGE: Record<AssignmentPriorityValue, string> = {
  LOW: "bg-[#8a95a5] text-white",
  MEDIUM: "bg-[#b3650c] text-white",
  HIGH: "bg-[#c1361f] text-white",
  CRITICAL: "bg-[#c1361f] text-white",
};

export type ValidationDecisionValue = "COMPLETED" | "RETURNED";

export const VALIDATION_DECISION_LABELS: Record<ValidationDecisionValue, string> = {
  COMPLETED: "Approved",
  RETURNED: "Returned for Revision",
};

export type AssignmentStatCard = {
  key: "total" | "waiting" | "inReview" | "completed";
  label: string;
  icon: string;
  color: string;
  iconBg: string;
};

/** Shared Dashboard + My Assignment stat row — see `getAssignmentStatCounts`. */
export const ASSIGNMENT_STAT_CARDS: AssignmentStatCard[] = [
  { key: "total", label: "TOTAL ASSIGNMENT", icon: "assignment", color: "#2b2420", iconBg: "#f5ebe1" },
  { key: "waiting", label: "MENUNGGU REVIEW", icon: "hourglass_empty", color: "#d9531f", iconBg: "#fdeadd" },
  { key: "inReview", label: "SEDANG DIREVIEW", icon: "rate_review", color: "#2f6fe0", iconBg: "#f2f0ee" },
  { key: "completed", label: "SELESAI", icon: "check_circle", color: "#1a9850", iconBg: "#e2f7ea" },
];

/**
 * Per-status pill colors reused across Dashboard, My Schedule (list rows,
 * calendar chips, legend) and Reports — one status-color system app-wide
 * instead of each view inventing its own.
 */
export const ASSIGNMENT_STATUS_PILL: Record<AssignmentStatusValue, { bg: string; color: string }> = {
  ASSIGNED: { bg: "#f2f0ee", color: "#594138" },
  SCHEDULED: { bg: "#f2f0ee", color: "#594138" },
  IN_PROGRESS: { bg: "#ffe9e2", color: "#e0662e" },
  SUBMITTED: { bg: "#e6effa", color: "#2f6fe0" },
  RETURNED: { bg: "#fbe4de", color: "#c1361f" },
  COMPLETED: { bg: "#e2f7ea", color: "#1a9850" },
};
