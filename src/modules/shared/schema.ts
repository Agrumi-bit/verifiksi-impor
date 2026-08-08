import { z } from "zod";

/**
 * Cross-module domain schemas: Company Profile, Legal Information, and
 * Location are collected once from more than one workflow (the Application
 * wizard's Step 2-4, and the Company Management wizard). Keeping a single
 * source of truth here is what makes "sinkronisasikan setiap perusahaan"
 * (per the platform spec) actually hold — both wizards validate and shape
 * this data identically.
 */

const requiredString = (message: string) =>
  z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, " "))
    .pipe(z.string().min(1, message));
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

export const KBLI_CATEGORIES = ["UTAMA", "PENDUKUNG"] as const;
export type KbliCategory = (typeof KBLI_CATEGORIES)[number];

// category is optional at the schema level — entries created before this field
// existed (company profiles, and application snapshots copied from them) have
// no value here. Every consumer must go through splitKbliEntries() below
// rather than reading .category directly, so that legacy data still falls
// back to the old convention (first entry = Utama) instead of silently
// vanishing into "no Utama found".
export const kbliEntrySchema = z.object({
  code: requiredString("Kode KBLI wajib diisi"),
  description: requiredString("Deskripsi KBLI wajib diisi"),
  category: z.enum(KBLI_CATEGORIES).optional(),
});
export type KbliEntryValues = z.infer<typeof kbliEntrySchema>;

/**
 * Splits a company/application's KBLI list into Utama vs Pendukung — a
 * company can register more than one KBLI Utama, so this is never just
 * `entries[0]`. Falls back to the pre-category positional convention (first
 * entry = Utama) when no entry carries a category at all, which keeps
 * legacy company profiles and already-submitted application snapshots
 * rendering correctly across the Company, Application, and Verifikator
 * workspaces.
 */
export function splitKbliEntries<T extends { category?: KbliCategory }>(entries: T[]): { utama: T[]; pendukung: T[] } {
  const hasCategory = entries.some((e) => e.category);
  if (hasCategory) {
    return {
      utama: entries.filter((e) => e.category === "UTAMA"),
      pendukung: entries.filter((e) => e.category !== "UTAMA"),
    };
  }
  return { utama: entries.slice(0, 1), pendukung: entries.slice(1) };
}

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

/** Supporting documents a company can attach to prove building ownership (MILIK_SENDIRI) — one or more. */
export const OWNERSHIP_DOCUMENT_TYPES = ["SHM", "AJB", "HGB", "LAINNYA"] as const;
export type OwnershipDocumentType = (typeof OWNERSHIP_DOCUMENT_TYPES)[number];
export const OWNERSHIP_DOCUMENT_TYPE_LABELS: Record<OwnershipDocumentType, string> = {
  SHM: "Sertifikat Hak Milik (SHM)",
  AJB: "Akta Jual Beli (AJB)",
  HGB: "Sertifikat Hak Guna Bangunan (HGB)",
  LAINNYA: "Dokumen Lain yang Sah",
};

/** Supporting documents a company can attach to prove building tenure (SEWA) — one or more. */
export const LEASE_DOCUMENT_TYPES = ["SEWA_MENYEWA", "PINJAM_PAKAI", "KERJA_SAMA", "LAINNYA"] as const;
export type LeaseDocumentType = (typeof LEASE_DOCUMENT_TYPES)[number];
export const LEASE_DOCUMENT_TYPE_LABELS: Record<LeaseDocumentType, string> = {
  SEWA_MENYEWA: "Perjanjian Sewa Menyewa Bangunan",
  PINJAM_PAKAI: "Perjanjian Pinjam Pakai Bangunan",
  KERJA_SAMA: "Perjanjian Kerja Sama Penggunaan Fasilitas",
  LAINNYA: "Dokumen Lain yang Sah",
};

export const locationOwnershipDocEntrySchema = z.object({
  type: z.enum(OWNERSHIP_DOCUMENT_TYPES),
  documentPath: z.string().trim().optional(),
});
export type LocationOwnershipDocEntry = z.infer<typeof locationOwnershipDocEntrySchema>;

