import type { ComplianceScheme } from "./scheme";
import type { WorkspaceKey } from "./workspace-status";

/**
 * The requirement matrix the Compliance Workspace traces, per scheme (VIU Konsumsi: docs/handoff
 * Compliance.dc.html REQS; VKI: the chapters of the Verifikator's VKI report plus the Technical
 * Analyst's modules). `regulation` is a neutral label unless the handoff names the rule ("jangan
 * nomor pasal karangan"). A finding (ComplianceIssue.requirementKey) points at one of these keys.
 */
type Requirement = { key: string; label: string; type: string; regulation: string; source: WorkspaceKey; step: number };

const KONSUMSI_REQUIREMENTS = [
  { key: "npwp", label: "NPWP Perusahaan", type: "Legalitas", regulation: "Requirement Matrix VIU – Legalitas", source: "VF", step: 2 },
  { key: "nib", label: "NIB & API-U", type: "Legalitas", regulation: "Requirement Matrix VIU – Legalitas", source: "VF", step: 2 },
  { key: "kbli", label: "KBLI Perusahaan", type: "Legalitas", regulation: "Requirement Matrix VIU – Legalitas", source: "VF", step: 2 },
  { key: "kantor", label: "Lokasi Kantor", type: "Lokasi", regulation: "Requirement Matrix VIU – Lokasi", source: "SV", step: 3 },
  { key: "gudang", label: "Lokasi Gudang", type: "Lokasi", regulation: "Requirement Matrix VIU – Lokasi", source: "SV", step: 3 },
  { key: "merek", label: "Merek & Hubungan Importir", type: "Merek", regulation: "Pasal 37 (rujukan tahap Merek)", source: "VF", step: 4 },
  { key: "hs", label: "HS Code / Rencana Impor", type: "Produk", regulation: "Requirement Matrix VIU – Rencana Impor", source: "VF", step: 5 },
  { key: "stok", label: "Stok Terkini", type: "Produk", regulation: "Requirement Matrix VIU – Stok", source: "VF", step: 6 },
  { key: "uji", label: "Hasil Uji Mutu", type: "Mutu", regulation: "Requirement Matrix VIU – Uji Mutu", source: "VF", step: 7 },
  { key: "label", label: "Pernyataan Label Bahasa Indonesia", type: "Label", regulation: "Lampiran II huruf H", source: "VF", step: 8 },
  { key: "modal", label: "Modal Kerja", type: "Keuangan", regulation: "Lampiran II huruf I", source: "VF", step: 9 },
  { key: "approval", label: "Approval", type: "Approval", regulation: "SOP LPV – Final Review", source: "PM", step: 10 },
] as const satisfies readonly Requirement[];

