import { z } from "zod";

export const PARTNER_TYPES = ["INDUSTRI", "NON_INDUSTRI"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

const requiredString = (message: string) => z.string().trim().min(1, message);

/** Company Workspace's own "Tambah Partner" wizard — a company syncs a mitra by NIB/NPWP/SK
 * (searching the global Company directory for that mitra's own identity), then fills contract
 * detail. Kept as a 3-step flow since Company Workspace users don't already know the mitra's
 * internal companyId the way admin does when browsing the Company directory directly. */
export const partnerWizardSchema = z.object({
  nibNumber: requiredString("Nomor NIB wajib diisi"),
  npwpInput: requiredString("Nomor NPWP wajib diisi"),
  skInput: requiredString("Nomor SK Kemenkumham wajib diisi"),
  companyId: requiredString("Sinkronisasi perusahaan terlebih dahulu"),
  companyName: z.string().trim().optional(),

  type: z.enum(PARTNER_TYPES, { error: "Jenis Partner wajib dipilih" }),
  contractNumber: requiredString("Nomor kontrak wajib diisi"),
  contractStartDate: requiredString("Tanggal mulai kontrak wajib diisi"),
  contractEndDate: requiredString("Tanggal berakhir kontrak wajib diisi"),
  contractDocumentPath: z.string().trim().optional(),
});

export type PartnerWizardValues = z.infer<typeof partnerWizardSchema>;

export const PARTNER_STEP_FIELD_NAMES: Record<1 | 2 | 3, (keyof PartnerWizardValues)[]> = {
  1: ["nibNumber", "npwpInput", "skInput", "companyId"],
  2: ["type", "contractNumber", "contractStartDate", "contractEndDate"],
  3: [],
};

/**
 * Admin's own "Tambah Partner" form — a single page, no wizard, no NIB/NPWP/SK sync. Admin
 * already browses the full Company directory day to day, so the mitra is picked directly by
 * name (searchable select resolving straight to its companyId) instead of re-verifying its
 * identity via credentials the way Company Workspace's wizard does.
 */
export const adminPartnerFormSchema = z.object({
  companyId: requiredString("Pilih perusahaan partner"),
  companyName: z.string().trim().optional(),

  type: z.enum(PARTNER_TYPES, { error: "Jenis Partner wajib dipilih" }),
  contractNumber: requiredString("Nomor kontrak wajib diisi"),
  contractStartDate: requiredString("Tanggal mulai kontrak wajib diisi"),
  contractEndDate: requiredString("Tanggal berakhir kontrak wajib diisi"),
  contractDocumentPath: z.string().trim().optional(),

  /** Which API-U companies this partner is related to/used by ("PERUSAHAAN API-U TERKAIT" in
   * the admin table) — set directly here, not derived from application data. */
  relatedCompanyIds: z.array(z.string()).optional(),
});

export type AdminPartnerFormValues = z.infer<typeof adminPartnerFormSchema>;

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  INDUSTRI: "Industri",
  NON_INDUSTRI: "Non Industri",
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
};
