import { z } from "zod";

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
  // No default — a newly-added Brand must have its role explicitly chosen (see
  // createEmptyApplicationBrand's own comment), never silently defaulted to a role that implies
  // a relationship the applicant never actually confirmed. Required at submit via
  // applyKonsumsiSubmitRules, same deferred-validation pattern every other Konsumsi field uses.
  applicantRole: z.enum(APPLICANT_BRAND_ROLES, { message: "Pilih peran pemohon" }).optional(),
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
    .optional()
    // Server-written, display-only: a snapshot in an older shape must never block editing — drop it
    // (the server rebuilds it at submit; the review falls back to a live Brand Master lookup).
    .catch(undefined),
});
export type ApplicationBrandEntryValues = z.infer<typeof applicationBrandEntrySchema>;
export type ApplicationBrandSubmissionSnapshot = NonNullable<ApplicationBrandEntryValues["submissionSnapshot"]>;

/** Step "Merek yang Digunakan" — only meaningful when Jenis Impor includes
 * BARANG_KONSUMSI (see step-brands-used.tsx's own empty state otherwise). */
export const brandsUsedSchema = z.object({
  applicationBrands: z.array(applicationBrandEntrySchema).default([]),
});

export function createEmptyApplicationBrand(brandId: string): ApplicationBrandEntryValues {
  // Role intentionally left unset — see applicationBrandEntrySchema's own comment.
  return { brandId, relationshipDocuments: {} };
}

/**
 * Step "Dokumen Label Produk" (formerly "Dokumen Pendukung Merek") — exactly two documents,
 * once per Application, not per Brand or per commodity grouping: Surat Pernyataan Pemenuhan
 * Ketentuan Label Berbahasa Indonesia and Dokumentasi Label Produk. Optional at the schema level
 * (the wizard's own "Continue past an incomplete step" rule) — required-ness for actual Submit is
 * enforced in `applyKonsumsiSubmitRules`, same deferred-validation pattern every other Konsumsi
 * document uses.
 */
