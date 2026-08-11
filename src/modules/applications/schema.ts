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
import { taxProofEntrySchema, COMPANY_AGES } from "@/modules/company/schema";

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

export const step2Schema = companyProfileSchema.extend({
  companyId: requiredString("Pilih perusahaan terdaftar"),
  companyApiType: z.string().trim().optional(),
});
export const kbliEntrySchema = z.object({
  code: requiredString("Kode KBLI wajib diisi"),
  description: requiredString("Deskripsi KBLI wajib diisi"),
});
export const step3Schema = legalInformationSchema;
export const step4Schema = locationsSchema;

/**
 * VKI-only extras not covered by the shared legalInformationSchema/companyProfileSchema —
 * SK Kemenkumham + NPWP, mirrored from the Company model's own fields (companyLegalSchema /
 * companyTaxSchema in modules/company/schema.ts). Auto-filled by CompanyPickerField, displayed
 * read-only in the VKI wizard's Legal/Tax steps; never manually entered here.
 */
export const companyLegalExtraSchema = z.object({
  skNumber: z.string().trim().optional(),
  skDate: z.string().trim().optional(),
  skDocumentPath: z.string().trim().optional(),
  notarialAmendmentNumber: z.string().trim().optional(),
  notarialAmendmentDate: z.string().trim().optional(),
  notarialAmendmentAuthority: z.string().trim().optional(),
  notarialAmendmentDocPath: z.string().trim().optional(),
  npwpNumber: z.string().trim().optional(),
  npwpDocumentPath: z.string().trim().optional(),
  companyAge: z.enum(COMPANY_AGES).nullable().optional(),
  taxProofs: z.array(taxProofEntrySchema).optional(),
  sktNumber: z.string().trim().optional(),
  sktIssuer: z.string().trim().optional(),
  sktDate: z.string().trim().optional(),
  sktDocumentPath: z.string().trim().optional(),
});

/**
 * "Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir" supporting evidence — no
 * wizard step or company-profile tab collects these yet (unlike the fields
 * above), so every field here starts empty. They exist purely as backing
 * paths for the verifikator's Perpajakan checklist (Documents Verification
 * tab), fillable only via verifikator upload-on-behalf or marked N/A.
 */
export const taxSupportDocumentsSchema = z.object({
  taxProofSummaryDocumentPath: z.string().trim().optional(),
  sptTahunanDocumentPath: z.string().trim().optional(),
  bpeDocumentPath: z.string().trim().optional(),
  skfDocumentPath: z.string().trim().optional(),
  sspDocumentPath: z.string().trim().optional(),
  pphBadanDocumentPath: z.string().trim().optional(),
  ppnDocumentPath: z.string().trim().optional(),
  eBillingDocumentPath: z.string().trim().optional(),
});

export const supportDocumentSchema = z.object({
  id: z.string(),
  label: requiredString("Nama dokumen wajib diisi"),
  documentPath: requiredString("Dokumen wajib diunggah"),
});

export const step5Schema = z.object({
  partnerIndustriId: z.string().trim().optional(),
  partnerIndustriLhvki: z.string().trim().optional(),
  partnerIndustriNib: z.string().trim().optional(),
  nonIndustriDocuments: z.array(supportDocumentSchema),
  konsumsiDocuments: z.array(supportDocumentSchema),
});

export const productItemSchema = z.object({
  id: z.string(),
  kategori: z.string().trim().optional(),
  materialType: requiredString("Jenis material wajib diisi"),
  hsCode: requiredString("HS Code wajib diisi"),
  hsDesc: z.string().trim().optional(),
  estimatedVolume: z.string().trim().optional(),
  volumeUnit: z.string().trim().optional(),
  intendedUse: z.string().trim().optional(),
  deskripsi: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
});

export const step6Schema = z.object({
  products: z.array(productItemSchema).min(1, "Tambahkan minimal satu produk"),
});

