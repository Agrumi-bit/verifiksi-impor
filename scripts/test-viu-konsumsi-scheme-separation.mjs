// Regression check for the VIU Konsumsi scheme-separation refactor:
//   - Option A step visibility (Konsumsi/Industri steps appear only when
//     their importType is selected, steps renumber dynamically)
//   - stable currentStepKey draft-resume resolution (never trusts a raw
//     step number across saves, since step numbers shift)
//   - submit-rule parity across Industri / Non-Industri / Konsumsi / mixed
//     (confirms extracting applyKonsumsiSubmitRules out of the shared
//     applyViuOnlySubmitRules changed nothing observable)
//
// No test runner configured in this project — plain script, run directly
// with tsx. Exits non-zero if any assertion fails.
//
// Run with: npx tsx scripts/test-viu-konsumsi-scheme-separation.mjs
import { getViuWizardSteps, VKI_WIZARD_STEPS, VIU_WIZARD_STEPS } from "../src/modules/applications/wizard-steps-meta.ts";
import { VIU_STEP_FIELD_NAMES, VKI_STEP_FIELD_NAMES, applyViuOnlySubmitRules } from "../src/modules/applications/schema.ts";

let failed = false;
function assert(cond, label) {
  const ok = Boolean(cond);
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label);
}
function keys(steps) {
  return steps.map((s) => s.key).join(",");
}

console.log("--- Step visibility (Option A) ---");

const konsumsiOnly = getViuWizardSteps(["BARANG_KONSUMSI"]);
assert(
  keys(konsumsiOnly) === "company,application-info,legal,tax,location,brands-used,quality-test,support-document,product-info,preview,submit",
  "Konsumsi only: brands-used/quality-test present, partner-industri absent",
);

const industriOnly = getViuWizardSteps(["BAHAN_BAKU_INDUSTRI"]);
assert(
  keys(industriOnly) === "company,application-info,legal,tax,location,partner-industri,support-document,product-info,preview,submit",
  "Industri only: no Konsumsi steps",
);

const nonIndustriOnly = getViuWizardSteps(["BAHAN_BAKU_NON_INDUSTRI"]);
assert(
  keys(nonIndustriOnly) === "company,application-info,legal,tax,location,support-document,product-info,preview,submit",
  "Non-Industri only: no Konsumsi/Industri steps",
);

const mixed = getViuWizardSteps(["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"]);
assert(
  keys(mixed) === "company,application-info,legal,tax,location,brands-used,quality-test,partner-industri,support-document,product-info,preview,submit",
  "Mixed Industri+Konsumsi: both scheme contributions present",
);

for (const [label, steps] of [["konsumsiOnly", konsumsiOnly], ["industriOnly", industriOnly], ["mixed", mixed]]) {
  const nums = steps.map((s) => s.step).join(",");
  const expected = steps.map((_, i) => i + 1).join(",");
  assert(nums === expected, `${label}: sequential renumbering (${nums})`);
}

assert(
  konsumsiOnly.find((s) => s.key === "support-document").title === "Bukti Kemampuan Finansial",
  "Konsumsi: Support Document step renamed to Bukti Kemampuan Finansial",
);
assert(
  mixed.find((s) => s.key === "support-document").title === "Bukti Kemampuan Finansial",
  "Mixed Industri+Konsumsi: still renamed (Konsumsi present)",
);
assert(
  industriOnly.find((s) => s.key === "support-document").title === "Support Document",
  "Industri alone: generic Support Document title unchanged",
);

assert(VIU_WIZARD_STEPS.length === 12, "VIU_WIZARD_STEPS (full/unfiltered) still has all 12 steps");
for (const s of VIU_WIZARD_STEPS) {
  assert(s.key in VIU_STEP_FIELD_NAMES, `VIU_STEP_FIELD_NAMES has "${s.key}"`);
}
assert(!("brands-used" in VKI_STEP_FIELD_NAMES), "VKI_STEP_FIELD_NAMES does not leak Konsumsi keys");

console.log("--- Stable currentStepKey resume resolution ---");

