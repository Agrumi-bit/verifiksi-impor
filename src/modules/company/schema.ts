import { z } from "zod";
import { kbliEntrySchema, locationsSchema, KBLI_CATEGORIES, type KbliCategory, type KbliEntryValues } from "@/modules/shared/schema";

export { KBLI_CATEGORIES, type KbliCategory };
// Alias kept for existing call sites in this module's wizard steps — same shape as the shared KbliEntryValues.
export type CompanyKbliEntryValues = KbliEntryValues;

const requiredString = (message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, " "))
    .pipe(z.string().min(1, message));
const optionalUrl = z.string().trim().url("URL tidak valid").optional().or(z.literal(""));

export const API_TYPES = ["API-P", "API-U"] as const;
export type ApiType = (typeof API_TYPES)[number];

export const COMPANY_LEGAL_TYPES = ["PT", "CV", "Firma", "Koperasi", "Perusahaan Perorangan"] as const;
export type CompanyLegalType = (typeof COMPANY_LEGAL_TYPES)[number];

export const INVESTMENT_STATUSES = ["PMDN", "PMA"] as const;
export type InvestmentStatus = (typeof INVESTMENT_STATUSES)[number];

export const COMPANY_AGES = ["OVER_3", "UNDER_3"] as const;
export type CompanyAge = (typeof COMPANY_AGES)[number];

/**
 * The 7 supporting evidence types for "Bukti Pembayaran Pajak 3 (tiga) Tahun
 * Terakhir" (Pasal 30 ayat (2) huruf b angka 7 Permenperin Nomor 27 Tahun
 * 2025) — a company picks one per year entry in `taxProofs`.
 */
export const TAX_PROOF_TYPES = ["spt", "bpe", "skf", "ssp", "pph_badan", "ppn", "e_billing"] as const;
export type TaxProofType = (typeof TAX_PROOF_TYPES)[number];
export const TAX_PROOF_TYPE_LABELS: Record<TaxProofType, string> = {
  spt: "SPT Tahunan Badan",
  bpe: "Bukti Penerimaan Elektronik (BPE) SPT Tahunan",
  skf: "Surat Keterangan Fiskal (SKF)",
  ssp: "Surat Setoran Pajak (SSP)",
  pph_badan: "Bukti Pembayaran PPh Badan",
  ppn: "Bukti Pembayaran PPN",
  e_billing: "Bukti Setor Pajak e-Billing",
};

// Data Perusahaan (Step 1)
export const companyDataSchema = z.object({
  logoPath: z.string().trim().optional(),
  companyName: requiredString("Nama perusahaan wajib diisi"),
  apiType: z.enum(API_TYPES, { message: "Pilih jenis API" }),
  companyType: z.enum(COMPANY_LEGAL_TYPES, { message: "Pilih tipe perusahaan" }),
  investmentStatus: z.enum(INVESTMENT_STATUSES, { message: "Pilih status investasi" }),
  addressJalan: requiredString("Jalan wajib diisi"),
  addressDesa: requiredString("Desa/Kelurahan wajib diisi"),
  addressKecamatan: requiredString("Kecamatan wajib diisi"),
  addressKota: requiredString("Kota/Kabupaten wajib diisi"),
  addressProvinsi: requiredString("Provinsi wajib diisi"),
  addressKodePos: requiredString("Kode pos wajib diisi"),
  companyPhone: requiredString("Nomor perusahaan wajib diisi"),
  companyEmail: z.string().trim().email("Email tidak valid"),
  companyWebsite: optionalUrl,
});
export type CompanyDataValues = z.infer<typeof companyDataSchema>;

// PIC / Contact Person (Step 2)
export const companyContactSchema = z.object({
  name: requiredString("Nama wajib diisi"),
  jabatan: requiredString("Jabatan wajib diisi"),
  whatsapp: requiredString("Nomor WhatsApp wajib diisi"),
  email: z.string().trim().email("Email tidak valid"),
});
export type CompanyContactValues = z.infer<typeof companyContactSchema>;

export const companyContactsSchema = z.object({
  contacts: z.array(companyContactSchema).min(1, "Tambahkan minimal satu contact person"),
});

