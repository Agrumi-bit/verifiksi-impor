import { z } from "zod";

import { qualityTestEntrySchema } from "@/modules/merk/schema";
import { MODAL_STATEMENT_LETTER_DOC_DEF, NON_INDUSTRI_SUPPORT_DOC_DEFS } from "../../financial-capability-defs";
import { APPLICANT_BRAND_ROLES, IMPORT_APPOINTMENT_SOURCES } from "./business-rules";

const requiredString = (message: string) => z.string().trim().min(1, message);

export { APPLICANT_BRAND_ROLES, IMPORT_APPOINTMENT_SOURCES };
export type { ApplicantBrandRole, ImportAppointmentSource } from "./business-rules";

/**
 * One Brand used in this VIU Barang Konsumsi application (Step "Merek yang
 * Digunakan"). `brandId` references an existing Merk row — Brand identity
 * itself (name, owner, evidence, class, documents) is never duplicated here;
 * only this application's own legal-relationship choice is. See
 * business-rules.ts for how these fields turn into a document checklist and
 * readiness state.
 */
export const applicationRelationshipDocumentSchema = z.object({
  filePath: requiredString("File wajib diunggah"),
  fileName: requiredString("Nama file tidak valid"),
});
export type ApplicationRelationshipDocumentValues = z.infer<typeof applicationRelationshipDocumentSchema>;

export const applicationBrandEntrySchema = z.object({
  brandId: requiredString("Merek wajib dipilih"),
  applicantRole: z.enum(APPLICANT_BRAND_ROLES, { message: "Pilih peran pemohon" }),
  appointmentSource: z.enum(IMPORT_APPOINTMENT_SOURCES).optional(),
  officialRepresentativeCompanyId: z.string().trim().optional(),
  // Keyed by the same document codes getVIUConsumptionBrandRequirements /
  // getKonsumsiRelationshipDocuments already produce (e.g.
  // "importer_appointment", "official_rep_deed", "license_or_sublicense") —
  // Brand Master no longer collects any of these at registration time
  // (relationshipWithApiu / representationType were both moved out, see
  // domestic-owner-ownership.tsx and foreign-owner-ownership.tsx's own
  // comments), so every relationship document this application needs is
  // this application's own, not Brand Master's. Which codes are actually
  // required for a given entry is never hardcoded here — it's whatever the
  // rule engine currently resolves.
  relationshipDocuments: z.record(z.string(), applicationRelationshipDocumentSchema).default({}),
  // Server-authoritative snapshot of this brand relationship as it stood at
  // final submit time — populated only by the server (never trust a
  // client-provided value), only once, at promotion from DRAFT to SUBMITTED.
  // See konsumsi/server/validate-submit.ts's buildSubmissionSnapshot. Absent
  // on drafts and on applications submitted before this field existed.
  submissionSnapshot: z
    .object({
      capturedAt: z.string(),
      brandName: z.string(),
      brandOwnerName: z.string().nullable(),
      ownerLocation: z.enum(["domestic", "foreign"]).nullable(),
      trademarkEvidenceType: z.string().nullable(),
      registrationNumber: z.string().nullable(),
      trademarkClass: z.string().nullable(),
      registrationDate: z.string().nullable(),
      officialRepresentativeName: z.string().nullable(),
      relationshipSummary: z.string(),
      readinessAtSubmission: z.enum(["READY", "INCOMPLETE", "NOT_ELIGIBLE"]),
      requiredDocumentLabels: z.array(z.string()),
    })
    .optional(),
});
export type ApplicationBrandEntryValues = z.infer<typeof applicationBrandEntrySchema>;
export type ApplicationBrandSubmissionSnapshot = NonNullable<ApplicationBrandEntryValues["submissionSnapshot"]>;

/** Step "Merek yang Digunakan" — only meaningful when Jenis Impor includes
 * BARANG_KONSUMSI (see step-brands-used.tsx's own empty state otherwise). */
export const brandsUsedSchema = z.object({
  applicationBrands: z.array(applicationBrandEntrySchema).default([]),
});