function resolveTarget(payload) {
  const savedKey = payload._meta?.currentStepKey;
  if (!savedKey) return undefined;
  const steps = payload.verificationType === "VKI" ? VKI_WIZARD_STEPS : getViuWizardSteps(payload.importTypes ?? []);
  return steps.find((s) => s.key === savedKey)?.step;
}

assert(
  resolveTarget({ verificationType: "VIU", importTypes: ["BARANG_KONSUMSI"], _meta: { currentStepKey: "brands-used" } }) === 6,
  "resume brands-used with Konsumsi selected -> step 6",
);
assert(
  resolveTarget({ verificationType: "VIU", importTypes: ["BARANG_KONSUMSI"] }) === undefined,
  "legacy draft with no _meta -> undefined (caller falls back to step 1)",
);
assert(
  resolveTarget({ verificationType: "VIU", importTypes: ["BAHAN_BAKU_INDUSTRI"], _meta: { currentStepKey: "brands-used" } }) === undefined,
  "saved step's scheme since deselected -> undefined (safe fallback, never wrong step)",
);
assert(
  resolveTarget({ verificationType: "VKI", importTypes: [], _meta: { currentStepKey: "data-mesin" } }) === 7,
  "VKI resume by key -> step 7",
);

console.log("--- Submit-rule parity (Industri / Non-Industri / Konsumsi / mixed) ---");

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

assert(
  JSON.stringify(runSubmitRules({ declarationAccepted: false })) === JSON.stringify([
    "declarationAccepted: Anda harus menyetujui pernyataan ini sebelum submit",
  ]),
  "no importTypes, no declaration -> only declaration issue",
);

assert(
  JSON.stringify(runSubmitRules({ importTypes: ["BAHAN_BAKU_INDUSTRI"] })) === JSON.stringify([
    "nonIndustriDocuments: Unggah Surat Pernyataan Kepemilikan Modal Kerja",
    "partnerIndustriEntries: Aktifkan minimal satu Partner Industri tujuan",
    "products: Tambahkan minimal satu produk",
  ]),
  "Industri alone, nothing filled -> both Industri-side issues (unaffected by Konsumsi extraction)",
);

assert(
  JSON.stringify(
    runSubmitRules({
      importTypes: ["BARANG_KONSUMSI"],
      // Bukti Kemampuan Finansial is Konsumsi's OWN separate check (applyKonsumsiSubmitRules,
      // against konsumsiFinancialDocuments — never nonIndustriDocuments) — satisfied here since
      // this case is testing the Konsumsi-specific issues below, not this check. Only the
      // statement letter is unconditionally required; the "pick one evidence" document is optional.
      konsumsiFinancialDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "500000000" }],
      konsumsiDocuments: [{ id: "1", label: "x", documentPath: "x" }],
      applicationBrands: [{ brandId: "b1", applicantRole: "IMPORTER_ONLY", relationshipDocuments: {} }],
    }),
  ) === JSON.stringify([
    "applicationBrands.0.appointmentSource: Pilih sumber penunjukan importir",
    "brandQualityTests: 1 merek belum memiliki dokumen pendukung merek",
    "konsumsiProducts: Tambahkan minimal satu produk",
  ]),
  "Konsumsi: brand missing appointmentSource + quality test -> applyKonsumsiSubmitRules fires correctly",
);

assert(
  JSON.stringify(runSubmitRules({ importTypes: ["BARANG_KONSUMSI"] })) === JSON.stringify([
    "applicationBrands: Pilih atau tambahkan minimal satu merek yang digunakan",
    "konsumsiFinancialDocuments: Unggah Surat Pernyataan Kepemilikan Modal Kerja",
    "konsumsiProducts: Tambahkan minimal satu produk",
  ]),
  "Konsumsi alone, nothing filled -> Bukti Kemampuan Finansial (konsumsiFinancialDocuments, its own field) is required, konsumsiDocuments is NOT (pending System Configuration, verifikator can upload later)",
);

assert(
  !runSubmitRules({ importTypes: ["BARANG_KONSUMSI"] }).some((issue) => issue.startsWith("products:")),
  "Konsumsi-only is never required to fill the generic products list (Step6ProductInformation is hidden for it)",
);

