import { z } from "zod";

/**
 * Cross-module domain schemas: Company Profile, Legal Information, and
 * Location are collected once from more than one workflow (the Application
 * wizard's Step 2-4, and the Company Management wizard). Keeping a single
 * source of truth here is what makes "sinkronisasikan setiap perusahaan"
 * (per the platform spec) actually hold — both wizards validate and shape
 * this data identically.
 */

const requiredString = (message: string) => z.string().trim().min(1, message);
const optionalUrl = z
  .string()
  .trim()
  .url("URL tidak valid")
  .optional()
  .or(z.literal(""));

export const INVESTMENT_STATUSES = ["PMDN", "PMA"] as const;
export type InvestmentStatus = (typeof INVESTMENT_STATUSES)[number];

export const generalInformationSchema = z.object({
  companyName: requiredString("Nama perusahaan wajib diisi"),
  companyType: requiredString("Jenis badan usaha wajib dipilih"),
  investmentStatus: z.enum(INVESTMENT_STATUSES, {
    message: "Pilih status investasi",
  }),
  companyEmail: z.string().trim().email("Email tidak valid"),
  companyPhone: requiredString("Nomor telepon perusahaan wajib diisi"),
  companyWebsite: optionalUrl,
});
export type GeneralInformationValues = z.infer<typeof generalInformationSchema>;

export const contactPersonSchema = z.object({
  contactFullName: requiredString("Nama penanggung jawab wajib diisi"),
  contactDesignation: requiredString("Jabatan wajib diisi"),
  contactEmail: z.string().trim().email("Email tidak valid"),
  contactPhone: requiredString("Nomor telepon penanggung jawab wajib diisi"),
});
export type ContactPersonValues = z.infer<typeof contactPersonSchema>;

export const companyProfileSchema = generalInformationSchema.extend(
  contactPersonSchema.shape,
);
export type CompanyProfileValues = z.infer<typeof companyProfileSchema>;

export const kbliEntrySchema = z.object({
  code: requiredString("Kode KBLI wajib diisi"),
  description: requiredString("Deskripsi KBLI wajib diisi"),
});
export type KbliEntryValues = z.infer<typeof kbliEntrySchema>;

export const legalInformationSchema = z.object({
  nibNumber: requiredString("Nomor NIB wajib diisi"),
  nibIssueDate: requiredString("Tanggal terbit NIB wajib diisi"),
  nibDocumentPath: requiredString("Dokumen NIB wajib diunggah"),
  kbliEntries: z.array(kbliEntrySchema).min(1, "Tambahkan minimal satu KBLI"),
  kbliDocumentPath: requiredString("Dokumen daftar KBLI wajib diunggah"),
  notarialDeedNumber: requiredString("Nomor akta notaris wajib diisi"),
  notarialDeedIssueDate: requiredString("Tanggal terbit akta wajib diisi"),
  notarialIssuingAuthority: requiredString("Nama notaris wajib diisi"),
  notarialAmendmentInfo: z.string().trim().optional(),
  notarialDocumentPath: requiredString("Dokumen akta notaris wajib diunggah"),
});
export type LegalInformationValues = z.infer<typeof legalInformationSchema>;

export const LOCATION_TYPES = ["KANTOR", "GUDANG", "PABRIK"] as const;
export type LocationType = (typeof LOCATION_TYPES)[number];

export const BUILDING_STATUSES = ["MILIK_SENDIRI", "SEWA"] as const;
export type BuildingStatus = (typeof BUILDING_STATUSES)[number];

export const WAREHOUSE_REGISTRATION_TYPES = [
  "TANDA_DAFTAR_GUDANG",
  "PENETAPAN_GUDANG_BERIKAT",
  "GUDANG_PENIMBUNAN_SEMENTARA",
] as const;
export type WarehouseRegistrationType =
  (typeof WAREHOUSE_REGISTRATION_TYPES)[number];

