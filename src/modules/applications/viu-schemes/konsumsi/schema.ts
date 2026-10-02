import { z } from "zod";

import { qualityTestEntrySchema } from "@/modules/merk/schema";
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
