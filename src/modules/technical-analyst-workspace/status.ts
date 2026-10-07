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
/** Legacy VIU set (= VIU Bahan Baku Industri) — the fallback for a VIU application whose import types are unknown. */
export const VIU_MODULE_KEYS = ["rencana", "penyimpanan", "modal"] as const;
/** Every module any scheme can use — the PATCH endpoint accepts these. */
export const ALL_TECHNICAL_MODULE_KEYS = [
  "listrik",
  "kapasitas",
  "bahanbaku",
  "rencana",
  "kebutuhanNonIndustri",
  "stokKonsumsi",
  "penyimpanan",
  "modal",
] as const;
export type TechnicalModuleKey = (typeof ALL_TECHNICAL_MODULE_KEYS)[number];

/**
 * Technical-analysis modules per scheme (Permenperin 27/2025):
 * - VKI (Ps 31 ayat (2) huruf b, Ps 32 ayat (3) huruf c-f): energi listrik, kapasitas produksi, kebutuhan bahan baku.
 * - VIU Bahan Baku Industri (Ps 37 ayat (2) huruf a, Ps 39 ayat (3) huruf d-e): HS Code & volume vs LHVKI mitra industri.
 * - VIU Bahan Baku Non Industri (Ps 37 ayat (2) huruf b, Ps 39 ayat (4) huruf d): kebutuhan mitra non industri (kontrak) vs rencana impor.
 * - VIU Barang Konsumsi (Ps 37 ayat (2) huruf c, Ps 39 ayat (5) huruf d-f): stok terkini & rencana impor per HS.
 * Every VIU scheme also gets Kapasitas Gudang and Kepemilikan Modal API-U — company-level, so a VIU application
 * with several import types gets them once, after its scheme-specific modules.
 */
const VIU_IMPORT_TYPE_MODULE: Record<string, TechnicalModuleKey> = {
  BAHAN_BAKU_INDUSTRI: "rencana",
  BAHAN_BAKU_NON_INDUSTRI: "kebutuhanNonIndustri",
  BARANG_KONSUMSI: "stokKonsumsi",
};
const VIU_IMPORT_TYPE_ORDER = ["BAHAN_BAKU_INDUSTRI", "BAHAN_BAKU_NON_INDUSTRI", "BARANG_KONSUMSI"] as const;

export function technicalModuleKeysFor(
  verificationType: string | null | undefined,
  importTypes?: readonly string[] | null,
): readonly TechnicalModuleKey[] {
  if (verificationType !== "VIU") return VKI_MODULE_KEYS;
  const selected = new Set(importTypes ?? []);
  const schemeModules = VIU_IMPORT_TYPE_ORDER.filter((t) => selected.has(t)).map((t) => VIU_IMPORT_TYPE_MODULE[t]);
  if (schemeModules.length === 0) return VIU_MODULE_KEYS;
  return [...schemeModules, "penyimpanan", "modal"];
}

export const TECHNICAL_MODULE_LABELS: Record<TechnicalModuleKey, string> = {
  listrik: "Analisis Kebutuhan dan Pemakaian Energi Listrik",
  kapasitas: "Kapasitas Produksi",
  bahanbaku: "Kapasitas Kebutuhan Bahan Baku",
  // VIU-industri's 3 required analyses (Jenis Analisis / Tujuan table): rencana checks the
  // requested HS Code/volume against the mitra industri's own LHVKI need; penyimpanan and modal
  // check the import plan against API-U's own storage capacity and capital.
  rencana: "Analisis Kesesuaian HS Code dan Volume Permohonan API-U terhadap LHVKI Mitra Industri",
  kebutuhanNonIndustri: "Analisis Kesesuaian Rencana Impor API-U terhadap Kebutuhan Perusahaan Non Industri Mitra",
  stokKonsumsi: "Analisis Stok Terkini dan Rencana Impor Produk Tekstil Barang Konsumsi per Pos Tarif/HS",
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
  kebutuhanNonIndustri: "Kebutuhan Mitra Non Industri",
  stokKonsumsi: "Stok & Rencana Impor per HS",
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