const locationBaseSchema = z.object({
  id: z.string(),
  locationType: z.enum(LOCATION_TYPES, { message: "Pilih jenis lokasi" }),
  address: requiredString("Alamat wajib diisi"),
  city: requiredString("Kota wajib diisi"),
  province: requiredString("Provinsi wajib diisi"),
  country: requiredString("Negara wajib diisi"),
  postalCode: requiredString("Kode pos wajib diisi"),
  googleMapsLink: optionalUrl,
  buildingStatus: z.enum(BUILDING_STATUSES, {
    message: "Pilih status bangunan",
  }),
  ownershipDocumentPath: z.string().trim().optional(),
  leaseProofOfOwnership: z.string().trim().optional(),
  leaseOriginalOwnerName: z.string().trim().optional(),
  leaseStartDate: z.string().trim().optional(),
  leaseEndDate: z.string().trim().optional(),
  leaseDocumentPath: z.string().trim().optional(),
  warehouseRegistrationType: z.enum(WAREHOUSE_REGISTRATION_TYPES).optional(),
  warehouseRegistrationNumber: z.string().trim().optional(),
  warehouseOwnerNibNumber: z.string().trim().optional(),
  warehouseRegistrationIssueDate: z.string().trim().optional(),
  warehouseRegistrationIssuingAuthority: z.string().trim().optional(),
  warehouseRegistrationDocumentPath: z.string().trim().optional(),
  warehouseLayoutDocumentPath: z.string().trim().optional(),
});

export const locationSchema = locationBaseSchema.superRefine((data, ctx) => {
  if (data.buildingStatus === "MILIK_SENDIRI" && !data.ownershipDocumentPath) {
    ctx.addIssue({
      code: "custom",
      path: ["ownershipDocumentPath"],
      message: "Bukti kepemilikan wajib diunggah",
    });
  }
  if (data.buildingStatus === "SEWA") {
    if (!data.leaseOriginalOwnerName) {
      ctx.addIssue({
        code: "custom",
        path: ["leaseOriginalOwnerName"],
        message: "Nama pemilik asli wajib diisi",
      });
    }
    if (!data.leaseStartDate) {
      ctx.addIssue({
        code: "custom",
        path: ["leaseStartDate"],
        message: "Tanggal mulai sewa wajib diisi",
      });
    }
    if (!data.leaseEndDate) {
      ctx.addIssue({
        code: "custom",
        path: ["leaseEndDate"],
        message: "Tanggal berakhir sewa wajib diisi",
      });
    }
    if (!data.leaseDocumentPath) {
      ctx.addIssue({
        code: "custom",
        path: ["leaseDocumentPath"],
        message: "Dokumen pendukung kepemilikan wajib diunggah",
      });
    }
  }
  if (data.locationType === "GUDANG") {
    if (!data.warehouseRegistrationType) {
      ctx.addIssue({
        code: "custom",
        path: ["warehouseRegistrationType"],
        message: "Jenis tanda daftar gudang wajib dipilih",
      });
    }
    if (!data.warehouseRegistrationNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["warehouseRegistrationNumber"],
        message: "Nomor tanda daftar gudang wajib diisi",
      });
    }
  }
});
export type LocationValues = z.infer<typeof locationSchema>;

export const locationsSchema = z.object({
  locations: z.array(locationSchema).min(1, "Tambahkan minimal satu lokasi"),
});

export function createEmptyLocation(): Partial<LocationValues> & { id: string } {
  return {
    id: crypto.randomUUID(),
    address: "",
    city: "",
    province: "",
    country: "Indonesia",
    postalCode: "",
    googleMapsLink: "",
    // Matches the LocationItem UI, which shows the "Milik Sendiri" upload
    // box by default (before the user picks a Status Bangunan toggle) — the
    // field value must agree with that default or validation fails silently.
    buildingStatus: "MILIK_SENDIRI",
  };
}