export function createEmptyApplicationBrand(brandId: string): ApplicationBrandEntryValues {
  return { brandId, applicantRole: "OFFICIAL_REPRESENTATIVE", relationshipDocuments: {} };
}

/**
 * Step "Dokumen Pendukung Merek" — one entry per Brand + Sub Kelompok
 * Komoditas combination used in THIS application, bundling its quality-test
 * certificate together with the two Indonesian-labeling documents regulation
 * requires for the same combination (Surat Pernyataan Pemenuhan Ketentuan
 * Label Berbahasa Indonesia + Dokumentasi Label Produk). Deliberately its own
 * field on the Application payload rather than reusing Merk's own
 * `qualityTests`: most of the rich shape (`qualityTestEntrySchema` — lab,
 * dates, file) applies, but this test result is specific to what's being
 * imported under this application, not a permanent Brand Master record.
 * `brandId` must match one of this application's own `applicationBrands`
 * entries.
 *
 * Classifies by the top two commodity hierarchy levels — "Kelompok
 * Komoditas" (IndustryGroup) and "Sub Kelompok Komoditas" (CommodityGroup) —
 * rather than Brand Master's own CommodityGroup/CommoditySubGroup pair, so
 * `commoditySubGroupId`/`commoditySubGroupName` are dropped in favor of a new
 * `industryGroupId`/`industryName`. `commodityGroupId`/`commodityName` are
 * kept as-is (same CommodityGroup target), now cascading from the selected
 * `industryGroupId` instead of standing alone.
 */
export const applicationBrandQualityTestEntrySchema = qualityTestEntrySchema
  .omit({ commoditySubGroupId: true, commoditySubGroupName: true })
  .extend({
    brandId: requiredString("Merek wajib dipilih"),
    industryGroupId: requiredString("Kelompok Komoditas wajib dipilih"),
    industryName: z.string().trim().optional(),
    labelStatementFilePath: requiredString("Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia wajib diunggah"),
    labelStatementFileName: requiredString("Nama file tidak valid"),
    labelDocumentationFilePath: requiredString("Dokumentasi Label Produk wajib diunggah"),
    labelDocumentationFileName: requiredString("Nama file tidak valid"),
  });
export type ApplicationBrandQualityTestEntryValues = z.infer<typeof applicationBrandQualityTestEntrySchema>;

export function createEmptyApplicationBrandQualityTest(brandId: string): ApplicationBrandQualityTestEntryValues {
  return {
    brandId,
    industryGroupId: "",
    industryName: "",
    commodityGroupId: "",
    commodityName: "",
    certificateNumber: "",
    laboratoryName: "",
    labelStatementFilePath: "",
    labelStatementFileName: "",
    labelDocumentationFilePath: "",
    labelDocumentationFileName: "",
    issueDate: "",
    filePath: "",
    fileName: "",
  };
}

/** Step "Hasil Uji Mutu" — only meaningful when Jenis Impor includes
 * BARANG_KONSUMSI, same gate as `brandsUsedSchema`. */
export const brandQualityTestsSchema = z.object({
  brandQualityTests: z.array(applicationBrandQualityTestEntrySchema).default([]),
});

/** Konsumsi's own "Support Document" field — kept as its own schema object
 * (not declared inline in the shared documents shape) so it has exactly one
 * owner. Item shape mirrors the shared `supportDocumentSchema` in
 * `../../schema.ts` (a generic {id,label,documentPath} triple with no
 * Konsumsi-specific meaning) — not imported from there to avoid a circular
 * import (that file imports this one), so this stays a plain duplicate of
 * that trivial 3-field shape rather than a shared reference. */
const konsumsiSupportDocumentSchema = z.object({
  id: z.string(),
  label: requiredString("Nama dokumen wajib diisi"),
  documentPath: requiredString("Dokumen wajib diunggah"),
});

export const konsumsiDocumentsSchema = z.object({
  konsumsiDocuments: z.array(konsumsiSupportDocumentSchema),
});

