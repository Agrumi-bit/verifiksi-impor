import type { WorkspaceKey } from "./workspace-status";

/**
 * The VIU Konsumsi requirement matrix the Compliance Workspace traces (docs/handoff Compliance.dc.html
 * REQS). `regulation` is a neutral label unless the handoff names the rule ("jangan nomor pasal
 * karangan"). A finding (ComplianceIssue.requirementKey) points at one of these keys.
 */
export const REQUIREMENTS = [
  { key: "npwp", label: "NPWP Perusahaan", type: "Legalitas", regulation: "Requirement Matrix VIU – Legalitas", source: "VF", step: 2 },
  { key: "nib", label: "NIB & API-U", type: "Legalitas", regulation: "Requirement Matrix VIU – Legalitas", source: "VF", step: 2 },
  { key: "kbli", label: "KBLI Perusahaan", type: "Legalitas", regulation: "Requirement Matrix VIU – Legalitas", source: "VF", step: 2 },
  { key: "kantor", label: "Lokasi Kantor", type: "Lokasi", regulation: "Requirement Matrix VIU – Lokasi", source: "SV", step: 3 },
  { key: "gudang", label: "Lokasi Gudang", type: "Lokasi", regulation: "Requirement Matrix VIU – Lokasi", source: "SV", step: 3 },
  { key: "merek", label: "Merek & Hubungan Importir", type: "Merek", regulation: "Pasal 37 (rujukan tahap Merek)", source: "VF", step: 4 },
  { key: "hs", label: "HS Code / Rencana Impor", type: "Produk", regulation: "Requirement Matrix VIU – Rencana Impor", source: "TA", step: 5 },
  { key: "stok", label: "Stok Terkini", type: "Produk", regulation: "Requirement Matrix VIU – Stok", source: "VF", step: 6 },
  { key: "uji", label: "Hasil Uji Mutu", type: "Mutu", regulation: "Requirement Matrix VIU – Uji Mutu", source: "VF", step: 7 },
  { key: "label", label: "Pernyataan Label Bahasa Indonesia", type: "Label", regulation: "Lampiran II huruf H", source: "VF", step: 8 },
  { key: "modal", label: "Modal Kerja", type: "Keuangan", regulation: "Lampiran II huruf I", source: "VF", step: 9 },
  { key: "approval", label: "Approval", type: "Approval", regulation: "SOP LPV – Final Review", source: "PM", step: 10 },
] as const satisfies readonly { key: string; label: string; type: string; regulation: string; source: WorkspaceKey; step: number }[];

export type RequirementKey = (typeof REQUIREMENTS)[number]["key"];

/** The 11 stages of a case, each read from one source workspace. */
export const CASE_STEPS = [
  { num: 1, label: "Ringkasan", source: "CR" },
  { num: 2, label: "Perusahaan & Legalitas", source: "VF" },
  { num: 3, label: "Lokasi", source: "SV" },
  { num: 4, label: "Merek & Hubungan Importir", source: "VF" },
  { num: 5, label: "Rencana Impor", source: "TA" },
  { num: 6, label: "Stok Terkini", source: "VF" },
  { num: 7, label: "Uji Mutu", source: "VF" },
  { num: 8, label: "Pernyataan Label", source: "VF" },
  { num: 9, label: "Modal Kerja", source: "VF" },
  { num: 10, label: "Review & Approval", source: "PM" },
  { num: 11, label: "LHVIU", source: "PM" },
] as const satisfies readonly { num: number; label: string; source: WorkspaceKey }[];

export const CASE_STEP_COUNT = CASE_STEPS.length;

/** The stage a requirement is traced on (1 — Ringkasan — for an unknown key). */
export function stepOfRequirement(key: string): number {
  return REQUIREMENTS.find((requirement) => requirement.key === key)?.step ?? 1;
}

export function requirementsOfStep(step: number): RequirementKey[] {
  return REQUIREMENTS.filter((requirement) => requirement.step === step).map((requirement) => requirement.key);
}
