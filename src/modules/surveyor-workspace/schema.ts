import { z } from "zod";

const requiredString = (message: string) => z.string().trim().min(1, message);

export const CHECKLIST_RESULTS = ["PASS", "FAIL", "NA"] as const;
export type ChecklistResult = (typeof CHECKLIST_RESULTS)[number];

export const checklistItemSchema = z.object({
  id: z.string(),
  category: z.string(),
  item: z.string(),
  result: z.enum(CHECKLIST_RESULTS).nullable(),
  notes: z.string().trim().optional(),
});
export type ChecklistItemValues = z.infer<typeof checklistItemSchema>;

export const DEFAULT_CHECKLIST_TEMPLATE: Omit<ChecklistItemValues, "result" | "notes">[] = [
  {
    id: "alamat-1",
    category: "Kesesuaian Alamat & Identitas",
    item: "Alamat lokasi aktual sesuai dengan alamat yang tercantum pada dokumen permohonan",
  },
  {
    id: "alamat-2",
    category: "Kesesuaian Alamat & Identitas",
    item: "Papan nama/identitas perusahaan pada lokasi sesuai dengan nama badan usaha terdaftar",
  },
  {
    id: "alamat-3",
    category: "Kesesuaian Alamat & Identitas",
    item: "Jenis penggunaan lokasi (Kantor/Gudang/Pabrik) sesuai dengan peruntukan yang dinyatakan dalam dokumen",
  },
  {
    id: "dokumen-1",
    category: "Kesesuaian Dokumen & Legalitas",
    item: "Status kepemilikan/sewa lokasi sesuai dengan dokumen bukti kepemilikan atau sewa yang diunggah",
  },
  {
    id: "dokumen-2",
    category: "Kesesuaian Dokumen & Legalitas",
    item: "Kondisi fisik dan fungsi bangunan sesuai serta layak untuk peruntukan yang terdaftar",
  },
  {
    id: "dokumen-3",
    category: "Kesesuaian Dokumen & Legalitas",
    item: "Titik koordinat/tautan peta lokasi sesuai dengan alamat yang terdaftar",
  },
];

export const evidenceItemSchema = z.object({
  id: z.string(),
  label: requiredString("Nama bukti wajib diisi"),
  category: z.string().trim().optional(),
  filePath: requiredString("File wajib diunggah"),
});
export type EvidenceItemValues = z.infer<typeof evidenceItemSchema>;

export const FINDING_SEVERITIES = ["MINOR", "MAJOR", "CRITICAL"] as const;
export type FindingSeverity = (typeof FINDING_SEVERITIES)[number];

export const findingItemSchema = z.object({
  id: z.string(),
  title: requiredString("Judul temuan wajib diisi"),
  severity: z.enum(FINDING_SEVERITIES),
  description: requiredString("Deskripsi temuan wajib diisi"),
  photoPath: z.string().trim().optional(),
});
export type FindingItemValues = z.infer<typeof findingItemSchema>;

export const surveyReportDraftSchema = z.object({
  checklist: z.array(checklistItemSchema),
  evidence: z.array(evidenceItemSchema),
  findings: z.array(findingItemSchema),
  notes: z.string().trim().optional(),
});
export type SurveyReportDraftValues = z.infer<typeof surveyReportDraftSchema>;

export function createEmptyEvidence(): Partial<EvidenceItemValues> & { id: string } {
  return { id: crypto.randomUUID(), label: "" };
}

export function createEmptyFinding(): Partial<FindingItemValues> & { id: string } {
  return { id: crypto.randomUUID(), title: "", severity: "MINOR", description: "" };
}