export const step8Schema = z.object({
  declarationAccepted: z.boolean().default(false),
});
// Declaration checkbox is a VIU-only gate (checked via superRefine below) — the VKI
// wizard's design has no such checkbox, submission is gated by the confirm modal instead.

// VKI-only steps (design: Data Mesin / Product+Raw Materials / Jumlah Produksi /
// Bahan Baku yang Digunakan / Penjualan). No fields carry a required asterisk in the
// design, so validation stays permissive — the point of these steps is capturing
// industrial-capacity data, not gatekeeping submission.
export const MACHINE_KONDISI_VALUES = ["AKTIF", "TIDAK_AKTIF"] as const;
export type MachineKondisiValue = (typeof MACHINE_KONDISI_VALUES)[number];
export const MACHINE_KONDISI_LABELS: Record<MachineKondisiValue, string> = {
  AKTIF: "Aktif",
  TIDAK_AKTIF: "Tidak Aktif",
};

export const machineItemSchema = z.object({
  id: z.string(),
  nama: z.string().trim().optional(),
  merk: z.string().trim().optional(),
  model: z.string().trim().optional(),
  tahun: z.string().trim().optional(),
  jumlah: z.string().trim().optional(),
  proses: z.string().trim().optional(),
  kapasitas: z.string().trim().optional(),
  kapasitasSatuan: z.string().trim().optional(),
  kapasitasJam: z.string().trim().optional(),
  kapasitasJamSatuan: z.string().trim().optional(),
  waktuBeroperasi: z.string().trim().optional(),
  kondisi: z.enum(MACHINE_KONDISI_VALUES).optional(),
  power: z.string().trim().optional(),
  input: z.string().trim().optional(),
  output: z.string().trim().optional(),
  photoMesinPath: z.string().trim().optional(),
  photoInputPath: z.string().trim().optional(),
  photoOutputPath: z.string().trim().optional(),
});
export type MachineItemValues = z.infer<typeof machineItemSchema>;

export const rawMaterialItemSchema = z.object({
  id: z.string(),
  jenis: z.string().trim().optional(),
  hsCode: z.string().trim().optional(),
  hsDesc: z.string().trim().optional(),
  deskripsi: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
});
export type RawMaterialItemValues = z.infer<typeof rawMaterialItemSchema>;

export const RAW_MATERIAL_CONVERSION_KATEGORI = ["BAHAN_BAKU", "BAHAN_PENOLONG"] as const;
export type RawMaterialConversionKategori = (typeof RAW_MATERIAL_CONVERSION_KATEGORI)[number];

/** Many-to-many link between a product and a raw material — one row per "produk X pakai bahan baku Y" pairing, with its own conversion ratio. */
export const rawMaterialConversionEntrySchema = z.object({
  id: z.string(),
  productId: z.string().trim().optional(),
  rawMaterialId: z.string().trim().optional(),
  kategori: z.enum(RAW_MATERIAL_CONVERSION_KATEGORI).optional(),
  volumeProduksiJumlah: z.string().trim().optional(),
  volumeProduksiSatuan: z.string().trim().optional(),
  volumeKebutuhanJumlah: z.string().trim().optional(),
  volumeKebutuhanSatuan: z.string().trim().optional(),
  rasioKonversi: z.string().trim().optional(),
  keterangan: z.string().trim().optional(),
});
export type RawMaterialConversionEntryValues = z.infer<typeof rawMaterialConversionEntrySchema>;