/**
 * "Bukti Kemampuan Finansial" — Konsumsi's OWN Surat Pernyataan Kepemilikan Modal Kerja + "pick
 * one" supporting-evidence entry, isolated from Bahan Baku Industri/Non Industri's
 * `nonIndustriDocuments` (applications/schema.ts). Same catalog (financial-capability-defs.ts),
 * same regulatory requirement, but a fully separate array — so a mixed Industri+Konsumsi
 * application never shares one Jumlah Modal Kerja/evidence doc between the two Jenis Impor; each
 * fills in and submits its own.
 */
export const konsumsiFinancialDocumentSchema = z.object({
  key: z.string(),
  enabled: z.boolean(),
  documentPath: z.string().trim().optional(),
  amount: z.string().trim().optional(),
});
export type KonsumsiFinancialDocumentValues = z.infer<typeof konsumsiFinancialDocumentSchema>;

export function createEmptyKonsumsiFinancialDocuments(): KonsumsiFinancialDocumentValues[] {
  return [MODAL_STATEMENT_LETTER_DOC_DEF, ...NON_INDUSTRI_SUPPORT_DOC_DEFS].map((def) => ({ key: def.key, enabled: false }));
}

export const konsumsiFinancialDocumentsSchema = z.object({
  konsumsiFinancialDocuments: z.array(konsumsiFinancialDocumentSchema).default([]),
});

/**
 * Step "Product Information" (shared step, scheme-owned content) — Konsumsi products are
 * structured as Merek (`applicationBrands[].brandId`) > Kelompok Komoditas / Sub Kelompok
 * Komoditas > Produk. The commodity grouping is never picked independently in this step — it's
 * always one of that Brand's own `brandQualityTests` combinations (Step "Dokumen Pendukung
 * Merek"), kept in sync via `deriveKonsumsiProductGroups` below, so a product can never reference
 * a grouping that doesn't also exist there. Entirely separate from the shared `products` field
 * (free-text HS/volume, used by VKI/Industri/Non-Industri — never touched here) since the shapes
 * are structurally incompatible: Konsumsi products carry a Brand/commodity relationship, master-
 * data-backed HS Code + Country of Origin, and per-line pricing the generic product list has no
 * concept of.
 */
const positiveNumberString = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => Number.isFinite(Number(value)) && Number(value) > 0, message);

const nonNegativeNumberString = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0, message);

export const KONSUMSI_PRODUCT_CURRENCIES = ["USD", "IDR", "EUR", "CNY", "JPY"] as const;
export type KonsumsiProductCurrency = (typeof KONSUMSI_PRODUCT_CURRENCIES)[number];

/**
 * A Brand's Kelompok Komoditas / Sub Kelompok Komoditas grouping is never picked independently in
 * this step — it's always derived from that Brand's own `brandQualityTests` entries (Step "Dokumen
 * Pendukung Merek"), so Product Information stays in sync with whatever commodity groupings were
 * already established there. See `deriveKonsumsiProductGroups` below.
 */
export type KonsumsiProductGroup = {
  brandId: string;
  industryGroupId: string;
  industryName?: string;
  commodityGroupId: string;
  commodityName?: string;
};

/** Distinct (industryGroupId, commodityGroupId) pairs per Brand, taken from `brandQualityTests` —
 * the single source of truth for which commodity groupings a Brand has. Dedupes by
 * `commodityGroupId` (it already uniquely implies its parent `industryGroupId`), preserving first-
 * seen order so the UI lists groups in the same order they were added in Step "Dokumen Pendukung
 * Merek". */