assert(
  JSON.stringify(
    runSubmitRules({
      importTypes: ["BARANG_KONSUMSI"],
      konsumsiFinancialDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf" }],
      konsumsiDocuments: [{ id: "1", label: "x", documentPath: "x" }],
      applicationBrands: [{ brandId: "b1", applicantRole: "OWNER", relationshipDocuments: {} }],
      brandQualityTests: [{ brandId: "b1" }],
      konsumsiProducts: [
        {
          id: "p1",
          brandId: "b1",
          commodityGroupId: "cg1",
          productName: "Test Product",
          hsCode: "61091000",
          countryOfOrigin: "Vietnam",
          quantity: "10",
          averageUnitPrice: "5",
          currency: "USD",
        },
      ],
    }),
  ) === JSON.stringify(["konsumsiFinancialDocuments: Isi jumlah modal kerja pada Surat Pernyataan Kepemilikan Modal Kerja"]),
  "Statement letter uploaded but amount empty -> amount-specific issue fires (on konsumsiFinancialDocuments, not nonIndustriDocuments)",
);

assert(
  JSON.stringify(
    runSubmitRules({
      importTypes: ["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"],
      partnerIndustriEntries: [{ partnerId: "p1", enabled: true }],
      nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "500000000" }],
      konsumsiFinancialDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "y.pdf", amount: "250000000" }],
      konsumsiDocuments: [{ id: "1", label: "x", documentPath: "x" }],
      applicationBrands: [{ brandId: "b1", applicantRole: "OWNER", relationshipDocuments: {} }],
      brandQualityTests: [{ brandId: "b1" }],
      // Industri's own generic material list — separate from Konsumsi's structured
      // konsumsiProducts below, both required simultaneously on a mixed application.
      products: [{ id: "prod1", materialType: "Benang Katun", hsCode: "52053100" }],
      konsumsiProducts: [
        {
          id: "p1",
          brandId: "b1",
          commodityGroupId: "cg1",
          productName: "Test Product",
          hsCode: "61091000",
          countryOfOrigin: "Vietnam",
          quantity: "10",
          averageUnitPrice: "5",
          currency: "USD",
        },
      ],
    }),
  ) === JSON.stringify([]),
  "Mixed Industri+Konsumsi, everything satisfied -> clean (no cross-talk between the two rule sets)",
);

// Isolation proof: on a mixed application, satisfying Industri's `nonIndustriDocuments` must
// NEVER also satisfy Konsumsi's own `konsumsiFinancialDocuments` check, and vice versa — each
// scheme's Bukti Kemampuan Finansial is genuinely separate data, not a shared field read twice.
assert(
  runSubmitRules({
    importTypes: ["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"],
    partnerIndustriEntries: [{ partnerId: "p1", enabled: true }],
    nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "500000000" }],
    konsumsiFinancialDocuments: [],
    products: [{ id: "prod1", materialType: "Benang Katun", hsCode: "52053100" }],
  }).includes("konsumsiFinancialDocuments: Unggah Surat Pernyataan Kepemilikan Modal Kerja"),
  "Mixed: Industri's nonIndustriDocuments satisfied does NOT satisfy Konsumsi's own konsumsiFinancialDocuments check",
);
assert(
  runSubmitRules({
    importTypes: ["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"],
    partnerIndustriEntries: [{ partnerId: "p1", enabled: true }],
    nonIndustriDocuments: [],
    konsumsiFinancialDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "y.pdf", amount: "250000000" }],
    products: [{ id: "prod1", materialType: "Benang Katun", hsCode: "52053100" }],
  }).includes("nonIndustriDocuments: Unggah Surat Pernyataan Kepemilikan Modal Kerja"),
  "Mixed: Konsumsi's konsumsiFinancialDocuments satisfied does NOT satisfy Industri's own nonIndustriDocuments check",
);

console.log(failed ? "\nFAILED" : "\nAll scheme-separation checks passed.");
process.exit(failed ? 1 : 0);