export const locationLeaseDocEntrySchema = z.object({
  type: z.enum(LEASE_DOCUMENT_TYPES),
  documentPath: z.string().trim().optional(),
});
export type LocationLeaseDocEntry = z.infer<typeof locationLeaseDocEntrySchema>;

const locationBaseSchema = z.object({
  id: z.string(),
  locationType: z.enum(LOCATION_TYPES, { message: "Pilih jenis lokasi" }),
  address: requiredString("Jalan wajib diisi"),
  addressDesa: requiredString("Desa/Kelurahan wajib diisi"),
  addressKecamatan: requiredString("Kecamatan wajib diisi"),
  city: requiredString("Kota/Kabupaten wajib diisi"),
  province: requiredString("Provinsi wajib diisi"),
  country: requiredString("Negara wajib diisi"),
  postalCode: requiredString("Kode pos wajib diisi"),
  googleMapsLink: optionalUrl,
  buildingStatus: z.enum(BUILDING_STATUSES, {
    message: "Pilih status bangunan",
  }),
  ownershipDocuments: z.array(locationOwnershipDocEntrySchema),
  leaseProofOfOwnership: z.string().trim().optional(),
  leaseOriginalOwnerName: z.string().trim().optional(),
  leaseStartDate: z.string().trim().optional(),
  leaseEndDate: z.string().trim().optional(),
  leaseDocuments: z.array(locationLeaseDocEntrySchema),
  warehouseRegistrationType: z.enum(WAREHOUSE_REGISTRATION_TYPES).optional(),
  warehouseRegistrationNumber: z.string().trim().optional(),
  warehouseOwnerNibNumber: z.string().trim().optional(),
  warehouseRegistrationIssueDate: z.string().trim().optional(),
  warehouseRegistrationIssuingAuthority: z.string().trim().optional(),
  warehouseRegistrationDocumentPath: z.string().trim().optional(),
  warehouseLayoutDocumentPath: z.string().trim().optional(),
});

export const locationSchema = locationBaseSchema.superRefine((data, ctx) => {
  if (
    data.buildingStatus === "MILIK_SENDIRI" &&
    (data.ownershipDocuments.length === 0 || data.ownershipDocuments.some((d) => !d.documentPath))
  ) {
    ctx.addIssue({
      code: "custom",
      path: ["ownershipDocuments"],
      message: "Pilih minimal satu dokumen pendukung kepemilikan dan unggah filenya",
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
    if (data.leaseDocuments.length === 0 || data.leaseDocuments.some((d) => !d.documentPath)) {
      ctx.addIssue({
        code: "custom",
        path: ["leaseDocuments"],
        message: "Pilih minimal satu dokumen pendukung penguasaan dan unggah filenya",
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

/**
 * LocationVisit.address (and every downstream report/detail view that reads
 * it) expects the historical "complete address" string. The wizard now
 * collects Jalan/Desa-Kelurahan/Kecamatan as separate fields, so anything
 * that derives a LocationVisit from a payload location must recompose the
 * full string through this helper instead of reading `.address` alone.
 */
export function composeLocationAddress(loc: {
  address?: string;
  addressDesa?: string;
  addressKecamatan?: string;
}): string {
  return [loc.address, loc.addressDesa, loc.addressKecamatan].filter(Boolean).join(", ");
}

export function createEmptyLocation(): Partial<LocationValues> & { id: string } {
  return {
    id: crypto.randomUUID(),
    address: "",
    addressDesa: "",
    addressKecamatan: "",
    city: "",
    province: "",
    country: "Indonesia",
    postalCode: "",
    googleMapsLink: "",
    // Matches the LocationItem UI, which shows the "Milik Sendiri" upload
    // box by default (before the user picks a Status Bangunan toggle) — the
    // field value must agree with that default or validation fails silently.
    buildingStatus: "MILIK_SENDIRI",
    ownershipDocuments: [],
    leaseDocuments: [],
  };
}