// Legal (Step 3)
export const companyLegalSchema = z.object({
  nibNumber: requiredString("Nomor NIB wajib diisi"),
  nibIssueDate: requiredString("Tanggal terbit NIB wajib diisi"),
  nibDocumentPath: requiredString("Dokumen NIB wajib diunggah"),
  kbliEntries: z
    .array(kbliEntrySchema)
    .min(1, "Tambahkan minimal satu KBLI")
    .refine((entries) => entries.some((e) => e.category === "UTAMA"), "Tambahkan minimal satu KBLI Utama"),
  kbliDocumentPath: requiredString("Dokumen daftar KBLI wajib diunggah"),
  notarialDeedNumber: requiredString("Nomor akta notaris wajib diisi"),
  notarialDeedIssueDate: requiredString("Tanggal terbit akta wajib diisi"),
  notarialIssuingAuthority: requiredString("Nama notaris wajib diisi"),
  notarialDocumentPath: requiredString("Dokumen akta notaris wajib diunggah"),
  hasAmendment: z.boolean().default(false),
  notarialAmendmentNumber: z.string().trim().optional(),
  notarialAmendmentDate: z.string().trim().optional(),
  notarialAmendmentAuthority: z.string().trim().optional(),
  notarialAmendmentDocPath: z.string().trim().optional(),
  skNumber: requiredString("Nomor SK Kemenkumham wajib diisi"),
  skDate: requiredString("Tanggal terbit SK wajib diisi"),
  skDocumentPath: requiredString("Dokumen SK Kemenkumham wajib diunggah"),
});
export type CompanyLegalValues = z.infer<typeof companyLegalSchema>;

// Pajak (Step 4)
export const taxProofEntrySchema = z.object({
  year: z.string(),
  type: z.enum(TAX_PROOF_TYPES).nullable().default(null),
  nomor: z.string().trim().optional(),
  tanggal: z.string().trim().optional(),
  bpn: z.string().trim().optional(),
  ntte: z.string().trim().optional(),
  docPath: z.string().trim().optional(),
});
export type TaxProofEntryValues = z.infer<typeof taxProofEntrySchema>;

export const companyTaxSchema = z.object({
  npwpNumber: requiredString("Nomor NPWP wajib diisi"),
  npwpDocumentPath: requiredString("Dokumen NPWP wajib diunggah"),
  companyAge: z.enum(COMPANY_AGES, { message: "Pilih usia perusahaan" }),
  taxProofs: z.array(taxProofEntrySchema).default([]),
  sktNumber: z.string().trim().optional(),
  sktIssuer: z.string().trim().optional(),
  sktDate: z.string().trim().optional(),
  sktDocumentPath: z.string().trim().optional(),
});
export type CompanyTaxValues = z.infer<typeof companyTaxSchema>;

export const companyWizardSchema = companyDataSchema
  .extend(companyContactsSchema.shape)
  .extend(companyLegalSchema.shape)
  .extend(companyTaxSchema.shape)
  .extend(locationsSchema.shape);

export type CompanyWizardValues = z.infer<typeof companyWizardSchema>;

export const COMPANY_STEP_FIELD_NAMES: Record<number, (keyof CompanyWizardValues)[]> = {
  1: [
    "companyName",
    "apiType",
    "companyType",
    "investmentStatus",
    "addressJalan",
    "addressDesa",
    "addressKecamatan",
    "addressKota",
    "addressProvinsi",
    "addressKodePos",
    "companyPhone",
    "companyEmail",
    "companyWebsite",
  ],
  2: ["contacts"],
  3: [
    "nibNumber",
    "nibIssueDate",
    "nibDocumentPath",
    "kbliEntries",
    "kbliDocumentPath",
    "notarialDeedNumber",
    "notarialDeedIssueDate",
    "notarialIssuingAuthority",
    "notarialDocumentPath",
    "skNumber",
    "skDate",
    "skDocumentPath",
  ],
  4: ["npwpNumber", "npwpDocumentPath", "companyAge"],
  5: ["locations"],
  6: [],
};

export function createEmptyContact(): CompanyContactValues {
  return { name: "", jabatan: "", whatsapp: "", email: "" };
}

export function createEmptyTaxProofs(): TaxProofEntryValues[] {
  const currentYear = new Date().getFullYear();
  return [currentYear - 3, currentYear - 2, currentYear - 1].map((year) => ({
    year: String(year),
    type: null,
  }));
}
