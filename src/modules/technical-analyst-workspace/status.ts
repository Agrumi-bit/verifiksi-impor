import type { AssignmentPriorityValue } from "@/modules/surveyor-workspace/status";

export {
  ASSIGNMENT_STATUSES,
  ASSIGNMENT_STATUS_LABELS,
  assignmentStatusBadgeVariant,
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_PRIORITY_LABELS,
  SCHEDULE_STATUS_META,
  mapToScheduleStatus,
  ASSIGNMENT_STAT_CARDS,
  ASSIGNMENT_STATUS_PILL,
  type AssignmentStatusValue,
  type AssignmentPriorityValue,
  type ScheduleStatusValue,
  type ValidationDecisionValue,
  VALIDATION_DECISION_LABELS,
} from "@/modules/verifikator-workspace/status";

export const ASSIGNMENT_PRIORITY_BADGE: Record<AssignmentPriorityValue, string> = {
  LOW: "bg-[#8a95a5] text-white",
  MEDIUM: "bg-[#b3650c] text-white",
  HIGH: "bg-[#c1361f] text-white",
  CRITICAL: "bg-[#c1361f] text-white",
};

/** Per-module Sesuai/Tidak Sesuai verdict — distinct from `ValidationDecisionValue` (the final Approve/Return on the whole assignment). */
export const TECHNICAL_MODULE_STATUSES = ["PENDING", "SESUAI", "TIDAK_SESUAI"] as const;
export type TechnicalModuleStatusValue = (typeof TECHNICAL_MODULE_STATUSES)[number];

export const TECHNICAL_MODULE_STATUS_LABELS: Record<TechnicalModuleStatusValue, string> = {
  PENDING: "Belum Dianalisis",
  SESUAI: "Sesuai",
  TIDAK_SESUAI: "Tidak Sesuai",
};

export const TECHNICAL_MODULE_STATUS_BADGE: Record<TechnicalModuleStatusValue, string> = {
  PENDING: "bg-[#f2ece5] text-[#6b5b4c]",
  SESUAI: "bg-[#e2f7ea] text-[#1a9850]",
  TIDAK_SESUAI: "bg-[#fbe4de] text-[#c1361f]",
};

export const VKI_MODULE_KEYS = ["listrik", "kapasitas", "bahanbaku"] as const;
export const VIU_MODULE_KEYS = ["rencana", "penyimpanan", "modal"] as const;
export type TechnicalModuleKey = (typeof VKI_MODULE_KEYS)[number] | (typeof VIU_MODULE_KEYS)[number];

export const TECHNICAL_MODULE_LABELS: Record<TechnicalModuleKey, string> = {
  listrik: "Analisis Kebutuhan dan Pemakaian Energi Listrik",
  kapasitas: "Kapasitas Produksi",
  bahanbaku: "Kapasitas Kebutuhan Bahan Baku",
  // VIU-industri's 3 required analyses (Jenis Analisis / Tujuan table): rencana checks the
  // requested HS Code/volume against the mitra industri's own LHVKI need; penyimpanan and modal
  // check the import plan against API-U's own storage capacity and capital.
  rencana: "Analisis Kesesuaian HS Code dan Volume Permohonan API-U terhadap LHVKI Mitra Industri",
  penyimpanan: "Analisis Pengajuan Impor vs Kapasitas Gudang API-U",
  modal: "Analisis Pengajuan Impor vs Kepemilikan Modal Perusahaan Importir Umum (API-U)",
};

/** Short form of `TECHNICAL_MODULE_LABELS` for the module tab pills — the full formal titles
 * above are meant for the module's own header and read-only summaries, not a `flex-wrap` row of
 * buttons. */
export const TECHNICAL_MODULE_NAV_LABELS: Record<TechnicalModuleKey, string> = {
  listrik: "Energi Listrik",
  kapasitas: "Kapasitas Produksi",
  bahanbaku: "Kebutuhan Bahan Baku",
  rencana: "HS Code & Volume vs LHVKI",
  penyimpanan: "Kapasitas Gudang API-U",
  modal: "Kepemilikan Modal API-U",
};

/** Shared by Dashboard and My Assignment stat-card grids (design's `assignmentStats`). */
export const TECHNICAL_STAT_CARDS = [
  { key: "total" as const, label: "TOTAL PERMOHONAN", icon: "folder", color: "#e0662e", iconBg: "#fdeadd" },
  { key: "belumDianalisis" as const, label: "BELUM DIANALISIS", icon: "hourglass_top", color: "#6b5b4c", iconBg: "#f2ece5" },
  { key: "sesuai" as const, label: "SESUAI", icon: "check_circle", color: "#1a9850", iconBg: "#e2f7ea" },
  { key: "tidakSesuai" as const, label: "TIDAK SESUAI", icon: "warning", color: "#c1361f", iconBg: "#fbe4de" },
];
export type TechnicalStatCounts = { total: number; belumDianalisis: number; sesuai: number; tidakSesuai: number };