export const konsumsiLabelDocumentsSchema = z.object({
  // `.nullable()` matters here: a draft/submitted application re-opened after Stage D's cleanup
  // (or any server round-trip) stores an un-set document as `null`, not `undefined` — without
  // `.nullable()` that null fails base type validation with zod's raw "Invalid input: expected
  // object, received null" before `applyKonsumsiSubmitRules`'s own friendly required-message
  // issue ever gets a chance to surface.
  labelStatementDocument: applicationRelationshipDocumentSchema.nullable().optional(),
  labelDocumentationDocument: applicationRelationshipDocumentSchema.nullable().optional(),
});
export type KonsumsiLabelDocumentsValues = z.infer<typeof konsumsiLabelDocumentsSchema>;

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
 * structured as Merek (`applicationBrands[].brandId`) > Sub Kelompok Komoditas > Produk. The
 * commodity grouping is NEVER picked independently in this step — it's always derived bottom-up
 * from each product's own selected HS Code (`hsCodeId` → its master-data
 * commoditySubGroupId/commodityGroupId/industryGroupId chain), see `deriveProductGroups` below.
 * This is the inverse of this step's previous design (grouping picked first in Step "Dokumen
 * Pendukung Merek", products filed into it after) — that step no longer exists in that form; see
 * the Step 7/9 refactor. Entirely separate from the shared `products` field (free-text HS/volume,
 * used by VKI/Industri/Non-Industri — never touched here) since the shapes are structurally
 * incompatible: Konsumsi products carry a Brand/commodity relationship, master-data-backed HS Code
 * + Country of Origin, and per-line pricing the generic product list has no concept of.
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
 * A Brand's Sub Kelompok Komoditas grouping is derived bottom-up from its own products' HS Code
 * selections — never picked independently. `industryGroupId`/`industryName` are shown as "context"
 * only (and may be absent: `CommodityGroup.industryGroupId` is nullable in master data for rows
 * that predate that level — see use-hs-code-options.ts's own comment).
 */
export type KonsumsiProductGroup = {
  brandId: string;
  commodityGroupId: string;
  commodityName?: string;
  industryGroupId?: string;
  industryName?: string;
};

/** The one (brand, Sub Kelompok) grouping key — used by the matrix, client submit rules and the
 * server's certificate-coverage check alike, so client and server can never group differently. */
export function productGroupKey(group: { brandId?: string; commodityGroupId?: string }): string {
  return `${group.brandId ?? ""}|${group.commodityGroupId ?? ""}`;
}

/** Distinct (brandId, commodityGroupId) pairs, taken from `konsumsiProducts` — the single source
 * of truth for which commodity groupings a Brand has (replaces the old Step "Dokumen Pendukung
 * Merek"-sourced `deriveKonsumsiProductGroups`). Dedupes by `commodityGroupId` (it already
 * uniquely implies its parent `industryGroupId`), preserving first-seen order. */
export function deriveProductGroups(
  // Loosely-typed on purpose: callers commonly pass a react-hook-form `useWatch` snapshot, whose
  // deep-partial type makes every field `| undefined` mid-edit — never trust it as a guarantee of
  // completeness, hence the `!product.commodityGroupId` guard below.
  products: { brandId?: string; commodityGroupId?: string; commodityName?: string; industryGroupId?: string; industryName?: string }[],
): KonsumsiProductGroup[] {
  const seen = new Set<string>();
  const groups: KonsumsiProductGroup[] = [];
  for (const product of products) {
    if (!product.brandId || !product.commodityGroupId) continue;
    const key = productGroupKey(product);
    if (seen.has(key)) continue;
    seen.add(key);
    groups.push({
      brandId: product.brandId,
      commodityGroupId: product.commodityGroupId,
      commodityName: product.commodityName,
      industryGroupId: product.industryGroupId || undefined,
      industryName: product.industryName,
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
  countryOfOriginNames: z.array(z.string()),
  totalPrice: z.string(),
});
export type KonsumsiProductSnapshot = z.infer<typeof konsumsiProductSnapshotSchema>;

export const konsumsiProductSchema = z.object({
  id: z.string(),
  brandId: requiredString("Merek wajib dipilih"),
  // The entire commodity chain is derived from `hsCodeId` (master-data FK) at selection time —
  // never picked independently — so Product Information can't drift out of sync with HS Code
  // master data. Cached directly on the product (not re-derived by joining at render time) so a
  // row stays self-describing even if the master-data row is later changed; re-validated against
  // live master data server-side at submit (see validateKonsumsiProducts).
  hsCodeId: requiredString("HS Code wajib dipilih"),
  // Kept alongside `hsCodeId` as the display/snapshot/Excel-export convention (the code string
  // itself, e.g. "6109.10.00") — `hsCodeId` is the source of truth, this is a cache.
  hsCode: requiredString("HS Code wajib dipilih"),
  hsDescription: z.string().trim().optional(),
  // "Komoditas" — CommoditySubGroup, the 3rd/deepest hierarchy level. Konsumsi's matrix groups by
  // the 2nd level (commodityGroupId) only; this is carried for completeness/display and for a
  // future deeper breakdown, never required independently of hsCodeId.
  commoditySubGroupId: z.string().trim().optional(),
  commoditySubGroupName: z.string().trim().optional(),
  // "Sub Kelompok Komoditas" — CommodityGroup. This is the level the Merek x Sub Kelompok matrix
  // and the certificate-coverage requirement both key off.
  commodityGroupId: requiredString("Sub kelompok komoditas wajib dipilih"),
  commodityName: z.string().trim().optional(),
  // "Kelompok Komoditas" — IndustryGroup, shown as context only. May be absent: `CommodityGroup.
  // industryGroupId` is nullable in master data (rows predating that level) — render "—", never an
  // error, when empty (see use-hs-code-options.ts's own comment).
  industryGroupId: z.string().trim().optional(),
  industryName: z.string().trim().optional(),
  productName: requiredString("Nama produk wajib diisi"),
  // Multi-select, unlike every other "negara asal" field in this app (VKI/Industri's own
  // `products[].countryOfOrigin` stays single-value and name-keyed via useActiveCountries — this
  // is Konsumsi's own field, deliberately diverging). Stores ISO codes (the master data's own
  // `code` column), not names — codes are stable identifiers; names are a display cache only (see
  // `originCountryNames` below), re-resolved from live master data server-side at submit.
  originCountries: z
    .array(z.string().trim().min(1))
    .min(1, "Pilih minimal satu negara asal")
    .refine((codes) => new Set(codes).size === codes.length, "Negara asal tidak boleh duplikat"),
  // Display cache parallel to `originCountries` (same index order) — never the source of truth.
  originCountryNames: z.array(z.string()).optional(),
  // "Jumlah Permohonan" — how much of this product THIS application is requesting to import,
  // never the company's on-hand stock (see `stockQuantity` below, a separate concept).
  quantity: positiveNumberString("Jumlah permohonan harus lebih besar dari 0"),
  // Derived from the selected HS Code's registered unit ("satuan mengikuti HS Code, bukan
  // diketik bebas" — see use-hs-code-options.ts) — not independently editable.
  unit: z.string().trim().optional(),
  // "Jumlah Stock" — the company's current on-hand stock of this product, independent of how
  // much is being requested in `quantity` above. Defaults to "0" (a new product line commonly
  // has no stock yet), never required to be filled in beyond that default.
  stockQuantity: nonNegativeNumberString("Jumlah stock tidak valid").default("0"),
  averageUnitPrice: nonNegativeNumberString("Harga satuan rata-rata tidak valid"),
  currency: z.enum(KONSUMSI_PRODUCT_CURRENCIES).default("USD"),
  // Server-written, display-only: a snapshot in an older shape (see normalizeKonsumsiPayload) must
  // never block editing — dropped if still invalid; the server rewrites it at submit.
  productSnapshot: konsumsiProductSnapshotSchema.optional().catch(undefined),
  // Set by `resyncKonsumsiProductCommodities` when the HS Code master data moved this product to a
  // different Sub Kelompok after it was entered — the OLD Sub Kelompok name, shown as "Sub Kelompok
  // diperbarui mengikuti master HS Code". Display-only; cleared by the server at submit.
  commodityGroupChangedFrom: z.string().optional(),
});
export type ApplicationKonsumsiProductValues = z.infer<typeof konsumsiProductSchema>;

/** A brand-new Product line, with no HS Code picked yet — every commodity-chain field starts
 * empty and is filled in all at once the moment the user picks an HS Code (see
 * ProductFormSheet's own `handleHsCodeChange`). Unlike the old (pre-refactor) shape, this never
 * takes a pre-existing group — a product's group is a *consequence* of its HS Code pick, not a
 * precondition for creating it. */
export function createEmptyKonsumsiProduct(brandId: string): ApplicationKonsumsiProductValues {
  return {
    id: crypto.randomUUID(),
    brandId,
    hsCodeId: "",
    hsCode: "",
    commoditySubGroupId: "",
    commodityGroupId: "",
    industryGroupId: "",
    productName: "",
    originCountries: [],
    quantity: "",
    stockQuantity: "0",
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

/**
 * One Hasil Uji Mutu certificate per (Brand x Sub Kelompok Komoditas) group that has at least one
 * Product — the requirement the Merek x Sub Kelompok matrix enforces. Either references an
 * existing `BrandQualityTest` row (`qualityTestId` set — merk & commodityGroup must match, never
 * duplicated into a new row) or carries a freshly-uploaded certificate's own fields. `validUntil`
 * maps 1:1 to `BrandQualityTest.expiryDate` at sync time (see application-relationship-sync.ts's
 * sibling service for this data) — kept as its own name here since "berlaku sampai" reads more
 * naturally than "kedaluwarsa" on a certificate the applicant is actively attaching, but it is the
 * same concept, never a second field on the Prisma side.
 */
export const productGroupCertificateSchema = z.object({
  brandId: requiredString("Merek wajib dipilih"),
  commodityGroupId: requiredString("Sub Kelompok Komoditas wajib dipilih"),
  // Display cache only (same convention as konsumsiProductSchema's own commodityName) — never the
  // source of truth, re-resolved from commodityGroupId wherever it matters (validation, sync).
  commodityName: z.string().trim().optional(),
  // Set only when "Pilih sertifikat yang sudah ada" was used — references a real BrandQualityTest
  // row id. When set, certificateNumber/laboratoryName/issueDate/validUntil/fileName/filePath below
  // are a read-only display cache of that row (re-resolved from the DB at submit — see
  // validateKonsumsiSubmit — never trusted from the client alone), not independently editable.
  qualityTestId: z.string().trim().optional(),
  // One certificate may cover several Sub Kelompok of the same Brand: every group entry using the
  // same freshly-uploaded certificate carries the same `certificateKey` (and identical data — see
  // shared-certificates.ts), and syncs into ONE BrandQualityTest row with N coverage rows. Absent
  // on entries saved before sharing existed — those are their own, unshared certificate.
  certificateKey: z.string().trim().optional(),
  certificateNumber: requiredString("Nomor sertifikat wajib diisi"),
  laboratoryName: requiredString("Nama laboratorium wajib diisi"),
  issueDate: requiredString("Tanggal terbit wajib diisi"),
  // Optional — an empty value is a warning ("sertifikat tidak punya batas berlaku, verifikator
  // perlu konfirmasi ulang"), never a submit-blocking error (see applyKonsumsiSubmitRules).
  validUntil: z.string().trim().optional(),
  fileName: requiredString("Nama file tidak valid"),
  filePath: requiredString("File sertifikat wajib diunggah"),
});
export type ProductGroupCertificateValues = z.infer<typeof productGroupCertificateSchema>;

export function createEmptyProductGroupCertificate(brandId: string, commodityGroupId: string, commodityName?: string): ProductGroupCertificateValues {
  return {
    brandId,
    commodityGroupId,
    commodityName,
    certificateNumber: "",
    laboratoryName: "",
    issueDate: "",
    fileName: "",
    filePath: "",
  };
}

export const productGroupCertificatesSchema = z.object({
  productGroupCertificates: z.array(productGroupCertificateSchema).default([]),
});
