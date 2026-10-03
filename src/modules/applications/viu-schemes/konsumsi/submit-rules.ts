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
  if (!statementEntry?.documentPath) {
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

  // konsumsiDocuments ("Impor Barang Konsumsi") is deliberately NOT required at submit — the
  // exact document list is still pending System Configuration confirmation, so the applicant may
  // leave it empty and a verifikator uploads it on the application's behalf later (same
  // upload-on-behalf path document-versions.ts already supports for every other document key).
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
    if (!entry.applicantRole) {
      ctx.addIssue({
        code: "custom",
        path: ["applicationBrands", index, "applicantRole"],
        message: "Pilih peran pemohon",
      });
    }
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
  // Step "Dokumen Label Produk" — exactly two documents, once per Application (not per Brand or
  // per commodity grouping, see konsumsiLabelDocumentsSchema's own comment). Per-group quality-test
  // certificate completeness is enforced separately in Step "Product Information" (the Merek × Sub
  // Kelompok matrix), not here.
  if (!data.labelStatementDocument?.filePath) {
    ctx.addIssue({
      code: "custom",
      path: ["labelStatementDocument"],
      message: "Unggah Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia",
    });
  }
  if (!data.labelDocumentationDocument?.filePath) {
    ctx.addIssue({
      code: "custom",
      path: ["labelDocumentationDocument"],
      message: "Unggah Dokumentasi Label Produk",
    });
  }
  // Step "Product Information" — Konsumsi's own Merek > Kelompok Komoditas > Produk structure
  // (konsumsiProducts), entirely separate from the shared free-text `products` field (VKI/
  // Industri/Non-Industri, untouched by this scheme). Structural checks only here (presence +
  // exact-duplicate lines); master-data existence (commodityGroupId/hsCode/originCountries) is a
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
    // Country set compared order-independently — [CN, VN] and [VN, CN] are the same product.
    const countryKey = [...product.originCountries].map((c) => c.trim().toLowerCase()).sort().join(",");
    const key = [
      product.brandId,
      product.commodityGroupId,
      product.hsCode.trim().toLowerCase(),
      countryKey,
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

  // Merek x Sub Kelompok certificate-coverage — every group with at least one Product needs at
  // least one `productGroupCertificates` entry. Structural presence check only (DB-backed checks —
  // scope match, expiry — are deliberately left to validateKonsumsiSubmit, same pattern as above).
  // Brand name is resolved from this entry's own `submissionSnapshot` when available (a RETURNED
  // application being resubmitted) — on a brand-new submission there is no snapshot yet and no DB
  // access from this synchronous refinement, so it falls back to the brandId itself. The step's
  // own UI (KonsumsiProductInformation) shows the real name, resolved client-side from
  // `useApplicationBrandOptions`, regardless of which fallback this message uses.
  const brandNameById = new Map(
    data.applicationBrands.map((entry) => [entry.brandId, entry.submissionSnapshot?.brandName ?? entry.brandId]),
  );
  const requiredGroups = new Map<string, { brandId: string; commodityName: string }>();
  data.konsumsiProducts.forEach((product) => {
    const key = `${product.brandId}|${product.commodityGroupId}`;
    if (!requiredGroups.has(key)) {
      requiredGroups.set(key, { brandId: product.brandId, commodityName: product.commodityName || product.commodityGroupId });
    }
  });
  const coveredGroupKeys = new Set(
    (data.productGroupCertificates ?? []).map((certificate) => `${certificate.brandId}|${certificate.commodityGroupId}`),
  );
  for (const [key, group] of requiredGroups) {
    if (!coveredGroupKeys.has(key)) {
      const brandName = brandNameById.get(group.brandId) ?? group.brandId;
      ctx.addIssue({
        code: "custom",
        path: ["productGroupCertificates"],
        message: `Sertifikat Hasil Uji Mutu belum diunggah untuk ${brandName} · ${group.commodityName}`,
      });
    }
  }
}
