import type { DocVerificationStatusValue } from "@/modules/verifikator-workspace/status";

export { DOC_VERIFICATION_STATUS_BADGE, type DocVerificationStatusValue } from "@/modules/verifikator-workspace/status";

/** Document-check outcomes exposed to Customer Relation — a subset of the full verifikator status set (no PENDING/NEED_REVISION here). */
export const CR_DOCUMENT_CHECK_STATUSES = ["VALID", "REJECTED", "NOT_APPLICABLE"] as const;
export type CrDocumentCheckStatus = (typeof CR_DOCUMENT_CHECK_STATUSES)[number];

/**
 * CR's own labels for the shared `DocVerificationStatusValue` enum — deliberately NOT
 * verifikator-workspace's `DOC_VERIFICATION_STATUS_LABELS` (which says "Verified"). "Verified" is
 * the verifikator's own later, authoritative decision; CR only does an administrative check, so its
 * UI says "Valid" / "Tidak Valid" to avoid implying the document has already passed verifikator review.
 */
export const CR_DOCUMENT_STATUS_LABELS: Record<DocVerificationStatusValue, string> = {
  PENDING: "Belum Diperiksa",
  VALID: "Valid",
  NEED_REVISION: "Perlu Revisi",
  REJECTED: "Tidak Valid",
  NOT_APPLICABLE: "Tidak Diperlukan",
};

export const CR_OUTCOMES = [
  "Diproses",
  "Menunggu Revisi",
  "Penugasan",
  "Dalam Penugasan",
  "Sedang Tahap Survey",
  "Laporan Survey Telah Terbit",
  "Sedang Tahap Verifikasi Dokumen",
  "Laporan Verifikasi Dokumen Telah Terbit",
  "Sedang Tahap Technical Reviewer",
  "Menunggu Approval",
  "Disetujui",
  "Ditolak",
] as const;

export type CrOutcome = (typeof CR_OUTCOMES)[number];

export const CR_OUTCOME_STYLE: Record<CrOutcome, { bg: string; color: string }> = {
  Diproses: { bg: "#fdf0d5", color: "#a3690a" },
  "Menunggu Revisi": { bg: "#fbe4de", color: "#c1361f" },
  Penugasan: { bg: "#e6effa", color: "#2a5fa3" },
  "Dalam Penugasan": { bg: "#e6effa", color: "#2a5fa3" },
  "Sedang Tahap Survey": { bg: "#e5f6ec", color: "#1f8a4c" },
  "Laporan Survey Telah Terbit": { bg: "#e5f6ec", color: "#1f8a4c" },
  "Sedang Tahap Verifikasi Dokumen": { bg: "#f1e6fd", color: "#7a3fc1" },
  "Laporan Verifikasi Dokumen Telah Terbit": { bg: "#f1e6fd", color: "#7a3fc1" },
  "Sedang Tahap Technical Reviewer": { bg: "#fdeadd", color: "#c14a1f" },
  "Menunggu Approval": { bg: "#fdf0d5", color: "#a3690a" },
  Disetujui: { bg: "#e5f6ec", color: "#1f8a4c" },
  Ditolak: { bg: "#fbe4de", color: "#c1361f" },
};

export function crOutcomeStyle(outcome: string): { bg: string; color: string } {
  return CR_OUTCOME_STYLE[outcome as CrOutcome] ?? { bg: "#f2ece5", color: "#6b5b4c" };
}

export const SCHEDULE_TYPES = ["survey", "dokumen", "technical"] as const;
export type ScheduleType = (typeof SCHEDULE_TYPES)[number];

export const SCHEDULE_TYPE_DEFS: Record<
  ScheduleType,
  { label: string; color: string; bg: string; role: "SURVEYOR" | "VERIFIKATOR" | "TECHNICAL_ANALYST" }
> = {
  survey: { label: "Survey Lokasi - Fasilitas", color: "#1f8a4c", bg: "#e5f6ec", role: "SURVEYOR" },
  dokumen: { label: "Verifikasi Dokumen", color: "#2a5fa3", bg: "#e6effa", role: "VERIFIKATOR" },
  technical: { label: "Technical", color: "#7a3fc1", bg: "#f1e6fd", role: "TECHNICAL_ANALYST" },
};

export const FACILITY_OPTIONS = ["Kantor", "Gudang", "Factory"] as const;