export function deriveKonsumsiProductGroups(
  qualityTests: Pick<ApplicationBrandQualityTestEntryValues, "brandId" | "industryGroupId" | "industryName" | "commodityGroupId" | "commodityName">[],
): KonsumsiProductGroup[] {
  const seen = new Set<string>();
  const groups: KonsumsiProductGroup[] = [];
  for (const qt of qualityTests) {
    const key = `${qt.brandId}|${qt.commodityGroupId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push({
      brandId: qt.brandId,
      industryGroupId: qt.industryGroupId,
      industryName: qt.industryName,
      commodityGroupId: qt.commodityGroupId,
      commodityName: qt.commodityName,
    });
  }
  return groups;
}

/** Server-authoritative snapshot of one Product line as it stood at final submit time — same
 * pattern as `ApplicationBrandSubmissionSnapshot`. Populated only by the server (never trust a
 * client-provided value), only once, at promotion from DRAFT to SUBMITTED. Absent on drafts. */
export const konsumsiProductSnapshotSchema = z.object({
  capturedAt: z.string(),
  brandName: z.string(),
  industryName: z.string(),
  commodityName: z.string(),
  hsDescription: z.string(),
  countryOfOriginName: z.string(),
  totalPrice: z.string(),
});
export type KonsumsiProductSnapshot = z.infer<typeof konsumsiProductSnapshotSchema>;

export const konsumsiProductSchema = z.object({
  id: z.string(),
  brandId: requiredString("Merek wajib dipilih"),
  // Both of these always come from a matching `brandQualityTests` entry (same brandId +
  // commodityGroupId) — never picked independently here — so Product Information can't drift out
  // of sync with Step "Dokumen Pendukung Merek". Cached directly on the product (not re-derived by
  // joining against brandQualityTests at render time) so a row stays self-describing even if that
  // quality-test entry is later edited or removed.
  industryGroupId: requiredString("Kelompok komoditas wajib dipilih"),
  industryName: z.string().trim().optional(),
  commodityGroupId: requiredString("Sub kelompok komoditas wajib dipilih"),
  commodityName: z.string().trim().optional(),
  productName: requiredString("Nama produk wajib diisi"),
  // References HS Code master data by its code string (the existing convention — see
  // useHsCodeOptions/the shared productItemSchema, which both key HS Code by the code itself
  // rather than a separate master-data id).
  hsCode: requiredString("HS Code wajib dipilih"),
  hsDescription: z.string().trim().optional(),
  // References Country master data by its name — the existing convention (see
  // useActiveCountries: "value is the country name... used for negara asal style fields").
  countryOfOrigin: requiredString("Negara asal wajib dipilih"),
  countryOfOriginCode: z.string().trim().optional(),
  quantity: positiveNumberString("Jumlah harus lebih besar dari 0"),
  // Derived from the selected HS Code's registered unit ("satuan mengikuti HS Code, bukan
  // diketik bebas" — see use-hs-code-options.ts) — not independently editable.
  unit: z.string().trim().optional(),
  averageUnitPrice: nonNegativeNumberString("Harga satuan rata-rata tidak valid"),
  currency: z.enum(KONSUMSI_PRODUCT_CURRENCIES).default("USD"),
  productSnapshot: konsumsiProductSnapshotSchema.optional(),
});
export type ApplicationKonsumsiProductValues = z.infer<typeof konsumsiProductSchema>;

export function createEmptyKonsumsiProduct(brandId: string, group: KonsumsiProductGroup): ApplicationKonsumsiProductValues {
  return {
    id: crypto.randomUUID(),
    brandId,
    industryGroupId: group.industryGroupId,
    industryName: group.industryName,
    commodityGroupId: group.commodityGroupId,
    commodityName: group.commodityName,
    productName: "",
    hsCode: "",
    countryOfOrigin: "",
    quantity: "",
    averageUnitPrice: "",
    currency: "USD",
  };
}

/** Total is always derived (quantity x averageUnitPrice) — never stored as the source of truth,
 * so it can't drift from its inputs. Returns 0 (not NaN) for incomplete rows mid-edit. */
export function konsumsiProductTotal(product: Pick<ApplicationKonsumsiProductValues, "quantity" | "averageUnitPrice">): number {
  const quantity = Number(product.quantity);
  const price = Number(product.averageUnitPrice);
  if (!Number.isFinite(quantity) || !Number.isFinite(price)) return 0;
  return quantity * price;
}

export const konsumsiProductsSchema = z.object({
  konsumsiProducts: z.array(konsumsiProductSchema).default([]),
});
