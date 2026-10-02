// Permanent regression for VIU scheme isolation (Konsumsi / Non-Industri / Industri).
//
// Reproduces and locks in the fix for a real production bug: a VIU KONSUMSI-only application
// (importTypes = ["BARANG_KONSUMSI"]) was blocked at Submit by a validation issue requiring
// Bukti Kemampuan Finansial data that belongs to Bahan Baku Industri/Non Industri
// (`nonIndustriDocuments`) — a field Konsumsi never shows in its own UI and should never be
// required to fill. Root cause: `applyViuOnlySubmitRules` (src/modules/applications/schema.ts)
// used to gate that check on `BAHAN_BAKU_INDUSTRI || BAHAN_BAKU_NON_INDUSTRI || BARANG_KONSUMSI`
// — three schemes sharing ONE financial-document field. Fixed by giving Konsumsi its own,
// separate `konsumsiFinancialDocuments` field (viu-schemes/konsumsi/schema.ts) validated by its
// own `applyKonsumsiSubmitRules`, and removing BARANG_KONSUMSI from the shared check's condition.
//
// This script is the Test A-F regression matrix plus the explicit bug-reproduction case called
// for by that audit. No test runner configured in this project — plain script, run with tsx.
//
// Run with: npx tsx scripts/test-viu-scheme-isolation.mjs
import { getViuWizardSteps } from "../src/modules/applications/wizard-steps-meta.ts";
import { applyViuOnlySubmitRules } from "../src/modules/applications/schema.ts";

let failed = false;
function assert(cond, label) {
  const ok = Boolean(cond);
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label);
}
function keys(steps) {
  return steps.map((s) => s.key);
}

function runSubmitRules(data) {
  const issues = [];
  applyViuOnlySubmitRules(
    {
      declarationAccepted: true,
      importTypes: [],
      partnerIndustriEntries: [],
      nonIndustriDocuments: [],
      konsumsiFinancialDocuments: [],
      konsumsiDocuments: [],
      applicationBrands: [],
      brandQualityTests: [],
      konsumsiProducts: [],
      products: [],
      ...data,
    },
    { addIssue: (i) => issues.push(i) },
  );
  return issues.map((i) => `${i.path.join(".")}: ${i.message}`).sort();
}

// ---------------------------------------------------------------------------
// Fully-satisfied fixtures per scheme — each one, on its own, must submit clean.
// ---------------------------------------------------------------------------

const validIndustri = {
  importTypes: ["BAHAN_BAKU_INDUSTRI"],
  partnerIndustriEntries: [{ partnerId: "p1", enabled: true }],
  nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "modal.pdf", amount: "500000000" }],
  products: [{ id: "prod1", materialType: "Benang Katun", hsCode: "52053100" }],
};

const validNonIndustri = {
  importTypes: ["BAHAN_BAKU_NON_INDUSTRI"],
  nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "modal.pdf", amount: "300000000" }],
  products: [{ id: "prod1", materialType: "Resin PET", hsCode: "39076100" }],
};

const validKonsumsi = {
  importTypes: ["BARANG_KONSUMSI"],
  konsumsiFinancialDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "modal-konsumsi.pdf", amount: "100000000" }],
  konsumsiDocuments: [{ id: "1", label: "Dokumen Impor Konsumsi", documentPath: "x.pdf" }],
  applicationBrands: [{ brandId: "b1", applicantRole: "OWNER", relationshipDocuments: {} }],
  brandQualityTests: [{ brandId: "b1" }],
  konsumsiProducts: [
    {
      id: "p1",
      brandId: "b1",
      commodityGroupId: "cg1",
      productName: "Men's Cotton T-Shirt",
      hsCode: "61091000",
      countryOfOrigin: "Vietnam",
      quantity: "1000",
      averageUnitPrice: "3.5",
      currency: "USD",
    },
  ],
};

