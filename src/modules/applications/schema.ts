import { z } from "zod";
import {
  companyProfileSchema,
  createEmptyLocation,
  legalInformationSchema,
  locationSchema,
  locationsSchema,
  BUILDING_STATUSES,
  INVESTMENT_STATUSES,
  LOCATION_TYPES,
  WAREHOUSE_REGISTRATION_TYPES,
  type BuildingStatus,
  type InvestmentStatus,
  type LocationType,
  type LocationValues,
  type WarehouseRegistrationType,
} from "@/modules/shared/schema";

export {
  companyProfileSchema,
  createEmptyLocation,
  legalInformationSchema,
  locationSchema,
  locationsSchema,
  BUILDING_STATUSES,
  INVESTMENT_STATUSES,
  LOCATION_TYPES,
  WAREHOUSE_REGISTRATION_TYPES,
};
export type {
  BuildingStatus,
  InvestmentStatus,
  LocationType,
  LocationValues,
  WarehouseRegistrationType,
};

export const VERIFICATION_TYPES = ["VKI", "VIU"] as const;
export type VerificationType = (typeof VERIFICATION_TYPES)[number];

export const APPLICATION_CATEGORIES = ["NEW", "RENEWAL", "AMENDMENT"] as const;
export type ApplicationCategory = (typeof APPLICATION_CATEGORIES)[number];

export const IMPORT_TYPES = [
  "BAHAN_BAKU_INDUSTRI",
  "BAHAN_BAKU_NON_INDUSTRI",
  "BARANG_KONSUMSI",
] as const;
export type ImportType = (typeof IMPORT_TYPES)[number];

const requiredString = (message: string) => z.string().trim().min(1, message);

export const step1Schema = z.object({
  verificationType: z.enum(VERIFICATION_TYPES, {
    message: "Pilih tipe verifikasi",
  }),
  applicationCategory: z.enum(APPLICATION_CATEGORIES, {
    message: "Pilih kategori aplikasi",
  }),
  importTypes: z.array(z.enum(IMPORT_TYPES)),
});

export const step2Schema = companyProfileSchema;
export const kbliEntrySchema = z.object({
  code: requiredString("Kode KBLI wajib diisi"),
  description: requiredString("Deskripsi KBLI wajib diisi"),
});
export const step3Schema = legalInformationSchema;
export const step4Schema = locationsSchema;

export const supportDocumentSchema = z.object({
  id: z.string(),
  label: requiredString("Nama dokumen wajib diisi"),
  documentPath: requiredString("Dokumen wajib diunggah"),
});

export const step5Schema = z.object({
  mitraIndustriId: z.string().trim().optional(),
  mitraIndustriLhvki: z.string().trim().optional(),
  mitraIndustriNib: z.string().trim().optional(),
  nonIndustriDocuments: z.array(supportDocumentSchema),
  konsumsiDocuments: z.array(supportDocumentSchema),
});

export const productItemSchema = z.object({
  id: z.string(),
  materialType: requiredString("Jenis material wajib diisi"),
  hsCode: requiredString("HS Code wajib diisi"),
  estimatedVolume: requiredString("Estimasi volume wajib diisi"),
  volumeUnit: requiredString("Satuan wajib diisi"),
  intendedUse: requiredString("Tujuan penggunaan wajib diisi"),
});

export const step6Schema = z.object({
  products: z.array(productItemSchema).min(1, "Tambahkan minimal satu produk"),
});

export const step8Schema = z.object({
  declarationAccepted: z.boolean().refine((value) => value === true, {
    message: "Anda harus menyetujui pernyataan ini sebelum submit",
  }),
});

export const applicationWizardSchema = step1Schema
  .extend(step2Schema.shape)
  .extend(step3Schema.shape)
  .extend(step4Schema.shape)
  .extend(step5Schema.shape)
  .extend(step6Schema.shape)
  .extend(step8Schema.shape)
  .superRefine((data, ctx) => {
    if (
      data.importTypes.includes("BAHAN_BAKU_INDUSTRI") &&
      !data.mitraIndustriId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["mitraIndustriId"],
        message: "Pilih Mitra Industri tujuan",
      });
    }
    if (
      data.importTypes.includes("BAHAN_BAKU_NON_INDUSTRI") &&
      data.nonIndustriDocuments.length < 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["nonIndustriDocuments"],
        message: "Tambahkan minimal satu dokumen pendukung",
      });
    }
    if (
      data.importTypes.includes("BARANG_KONSUMSI") &&
      data.konsumsiDocuments.length < 1
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["konsumsiDocuments"],
        message: "Tambahkan minimal satu dokumen pendukung",
      });
    }
  });

export type Step1Values = z.infer<typeof step1Schema>;
export type Step2Values = z.infer<typeof step2Schema>;
export type Step3Values = z.infer<typeof step3Schema>;
export type Step4Values = z.infer<typeof step4Schema>;
export type Step5Values = z.infer<typeof step5Schema>;
export type Step6Values = z.infer<typeof step6Schema>;
export type SupportDocumentValues = z.infer<typeof supportDocumentSchema>;
export type ProductItemValues = z.infer<typeof productItemSchema>;
export type ApplicationWizardValues = z.infer<typeof applicationWizardSchema>;

export function createEmptySupportDocument(): Partial<SupportDocumentValues> & {
  id: string;
} {
  return { id: crypto.randomUUID(), label: "" };
}

export function createEmptyProduct(): Partial<ProductItemValues> & {
  id: string;
} {
  return {
    id: crypto.randomUUID(),
    materialType: "",
    hsCode: "",
    estimatedVolume: "",
    volumeUnit: "",
    intendedUse: "",
  };
}

export const STEP_FIELD_NAMES: Record<number, (keyof ApplicationWizardValues)[]> = {
  1: ["verificationType", "applicationCategory", "importTypes"],
  2: [
    "companyName",
    "companyType",
    "investmentStatus",
    "companyEmail",
    "companyPhone",
    "companyWebsite",
    "contactFullName",
    "contactDesignation",
    "contactEmail",
    "contactPhone",
  ],
  3: [
    "nibNumber",
    "nibIssueDate",
    "nibDocumentPath",
    "kbliEntries",
    "kbliDocumentPath",
    "notarialDeedNumber",
    "notarialDeedIssueDate",
    "notarialIssuingAuthority",
    "notarialAmendmentInfo",
    "notarialDocumentPath",
  ],
  4: ["locations"],
  5: ["mitraIndustriId", "nonIndustriDocuments", "konsumsiDocuments"],
  6: ["products"],
  7: [],
  8: ["declarationAccepted"],
};