export const productionQtyItemSchema = z.object({
  productId: z.string(),
  perTahunSebelumnya: z.string().trim().optional(),
  perTahunRencana: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type ProductionQtyItemValues = z.infer<typeof productionQtyItemSchema>;

export const capacityItemSchema = z.object({
  productId: z.string(),
  berdasarkanIzin: z.string().trim().optional(),
  kapasitasTerpasang: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type CapacityItemValues = z.infer<typeof capacityItemSchema>;

export const rawMaterialUsageItemSchema = z.object({
  rawMaterialId: z.string(),
  penggunaan: z.string().trim().optional(),
  dataStock: z.string().trim().optional(),
  /** Total rencana kebutuhan — auto-summed from dalamNegeri + luarNegeri whenever either changes, kept for report code that only needs the total. */
  rencanaKebutuhan: z.string().trim().optional(),
  rencanaKebutuhanDalamNegeri: z.string().trim().optional(),
  rencanaKebutuhanLuarNegeri: z.string().trim().optional(),
  /** Only meaningful when rencanaKebutuhanLuarNegeri is filled — rencana negara asal impor. */
  rencanaKebutuhanNegaraAsal: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type RawMaterialUsageItemValues = z.infer<typeof rawMaterialUsageItemSchema>;

export const salesItemSchema = z.object({
  productId: z.string(),
  dalamNegeri: z.string().trim().optional(),
  luarNegeri: z.string().trim().optional(),
  negaraTujuan: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});
export type SalesItemValues = z.infer<typeof salesItemSchema>;

/**
 * VKI's Support Document step (6) is a fixed checklist (per design), not a
 * user-defined list — see VKI_SUPPORT_DOC_DEFS below for the 6 required docs.
 * Two of them have a special repeatable shape instead of a single upload.
 */
export const vkiSupportDocEntrySchema = z.object({
  key: z.string(),
  nomorSurat: z.string().trim().optional(),
  tanggal: z.string().trim().optional(),
  penandatangan: z.string().trim().optional(),
  documentPath: z.string().trim().optional(),
});
export type VkiSupportDocEntryValues = z.infer<typeof vkiSupportDocEntrySchema>;

export const electricityMonthSchema = z.object({
  id: z.string(),
  bulan: z.string().trim().optional(),
  kwh: z.string().trim().optional(),
  nominal: z.string().trim().optional(),
  documentPath: z.string().trim().optional(),
});
export type ElectricityMonthValues = z.infer<typeof electricityMonthSchema>;

export const tenagaKerjaEntrySchema = z.object({
  id: z.string(),
  kategori: z.string().trim().optional(),
  jumlah: z.string().trim().optional(),
});
export type TenagaKerjaEntryValues = z.infer<typeof tenagaKerjaEntrySchema>;

export const vkiStepsSchema = z.object({
  vkiSupportDocs: z.array(vkiSupportDocEntrySchema).default([]),
  electricityMonths: z.array(electricityMonthSchema).default([]),
  tenagaKerjaEntries: z.array(tenagaKerjaEntrySchema).default([]),
  tenagaKerjaDocumentPath: z.string().trim().optional(),
  machines: z.array(machineItemSchema).default([]),
  rawMaterials: z.array(rawMaterialItemSchema).default([]),
  rawMaterialConversions: z.array(rawMaterialConversionEntrySchema).default([]),
  capacity: z.array(capacityItemSchema).default([]),
  capacityDocumentPath: z.string().trim().optional(),
  productionQty: z.array(productionQtyItemSchema).default([]),
  rawMaterialUsage: z.array(rawMaterialUsageItemSchema).default([]),
  sales: z.array(salesItemSchema).default([]),
});

export const applicationWizardSchema = step1Schema
  .extend(step2Schema.shape)
  .extend(step3Schema.shape)
  .extend(step4Schema.shape)
  .extend(companyLegalExtraSchema.shape)
  .extend(taxSupportDocumentsSchema.shape)
  .extend(step5Schema.shape)
  .extend(step6Schema.shape)
  .extend(step8Schema.shape)
  .extend(vkiStepsSchema.shape)
  .superRefine((data, ctx) => {
    if (data.verificationType === "VIU" && data.declarationAccepted !== true) {
      ctx.addIssue({
        code: "custom",
        path: ["declarationAccepted"],
        message: "Anda harus menyetujui pernyataan ini sebelum submit",
      });
    }
    if (
      data.importTypes.includes("BAHAN_BAKU_INDUSTRI") &&
      !data.partnerIndustriId
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["partnerIndustriId"],
        message: "Pilih Partner Industri tujuan",
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
    deskripsi: "",
    photoPath: "",
  };
}

export function createEmptyMachine(): Partial<MachineItemValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyRawMaterial(): Partial<RawMaterialItemValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyRawMaterialConversion(): Partial<RawMaterialConversionEntryValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyElectricityMonth(): Partial<ElectricityMonthValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export function createEmptyTenagaKerja(): Partial<TenagaKerjaEntryValues> & { id: string } {
  return { id: crypto.randomUUID() };
}

export type VkiSupportDocType = "regular" | "electricity" | "tenagaKerja";

export type VkiSupportDocDef = {
  key: string;
  title: string;
  desc: string;
  type: VkiSupportDocType;
};

/** Fixed checklist for VKI's Support Document step — not user-editable. */
export const VKI_SUPPORT_DOC_DEFS: VkiSupportDocDef[] = [
  {
    key: "tidak-diperjualbelikan",
    title: "Surat Pernyataan Tidak Akan Diperjualbelikan atau Dipindahtangankan",
    desc: "Pernyataan bahwa mesin/peralatan tidak akan dijual atau dipindahtangankan.",
    type: "regular",
  },
  {
    key: "memiliki-menguasai",
    title: "Surat Pernyataan Memiliki atau Menguasai",
    desc: "Pernyataan kepemilikan atau penguasaan atas mesin/peralatan produksi.",
    type: "regular",
  },
  {
    key: "kebenaran-data",
    title: "Surat Pernyataan Kebenaran Data",
    desc: "Pernyataan bahwa seluruh data yang diajukan benar dan dapat dipertanggungjawabkan.",
    type: "regular",
  },
  {
    key: "alur-proses",
    title: "Surat Pernyataan Alur Proses",
    desc: "Pernyataan mengenai alur proses produksi yang dijalankan.",
    type: "regular",
  },
  {
    key: "listrik",
    title: "Bukti Pembayaran Listrik 3 Bulan Terakhir",
    desc: "Bukti pembayaran listrik fasilitas produksi 3 bulan terakhir.",
    type: "electricity",
  },
  {
    key: "tenaga-kerja",
    title: "Surat Pernyataan Tenaga Kerja",
    desc: "Pernyataan jumlah tenaga kerja per kategori/departemen.",
    type: "tenagaKerja",
  },
];

/**
 * VIU keeps the original 8-step flow untouched — same field lists as before this
 * change, just renamed to make the dual-path split explicit.
 */
export const VIU_STEP_FIELD_NAMES: Record<number, (keyof ApplicationWizardValues)[]> = {
  1: [
    "companyId",
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
  2: ["verificationType", "applicationCategory", "importTypes"],
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
  5: ["partnerIndustriId", "nonIndustriDocuments", "konsumsiDocuments"],
  6: ["products"],
  7: [],
  8: ["declarationAccepted"],
};

/**
 * VKI's new 13-step flow (per the updated Claude Design). Steps 3-5 (Legal/Tax/
 * Location) are read-only displays pulled from the selected Company — nothing to
 * validate there, the data is always already present once a company is picked.
 */
export const VKI_STEP_FIELD_NAMES: Record<number, (keyof ApplicationWizardValues)[]> = {
  1: VIU_STEP_FIELD_NAMES[1],
  2: VIU_STEP_FIELD_NAMES[2],
  3: [],
  4: [],
  5: [],
  6: ["vkiSupportDocs", "electricityMonths", "tenagaKerjaEntries", "tenagaKerjaDocumentPath"],
  7: ["machines"],
  8: ["products", "rawMaterials"],
  9: ["capacity", "capacityDocumentPath"],
  10: ["productionQty"],
  11: ["rawMaterialUsage"],
  12: ["sales"],
  13: [],
  14: [],
};

// Backward-compatible alias — existing imports keep working.
export const STEP_FIELD_NAMES = VIU_STEP_FIELD_NAMES;