const VKI_REQUIREMENTS = [
  { key: "nib", label: "NIB & Perizinan Berusaha", type: "Legalitas", regulation: "Pasal 30 ayat (2) huruf b angka 2", source: "VF", step: 2 },
  { key: "kbli", label: "KBLI Perusahaan", type: "Legalitas", regulation: "Pasal 30 ayat (2) huruf b angka 2", source: "VF", step: 2 },
  { key: "npwp", label: "NPWP Perusahaan", type: "Perpajakan", regulation: "Pasal 30 ayat (2) huruf b angka 1", source: "VF", step: 3 },
  { key: "pajak", label: "Bukti Pajak / SKT", type: "Perpajakan", regulation: "Pasal 30 ayat (2) huruf b angka 7", source: "VF", step: 3 },
  { key: "kantor", label: "Lokasi Kantor", type: "Lokasi", regulation: "Pasal 31 ayat (2) huruf a", source: "SV", step: 4 },
  { key: "pabrik", label: "Lokasi Pabrik", type: "Lokasi", regulation: "Pasal 31 ayat (2) huruf a", source: "SV", step: 4 },
  { key: "gudang", label: "Lokasi Gudang", type: "Lokasi", regulation: "Pasal 30 ayat (2) huruf b angka 6 jo. ayat (3)", source: "SV", step: 4 },
  { key: "produk", label: "Produk, Bahan Baku & Rasio Konversi", type: "Produk", regulation: "Pasal 30 ayat (2) huruf a angka 1 sampai dengan angka 6", source: "VF", step: 5 },
  { key: "produksi", label: "Alur Proses Produksi", type: "Alur Proses Produksi", regulation: "Pasal 30 ayat (2) huruf b angka 5", source: "VF", step: 6 },
  { key: "listrik", label: "Pemakaian Listrik", type: "Pemakaian Listrik", regulation: "Pasal 30 ayat (2) huruf b angka 8", source: "VF", step: 7 },
  { key: "mesin", label: "Data, Kapasitas & Daya Mesin", type: "Data Mesin", regulation: "Pasal 30 ayat (2) huruf a angka 1 dan huruf b angka 4", source: "VF", step: 8 },
  { key: "jumlahProduksi", label: "Kapasitas & Jumlah Produksi", type: "Kapasitas Produksi", regulation: "Pasal 30 ayat (2) huruf a angka 2 dan 4; Pasal 32 ayat (3) huruf c", source: "VF", step: 9 },
  { key: "kebutuhanBahanBaku", label: "Kebutuhan Bahan Baku", type: "Bahan Baku", regulation: "Pasal 30 ayat (2) huruf a angka 2, 4 dan 6", source: "VF", step: 10 },
  { key: "penjualan", label: "Penjualan Dalam Negeri & Ekspor", type: "Penjualan", regulation: "Pasal 30 ayat (2) huruf a angka 5", source: "VF", step: 11 },
  { key: "tenaga", label: "Tenaga Kerja", type: "Tenaga Kerja", regulation: "Pasal 30 ayat (2) huruf b angka 3", source: "VF", step: 12 },
  { key: "pernyataan", label: "Surat Pernyataan", type: "Surat Pernyataan", regulation: "Pasal 30 ayat (2) huruf b angka 6; Pasal 8 ayat (2) huruf a angka 2", source: "VF", step: 13 },
  { key: "energi", label: "Analisis Kebutuhan dan Pemakaian Energi Listrik", type: "Analisis Teknis", regulation: "Pasal 30 ayat (2) huruf b angka 8; Pasal 31 ayat (2) huruf b", source: "TA", step: 14 },
  { key: "kapasitas", label: "Analisis Kapasitas Produksi", type: "Analisis Teknis", regulation: "Pasal 31 ayat (2) huruf b; Pasal 32 ayat (3) huruf c dan d", source: "TA", step: 14 },
  { key: "bahanbaku", label: "Analisis Kapasitas Kebutuhan Bahan Baku", type: "Analisis Teknis", regulation: "Pasal 31 ayat (2) huruf b; Pasal 32 ayat (3) huruf e dan f", source: "TA", step: 14 },
  { key: "approval", label: "Approval", type: "Approval", regulation: "SOP LPV – Final Review", source: "PM", step: 15 },
] as const satisfies readonly Requirement[];

const REQUIREMENTS_BY_SCHEME = { konsumsi: KONSUMSI_REQUIREMENTS, vki: VKI_REQUIREMENTS } as const;

/** VIU Konsumsi's requirements (kept for the views that only know that scheme). */
export const REQUIREMENTS = KONSUMSI_REQUIREMENTS;

export type RequirementKey = (typeof KONSUMSI_REQUIREMENTS)[number]["key"] | (typeof VKI_REQUIREMENTS)[number]["key"];

/** Label of a requirement key in either scheme (VIU Konsumsi's wording wins where both use the key). */
export const REQUIREMENT_LABELS: Record<string, string> = Object.fromEntries(
  [...VKI_REQUIREMENTS, ...KONSUMSI_REQUIREMENTS].map((requirement) => [requirement.key, requirement.label]),
);

/**
 * Case-specific applicability. VKI: Lokasi Gudang is only a requirement when the application declares a
 * gudang (Pasal 30 ayat (2) huruf b angka 6 jo. ayat (3)); without one the row is left out of the matrix
 * and the score. VIU Konsumsi always keeps it — an importer without a gudang is a gap to flag, not hide.
 */
export type RequirementScope = { hasGudang?: boolean };

function applies(scheme: ComplianceScheme, key: string, scope: RequirementScope | undefined): boolean {
  return !(scheme === "vki" && key === "gudang" && scope?.hasGudang === false);
}

