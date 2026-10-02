import type { z } from "zod";

import type { ApplicationWizardValues } from "../../schema";

/**
 * Every cross-field submit-time rule exclusive to VIU Barang Konsumsi
 * (Merek yang Digunakan structural checks, Hasil Uji Mutu completeness,
 * Konsumsi Support Document). Extracted from the shared
 * `applyViuOnlySubmitRules` in `../../schema.ts`, which still owns the
 * declaration-checkbox check (applies to every VIU scheme) and the legacy
 * Industri/Non-Industri checks (not yet separated into their own scheme
 * modules — see the VIU Konsumsi implementation plan).
 *
 * Called only when `importTypes.includes("BARANG_KONSUMSI")` — same
 * structural guarantee `applyViuOnlySubmitRules` itself relies on: a VKI
 * payload can never reach this function, and a VIU payload without
 * BARANG_KONSUMSI selected never runs these checks.
 *
 * Document-level completeness (which `relationshipDocuments` codes are
 * actually required for a given brand entry) depends on the brand's
 * ownerLocation/evidenceType from the DB — deliberately NOT enforced here
 * (this is a synchronous Zod refinement, no DB read available). The
 * server-side `validateKonsumsiSubmit` re-runs `getVIUConsumptionBrandRequirements`
 * with a real DB read and blocks submit there instead.
 */
export function applyKonsumsiSubmitRules(data: ApplicationWizardValues, ctx: z.RefinementCtx): void {
  if (data.konsumsiDocuments.length < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["konsumsiDocuments"],
      message: "Tambahkan minimal satu dokumen pendukung",
    });
  }
  // Structural validity only (at least one Brand, and each entry's own
  // role/appointment/representative shape). Readiness (evidence validity,
  // relationship rules, document completeness) is deliberately NOT enforced
  // here — an INCOMPLETE Brand may still continue past this step per the
  // Continue Rule; only Submit is expected to block on it, and that block
  // happens via validateKonsumsiSubmit, not this schema.
  if (data.applicationBrands.length < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["applicationBrands"],
      message: "Pilih atau tambahkan minimal satu merek yang digunakan",
    });
  }
  data.applicationBrands.forEach((entry, index) => {
    if (entry.applicantRole === "IMPORTER_ONLY" && !entry.appointmentSource) {
      ctx.addIssue({
        code: "custom",
        path: ["applicationBrands", index, "appointmentSource"],
        message: "Pilih sumber penunjukan importir",
      });
    }
    if (entry.appointmentSource === "OFFICIAL_REPRESENTATIVE" && !entry.officialRepresentativeCompanyId) {
      ctx.addIssue({
        code: "custom",
        path: ["applicationBrands", index, "officialRepresentativeCompanyId"],
        message: "Pilih Perwakilan Resmi",
      });
    }
  });
  // Every Brand used in this application needs at least one Dokumen
  // Pendukung Merek entry of its own (quality-test certificate + label
  // compliance documents — see brandQualityTestsSchema's own comment on why
  // this isn't Merk's qualityTests reused as-is).
  const brandIdsMissingQualityTest = data.applicationBrands
    .map((entry) => entry.brandId)
    .filter((brandId) => !data.brandQualityTests.some((qt) => qt.brandId === brandId));
  if (brandIdsMissingQualityTest.length > 0) {
    ctx.addIssue({
      code: "custom",
      path: ["brandQualityTests"],
      message: `${brandIdsMissingQualityTest.length} merek belum memiliki dokumen pendukung merek`,
    });
  }
}
