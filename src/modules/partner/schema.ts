import { z } from "zod";

export const PARTNER_TYPES = ["INDUSTRI", "NON_INDUSTRI"] as const;
export type PartnerType = (typeof PARTNER_TYPES)[number];

export const PARTNER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];

const requiredString = (message: string) => z.string().trim().min(1, message);

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

export const PARTNER_TYPE_LABELS: Record<PartnerType, string> = {
  INDUSTRI: "Industri",
  NON_INDUSTRI: "Non Industri",
};

export const PARTNER_STATUS_LABELS: Record<PartnerStatus, string> = {
  ACTIVE: "Aktif",
  INACTIVE: "Nonaktif",
};
