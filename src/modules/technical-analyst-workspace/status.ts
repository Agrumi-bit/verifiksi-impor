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
  rencana: "Analisis Kebutuhan dan Rencana Impor",
  penyimpanan: "Analisis Penyimpanan",
  modal: "Analisis Kesesuaian Modal",
};

/** Shared by Dashboard and My Assignment stat-card grids (design's `assignmentStats`). */
export const TECHNICAL_STAT_CARDS = [
  { key: "total" as const, label: "TOTAL PERMOHONAN", icon: "folder", color: "#e0662e", iconBg: "#fdeadd" },
  { key: "belumDianalisis" as const, label: "BELUM DIANALISIS", icon: "hourglass_top", color: "#6b5b4c", iconBg: "#f2ece5" },
  { key: "sesuai" as const, label: "SESUAI", icon: "check_circle", color: "#1a9850", iconBg: "#e2f7ea" },
  { key: "tidakSesuai" as const, label: "TIDAK SESUAI", icon: "warning", color: "#c1361f", iconBg: "#fbe4de" },
];
export type TechnicalStatCounts = { total: number; belumDianalisis: number; sesuai: number; tidakSesuai: number };
