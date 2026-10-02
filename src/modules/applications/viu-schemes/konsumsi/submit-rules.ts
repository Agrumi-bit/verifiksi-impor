import type { z } from "zod";

import type { ApplicationWizardValues } from "../../schema";
import { MODAL_STATEMENT_LETTER_DOC_DEF } from "../../financial-capability-defs";

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
  // Bukti Kemampuan Finansial — Konsumsi's OWN `konsumsiFinancialDocuments`, isolated from Bahan
  // Baku Industri/Non Industri's `nonIndustriDocuments` check in the shared
  // `applyViuOnlySubmitRules` (applications/schema.ts). Same requirement, separate data.
  const statementEntry = data.konsumsiFinancialDocuments.find((doc) => doc.key === MODAL_STATEMENT_LETTER_DOC_DEF.key);
  if (!statementEntry?.enabled || !statementEntry.documentPath) {
    ctx.addIssue({
      code: "custom",
      path: ["konsumsiFinancialDocuments"],
      message: "Unggah Surat Pernyataan Kepemilikan Modal Kerja",
    });
  } else if (!statementEntry.amount?.trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["konsumsiFinancialDocuments"],
      message: "Isi jumlah modal kerja pada Surat Pernyataan Kepemilikan Modal Kerja",
    });
  }

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
  // Step "Product Information" — Konsumsi's own Merek > Kelompok Komoditas > Produk structure
  // (konsumsiProducts), entirely separate from the shared free-text `products` field (VKI/
  // Industri/Non-Industri, untouched by this scheme). Structural checks only here (presence +
  // exact-duplicate lines); master-data existence (commodityGroupId/hsCode/countryOfOrigin) is a
  // DB read, deliberately left to validateKonsumsiSubmit.
  if (data.konsumsiProducts.length < 1) {
    ctx.addIssue({
      code: "custom",
      path: ["konsumsiProducts"],
      message: "Tambahkan minimal satu produk",
    });
  }
  const seenProductKeys = new Set<string>();
  data.konsumsiProducts.forEach((product, index) => {
    const key = [
      product.brandId,
      product.commodityGroupId,
      product.hsCode.trim().toLowerCase(),
      product.countryOfOrigin.trim().toLowerCase(),
      product.productName.trim().toLowerCase(),
    ].join("|");
    if (seenProductKeys.has(key)) {
      ctx.addIssue({
        code: "custom",
        path: ["konsumsiProducts", index, "productName"],
        message: "Produk ini sudah ada untuk kombinasi merek, kelompok komoditas, HS Code, dan negara asal yang sama",
      });
    }
    seenProductKeys.add(key);
  });
}