console.log("--- TEST A: VIU Konsumsi only ---");
assert(keys(getViuWizardSteps(["BARANG_KONSUMSI"])).join(",") === "company,application-info,legal,tax,location,brands-used,quality-test,support-document,product-info,preview,submit", "Konsumsi-only step list matches approved flow (1 Company .. 9 Produk + Preview/Submit)");
assert(runSubmitRules(validKonsumsi).length === 0, "Valid Konsumsi-only application submits clean");
assert(!runSubmitRules(validKonsumsi).some((i) => i.startsWith("nonIndustriDocuments")), "No nonIndustriDocuments issue for Konsumsi-only");
assert(!runSubmitRules(validKonsumsi).some((i) => i.startsWith("partnerIndustriEntries")), "No partnerIndustriEntries issue for Konsumsi-only");
assert(!runSubmitRules(validKonsumsi).some((i) => i.startsWith("products:")), "No generic products issue for Konsumsi-only");

console.log("--- TEST B: VIU Non Industri only ---");
assert(keys(getViuWizardSteps(["BAHAN_BAKU_NON_INDUSTRI"])).join(",") === "company,application-info,legal,tax,location,support-document,product-info,preview,submit", "Non-Industri-only step list has no Konsumsi/Partner Industri steps");
assert(runSubmitRules(validNonIndustri).length === 0, "Valid Non-Industri-only application submits clean");
assert(!runSubmitRules(validNonIndustri).some((i) => i.startsWith("applicationBrands")), "No Brand Konsumsi issue for Non-Industri-only");
assert(!runSubmitRules(validNonIndustri).some((i) => i.startsWith("konsumsiProducts")), "No Konsumsi Product issue for Non-Industri-only");
assert(!runSubmitRules(validNonIndustri).some((i) => i.startsWith("partnerIndustriEntries")), "No Partner Industri issue for Non-Industri-only");
assert(!runSubmitRules(validNonIndustri).some((i) => i.startsWith("konsumsiFinancialDocuments")), "No Konsumsi financial-doc issue for Non-Industri-only");

console.log("--- TEST C: VIU Industri only ---");
assert(keys(getViuWizardSteps(["BAHAN_BAKU_INDUSTRI"])).join(",") === "company,application-info,legal,tax,location,partner-industri,support-document,product-info,preview,submit", "Industri-only step list has Partner Industri, no Konsumsi steps");
assert(runSubmitRules(validIndustri).length === 0, "Valid Industri-only application submits clean");
assert(!runSubmitRules(validIndustri).some((i) => i.startsWith("applicationBrands")), "No Brand Konsumsi issue for Industri-only");
assert(!runSubmitRules(validIndustri).some((i) => i.startsWith("konsumsiProducts")), "No Konsumsi Product issue for Industri-only");
assert(!runSubmitRules(validIndustri).some((i) => i.startsWith("konsumsiFinancialDocuments")), "No Konsumsi financial-doc issue for Industri-only");

console.log("--- TEST D: Industri + Konsumsi ---");
assert(
  runSubmitRules({
    importTypes: ["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"],
    partnerIndustriEntries: validIndustri.partnerIndustriEntries,
    nonIndustriDocuments: validIndustri.nonIndustriDocuments,
    products: validIndustri.products,
    konsumsiFinancialDocuments: validKonsumsi.konsumsiFinancialDocuments,
    konsumsiDocuments: validKonsumsi.konsumsiDocuments,
    applicationBrands: validKonsumsi.applicationBrands,
    brandQualityTests: validKonsumsi.brandQualityTests,
    konsumsiProducts: validKonsumsi.konsumsiProducts,
  }).length === 0,
  "Industri + Konsumsi, both schemes' requirements satisfied -> clean",
);

