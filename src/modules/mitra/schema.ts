import { z } from "zod";

export const MITRA_TYPES = ["INDUSTRI", "NON_INDUSTRI"] as const;
export type MitraType = (typeof MITRA_TYPES)[number];

const requiredString = (message: string) => z.string().trim().min(1, message);

export const mitraProfileSchema = z.object({
  name: requiredString("Nama mitra wajib diisi"),
  nibNumber: requiredString("Nomor NIB wajib diisi"),
  nibDocumentPath: requiredString("Dokumen NIB wajib diunggah"),
  address: requiredString("Alamat wajib diisi"),
  city: requiredString("Kota wajib diisi"),
  province: requiredString("Provinsi wajib diisi"),
});

export const mitraContactSchema = z.object({
  contactName: requiredString("Nama kontak wajib diisi"),
  contactPhone: requiredString("Nomor telepon kontak wajib diisi"),
  contactEmail: z.string().trim().email("Email tidak valid"),
});

export const mitraIndustriLhvkiSchema = z.object({
  lhvkiNumber: requiredString("Nomor LHVKI wajib diisi"),
  lhvkiIssueDate: requiredString("Tanggal terbit LHVKI wajib diisi"),
  lhvkiDocumentPath: requiredString("Dokumen LHVKI wajib diunggah"),
});

export const mitraNonIndustriContractSchema = z.object({
  contractNumber: requiredString("Nomor kontrak kerja sama wajib diisi"),
  contractDate: requiredString("Tanggal kontrak wajib diisi"),
  contractDocumentPath: requiredString("Dokumen kontrak wajib diunggah"),
});

export const mitraIndustriSchema = mitraProfileSchema
  .extend(mitraContactSchema.shape)
  .extend(mitraIndustriLhvkiSchema.shape);

export const mitraNonIndustriSchema = mitraProfileSchema
  .extend(mitraContactSchema.shape)
  .extend(mitraNonIndustriContractSchema.shape);

export type MitraIndustriValues = z.infer<typeof mitraIndustriSchema>;
export type MitraNonIndustriValues = z.infer<typeof mitraNonIndustriSchema>;

export const MITRA_STEP_FIELD_NAMES = {
  INDUSTRI: {
    1: ["name", "nibNumber", "nibDocumentPath", "address", "city", "province"],
    2: ["contactName", "contactPhone", "contactEmail"],
    3: ["lhvkiNumber", "lhvkiIssueDate", "lhvkiDocumentPath"],
  },
  NON_INDUSTRI: {
    1: ["name", "nibNumber", "nibDocumentPath", "address", "city", "province"],
    2: ["contactName", "contactPhone", "contactEmail"],
    3: ["contractNumber", "contractDate", "contractDocumentPath"],
  },
} as const;

export const MITRA_TYPE_LABELS: Record<MitraType, string> = {
  INDUSTRI: "Mitra Industri",
  NON_INDUSTRI: "Mitra Non Industri",
};