export function requirementsOf(scheme: ComplianceScheme = "konsumsi", scope?: RequirementScope): readonly (Requirement & { key: RequirementKey })[] {
  return REQUIREMENTS_BY_SCHEME[scheme].filter((requirement) => applies(scheme, requirement.key, scope));
}

/**
 * How many requirements each workspace hands over, for the compliance score. VIU Konsumsi keeps the
 * handoff's weights (42 = 40 + 2 administrative; no Technical Analyst, so its 6 product-plan
 * requirements are the Verifikator's); VKI counts one per row of its matrix.
 */
export function requirementWeights(scheme: ComplianceScheme = "konsumsi", scope?: RequirementScope): Partial<Record<WorkspaceKey, number>> {
  if (scheme === "konsumsi") return { CR: 6, SV: 6, VF: 26, PM: 2 };
  const weights: Partial<Record<WorkspaceKey, number>> = {};
  for (const requirement of requirementsOf("vki", scope)) weights[requirement.source] = (weights[requirement.source] ?? 0) + 1;
  return weights;
}

type CaseStepDef = { num: number; label: string; source: WorkspaceKey };

const KONSUMSI_STEPS = [
  { num: 1, label: "Ringkasan", source: "CR" },
  { num: 2, label: "Perusahaan & Legalitas", source: "VF" },
  { num: 3, label: "Lokasi", source: "SV" },
  { num: 4, label: "Merek & Hubungan Importir", source: "VF" },
  { num: 5, label: "Rencana Impor", source: "VF" },
  { num: 6, label: "Stok Terkini", source: "VF" },
  { num: 7, label: "Uji Mutu", source: "VF" },
  { num: 8, label: "Pernyataan Label", source: "VF" },
  { num: 9, label: "Modal Kerja", source: "VF" },
  { num: 10, label: "Review & Approval", source: "PM" },
  { num: 11, label: "LHVIU", source: "PM" },
] as const satisfies readonly CaseStepDef[];

const VKI_STEPS = [
  { num: 1, label: "Ringkasan", source: "CR" },
  { num: 2, label: "Perusahaan & Legalitas", source: "VF" },
  { num: 3, label: "Perpajakan", source: "VF" },
  { num: 4, label: "Lokasi", source: "SV" },
  { num: 5, label: "Produk", source: "VF" },
  { num: 6, label: "Alur Proses Produksi", source: "VF" },
  { num: 7, label: "Pemakaian Listrik", source: "VF" },
  { num: 8, label: "Data Mesin", source: "VF" },
  { num: 9, label: "Kapasitas Produksi", source: "VF" },
  { num: 10, label: "Kebutuhan Bahan Baku", source: "VF" },
  { num: 11, label: "Penjualan Dalam Negeri & Ekspor", source: "VF" },
  { num: 12, label: "Tenaga Kerja", source: "VF" },
  { num: 13, label: "Surat Pernyataan", source: "VF" },
  { num: 14, label: "Analisis Teknis", source: "TA" },
  { num: 15, label: "Review & Approval", source: "PM" },
  { num: 16, label: "LHVKI", source: "PM" },
] as const satisfies readonly CaseStepDef[];

/** VIU Konsumsi's 11 stages (kept for the views that only know that scheme). */
export const CASE_STEPS = KONSUMSI_STEPS;
export const CASE_STEP_COUNT = CASE_STEPS.length;

/** The stages of a case, each read from one source workspace. */
export function caseStepsOf(scheme: ComplianceScheme = "konsumsi"): readonly CaseStepDef[] {
  return scheme === "vki" ? VKI_STEPS : KONSUMSI_STEPS;
}

/** The stage a requirement is traced on (1 — Ringkasan — for an unknown key). */
export function stepOfRequirement(key: string, scheme: ComplianceScheme = "konsumsi"): number {
  return requirementsOf(scheme).find((requirement) => requirement.key === key)?.step ?? 1;
}

export function requirementsOfStep(step: number, scheme: ComplianceScheme = "konsumsi", scope?: RequirementScope): RequirementKey[] {
  return requirementsOf(scheme, scope).filter((requirement) => requirement.step === step).map((requirement) => requirement.key);
}