console.log("--- TEST E: Non Industri + Konsumsi ---");
assert(
  runSubmitRules({
    importTypes: ["BAHAN_BAKU_NON_INDUSTRI", "BARANG_KONSUMSI"],
    nonIndustriDocuments: validNonIndustri.nonIndustriDocuments,
    products: validNonIndustri.products,
    konsumsiFinancialDocuments: validKonsumsi.konsumsiFinancialDocuments,
    konsumsiDocuments: validKonsumsi.konsumsiDocuments,
    applicationBrands: validKonsumsi.applicationBrands,
    brandQualityTests: validKonsumsi.brandQualityTests,
    konsumsiProducts: validKonsumsi.konsumsiProducts,
  }).length === 0,
  "Non Industri + Konsumsi, both schemes' requirements satisfied -> clean",
);
assert(
  !runSubmitRules({
    importTypes: ["BAHAN_BAKU_NON_INDUSTRI", "BARANG_KONSUMSI"],
    nonIndustriDocuments: validNonIndustri.nonIndustriDocuments,
    products: validNonIndustri.products,
    konsumsiFinancialDocuments: validKonsumsi.konsumsiFinancialDocuments,
    konsumsiDocuments: validKonsumsi.konsumsiDocuments,
    applicationBrands: validKonsumsi.applicationBrands,
    brandQualityTests: validKonsumsi.brandQualityTests,
    konsumsiProducts: validKonsumsi.konsumsiProducts,
  }).some((i) => i.startsWith("partnerIndustriEntries")),
  "Non Industri + Konsumsi never requires Partner Industri (Industri not selected)",
);

console.log("--- TEST F: All three schemes ---");
assert(
  runSubmitRules({
    importTypes: ["BAHAN_BAKU_INDUSTRI", "BAHAN_BAKU_NON_INDUSTRI", "BARANG_KONSUMSI"],
    partnerIndustriEntries: validIndustri.partnerIndustriEntries,
    nonIndustriDocuments: validIndustri.nonIndustriDocuments,
    products: validIndustri.products,
    konsumsiFinancialDocuments: validKonsumsi.konsumsiFinancialDocuments,
    konsumsiDocuments: validKonsumsi.konsumsiDocuments,
    applicationBrands: validKonsumsi.applicationBrands,
    brandQualityTests: validKonsumsi.brandQualityTests,
    konsumsiProducts: validKonsumsi.konsumsiProducts,
  }).length === 0,
  "All three schemes, every requirement satisfied -> clean",
);

console.log("--- BUG REPRODUCTION: Konsumsi-only + nonIndustriDocuments empty/undefined must NOT block submit ---");
assert(
  runSubmitRules({ ...validKonsumsi, nonIndustriDocuments: [] }).length === 0,
  "Konsumsi-only, fully valid, nonIndustriDocuments=[] -> submit succeeds (the exact reported bug)",
);
assert(
  runSubmitRules({ ...validKonsumsi, nonIndustriDocuments: undefined }).length === 0,
  "Konsumsi-only, fully valid, nonIndustriDocuments=undefined -> submit succeeds",
);

console.log("--- SCHEME LEAK TEST: inactive scheme fields may be undefined/[]/empty without ever causing an issue ---");
const inactiveFieldStates = [undefined, []];
for (const state of inactiveFieldStates) {
  assert(
    runSubmitRules({ ...validKonsumsi, nonIndustriDocuments: state, partnerIndustriEntries: state, products: state }).length === 0,
    `Konsumsi-only tolerates inactive Industri/Non-Industri fields as ${JSON.stringify(state)}`,
  );
  assert(
    runSubmitRules({ ...validIndustri, konsumsiFinancialDocuments: state, konsumsiDocuments: state, applicationBrands: state, brandQualityTests: state, konsumsiProducts: state }).length === 0,
    `Industri-only tolerates inactive Konsumsi fields as ${JSON.stringify(state)}`,
  );
  assert(
    runSubmitRules({ ...validNonIndustri, konsumsiFinancialDocuments: state, konsumsiDocuments: state, applicationBrands: state, brandQualityTests: state, konsumsiProducts: state, partnerIndustriEntries: state }).length === 0,
    `Non-Industri-only tolerates inactive Konsumsi/Partner Industri fields as ${JSON.stringify(state)}`,
  );
}

console.log(failed ? "\nFAILED" : "\nAll VIU scheme isolation checks passed.");
process.exit(failed ? 1 : 0);
