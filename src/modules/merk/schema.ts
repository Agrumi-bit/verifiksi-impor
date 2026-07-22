import { z } from "zod";

export const MERK_OWNERSHIP_TYPES = ["MILIK_SENDIRI", "LISENSI"] as const;
export type MerkOwnershipType = (typeof MERK_OWNERSHIP_TYPES)[number];

const requiredString = (message: string) => z.string().trim().min(1, message);

export const merkBrandInfoSchema = z.object({
  brandName: requiredString("Nama merek wajib diisi"),
  productCategory: requiredString("Kategori produk wajib diisi"),
  countryOfOrigin: requiredString("Negara asal merek wajib diisi"),
  registrationNumber: requiredString(
    "Nomor pendaftaran/sertifikat merek wajib diisi",
  ),
  registrationDocumentPath: requiredString(
    "Dokumen sertifikat merek wajib diunggah",
  ),
});
export type MerkBrandInfoValues = z.infer<typeof merkBrandInfoSchema>;

const merkOwnershipBaseSchema = z.object({
  ownershipType: z.enum(MERK_OWNERSHIP_TYPES, {
    message: "Pilih status kepemilikan merek",
  }),
  brandOwnerName: requiredString("Nama pemilik merek wajib diisi"),
  licenseAgreementNumber: z.string().trim().optional(),
  licenseStartDate: z.string().trim().optional(),
  licenseEndDate: z.string().trim().optional(),
  licenseDocumentPath: z.string().trim().optional(),
});

export const merkWizardSchema = merkBrandInfoSchema
  .extend(merkOwnershipBaseSchema.shape)
  .superRefine((data, ctx) => {
    if (data.ownershipType !== "LISENSI") return;
    if (!data.licenseAgreementNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["licenseAgreementNumber"],
        message: "Nomor perjanjian lisensi wajib diisi",
      });
    }
    if (!data.licenseStartDate) {
      ctx.addIssue({
        code: "custom",
        path: ["licenseStartDate"],
        message: "Tanggal mulai lisensi wajib diisi",
      });
    }
    if (!data.licenseEndDate) {
      ctx.addIssue({
        code: "custom",
        path: ["licenseEndDate"],
        message: "Tanggal berakhir lisensi wajib diisi",
      });
    }
    if (!data.licenseDocumentPath) {
      ctx.addIssue({
        code: "custom",
        path: ["licenseDocumentPath"],
        message: "Dokumen perjanjian lisensi wajib diunggah",
      });
    }
  });
export type MerkWizardValues = z.infer<typeof merkWizardSchema>;

export const MERK_STEP_FIELD_NAMES: Record<number, (keyof MerkWizardValues)[]> = {
  1: [
    "brandName",
    "productCategory",
    "countryOfOrigin",
    "registrationNumber",
    "registrationDocumentPath",
  ],
  2: [
    "ownershipType",
    "brandOwnerName",
    "licenseAgreementNumber",
    "licenseStartDate",
    "licenseEndDate",
    "licenseDocumentPath",
  ],
};
