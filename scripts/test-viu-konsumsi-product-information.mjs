// Regression check for VIU Konsumsi Step "Product Information" (Merek > Kelompok Komoditas /
// Sub Kelompok Komoditas > Produk) — schema validation, derived total calculation, duplicate-line
// detection, multi-currency grouping, submit-rule gating, and group derivation from Step "Dokumen
// Pendukung Merek" (brandQualityTests) across Industri / Non-Industri / Konsumsi / mixed.
//
// DB-dependent checks (invalid Brand/CommodityGroup/HS Code/Country references, server-rebuilt
// submission snapshot, malicious client snapshot rejection, group-sync-with-Step-7 rejection) are
// NOT covered here — they require a live DB + HTTP round trip and were verified manually against
// the dev server (see the implementation report). This script covers everything testable as pure
// logic.
//
// Run with: npx tsx scripts/test-viu-konsumsi-product-information.mjs
import {
  konsumsiProductSchema,
  konsumsiProductTotal,
  createEmptyKonsumsiProduct,
  deriveKonsumsiProductGroups,
} from "../src/modules/applications/viu-schemes/konsumsi/schema.ts";
import { applyViuOnlySubmitRules } from "../src/modules/applications/schema.ts";

let failed = false;
function assert(cond, label) {
  const ok = Boolean(cond);
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label);
}

function validProduct(overrides = {}) {
  return {
    id: "p1",
    brandId: "b1",
    industryGroupId: "ig1",
    industryName: "Industri Tekstil",
    commodityGroupId: "cg1",
    commodityName: "Pakaian Jadi",
    productName: "Men's Cotton T-Shirt",
    hsCode: "61091000",
    countryOfOrigin: "Vietnam",
    quantity: "10000",
    averageUnitPrice: "3.5",
    currency: "USD",
    ...overrides,
  };
}

console.log("--- Schema validation ---");

assert(konsumsiProductSchema.safeParse(validProduct()).success, "1. valid product line parses");

assert(
  !konsumsiProductSchema.safeParse(validProduct({ quantity: "0" })).success,
  "10. quantity = 0 -> rejected",
);
assert(
  !konsumsiProductSchema.safeParse(validProduct({ quantity: "-5" })).success,
  "11. negative quantity -> rejected",
);
assert(
  !konsumsiProductSchema.safeParse(validProduct({ averageUnitPrice: "abc" })).success,
  "12. non-numeric averageUnitPrice -> rejected",
);
assert(
  !konsumsiProductSchema.safeParse(validProduct({ averageUnitPrice: "-1" })).success,
  "12. negative averageUnitPrice -> rejected",
);
assert(
  konsumsiProductSchema.safeParse(validProduct({ averageUnitPrice: "0" })).success,
  "averageUnitPrice = 0 is allowed (free/no-charge sample lines are valid)",
);
assert(
  !konsumsiProductSchema.safeParse(validProduct({ productName: "" })).success,
  "empty productName -> rejected",
);
assert(
  !konsumsiProductSchema.safeParse(validProduct({ hsCode: "" })).success,
  "empty hsCode -> rejected",
);
assert(
  !konsumsiProductSchema.safeParse(validProduct({ countryOfOrigin: "" })).success,
  "empty countryOfOrigin -> rejected",
);
assert(
  !konsumsiProductSchema.safeParse(validProduct({ commodityGroupId: "" })).success,
  "empty commodityGroupId -> rejected (grouping always comes from Step 7, never blank)",
);

console.log("--- Group derivation from Step 7 (Dokumen Pendukung Merek) ---");

const qualityTests = [
  { brandId: "b1", industryGroupId: "ig1", industryName: "Industri Tekstil", commodityGroupId: "cg1", commodityName: "Pakaian Jadi" },
  { brandId: "b1", industryGroupId: "ig1", industryName: "Industri Tekstil", commodityGroupId: "cg2", commodityName: "Aksesori" },
  // Same (brandId, commodityGroupId) as the first entry, different certificate — must dedupe to
  // one group, not two, since it's the same Kelompok Komoditas slot.
  { brandId: "b1", industryGroupId: "ig1", industryName: "Industri Tekstil", commodityGroupId: "cg1", commodityName: "Pakaian Jadi" },
  { brandId: "b2", industryGroupId: "ig2", industryName: "Industri Kulit", commodityGroupId: "cg3", commodityName: "Alas Kaki" },
];
const groups = deriveKonsumsiProductGroups(qualityTests);
assert(groups.length === 3, "distinct (brandId, commodityGroupId) pairs dedupe correctly (4 quality tests -> 3 groups)");
assert(groups.filter((g) => g.brandId === "b1").length === 2, "Brand b1 has 2 distinct Kelompok Komoditas");
assert(groups.filter((g) => g.brandId === "b2").length === 1, "Brand b2 has 1 distinct Kelompok Komoditas");
assert(
  deriveKonsumsiProductGroups(qualityTests.filter((qt) => qt.brandId === "nonexistent")).length === 0,
  "a Brand with no quality-test entries has zero available groups (Product Information shows its empty state)",
);

console.log("--- Total calculation ---");

assert(konsumsiProductTotal(validProduct()) === 35000, "13. 10,000 PCS x USD 3.50 = 35,000.00");
assert(konsumsiProductTotal(validProduct({ quantity: "", averageUnitPrice: "3.5" })) === 0, "incomplete row -> total is 0, never NaN");
assert(konsumsiProductTotal(validProduct({ quantity: "abc" })) === 0, "non-numeric quantity -> total is 0, never NaN");

const emptyProduct = createEmptyKonsumsiProduct("b1", groups[0]);
assert(
  emptyProduct.brandId === "b1" && emptyProduct.commodityGroupId === "cg1" && emptyProduct.industryGroupId === "ig1",
  "createEmptyKonsumsiProduct seeds brand + group straight from a derived Step-7 group, never a blank selection",
);

console.log("--- Multi-currency grouping (page/brand/group summary logic) ---");

function groupTotalsByCurrency(products) {
  const totals = new Map();
  for (const product of products) {
    totals.set(product.currency, (totals.get(product.currency) ?? 0) + konsumsiProductTotal(product));
  }
  return totals;
}

const mixedCurrencyProducts = [
  validProduct({ id: "p1", currency: "USD", quantity: "10000", averageUnitPrice: "3.5" }),
  validProduct({ id: "p2", currency: "USD", quantity: "5000", averageUnitPrice: "10" }),
  validProduct({ id: "p3", currency: "CNY", quantity: "2000", averageUnitPrice: "160" }),
];
const totals = groupTotalsByCurrency(mixedCurrencyProducts);
assert(totals.get("USD") === 85000, "14. USD lines summed separately (35,000 + 50,000 = 85,000)");
assert(totals.get("CNY") === 320000, "14. CNY lines summed separately, never merged with USD (2,000 x 160 = 320,000)");
assert(totals.size === 2, "14. exactly one entry per currency actually present, no phantom zero-entries");

console.log("--- Duplicate-line detection (brandId + commodityGroupId + hsCode + countryOfOrigin + productName) ---");

function runSubmitRules(data) {
  const issues = [];
  applyViuOnlySubmitRules(
    {
      declarationAccepted: true,
      importTypes: [],
      partnerIndustriEntries: [],
      nonIndustriDocuments: [],
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

const baseKonsumsi = {
  importTypes: ["BARANG_KONSUMSI"],
  konsumsiDocuments: [{ id: "1", label: "x", documentPath: "x" }],
  applicationBrands: [{ brandId: "b1", applicantRole: "OWNER", relationshipDocuments: {} }],
  brandQualityTests: [{ brandId: "b1", industryGroupId: "ig1", commodityGroupId: "cg1" }],
  nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "1000000" }],
};

assert(
  runSubmitRules({ ...baseKonsumsi, konsumsiProducts: [validProduct()] }).length === 0,
  "2. one Brand + one Product, everything else satisfied -> no issues",
);

assert(
  runSubmitRules({
    ...baseKonsumsi,
    konsumsiProducts: [validProduct({ id: "p1" }), validProduct({ id: "p2", productName: "Men's Jacket", hsCode: "62014000" })],
  }).length === 0,
  "2. one Brand + multiple distinct Products -> no false-positive duplicate",
);

assert(
  runSubmitRules({
    ...baseKonsumsi,
    konsumsiProducts: [validProduct({ id: "p1" }), validProduct({ id: "p2" })],
  }).some((issue) => issue.includes("sudah ada untuk kombinasi")),
  "exact duplicate line (same brand/group/hsCode/country/name) -> flagged",
);

assert(
  runSubmitRules({
    ...baseKonsumsi,
    konsumsiProducts: [
      validProduct({ id: "p1", countryOfOrigin: "Vietnam" }),
      validProduct({ id: "p2", countryOfOrigin: "China" }),
    ],
  }).length === 0,
  "5. same Product/HS from two different Countries -> both valid, never merged/flagged as duplicate",
);

assert(
  runSubmitRules({
    ...baseKonsumsi,
    konsumsiProducts: [
      validProduct({ id: "p1", commodityGroupId: "cg1" }),
      validProduct({ id: "p2", commodityGroupId: "cg2", productName: "Men's Jacket" }),
    ],
  }).length === 0,
  "3. one Brand + multiple Commodity Groups -> no cross-group false positives",
);

assert(
  runSubmitRules({
    ...baseKonsumsi,
    applicationBrands: [
      { brandId: "b1", applicantRole: "OWNER", relationshipDocuments: {} },
      { brandId: "b2", applicantRole: "OWNER", relationshipDocuments: {} },
    ],
    brandQualityTests: [
      { brandId: "b1", industryGroupId: "ig1", commodityGroupId: "cg1" },
      { brandId: "b2", industryGroupId: "ig1", commodityGroupId: "cg1" },
    ],
    konsumsiProducts: [validProduct({ id: "p1", brandId: "b1" }), validProduct({ id: "p2", brandId: "b2", productName: "Hoodie" })],
  }).length === 0,
  "4. multiple Brands, one Product each -> no cross-brand false positives",
);

console.log("--- Final Submit gating ---");

assert(
  runSubmitRules({ ...baseKonsumsi, konsumsiProducts: [] }).some((issue) => issue === "konsumsiProducts: Tambahkan minimal satu produk"),
  "16. Final Submit with no Product -> rejected for Konsumsi",
);

assert(
  !runSubmitRules({ importTypes: ["BAHAN_BAKU_INDUSTRI"], partnerIndustriEntries: [{ partnerId: "p1", enabled: true }], nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "1" }] })
    .some((issue) => issue.startsWith("konsumsiProducts")),
  "17. Industri-only application is not required to fill konsumsiProducts",
);

assert(
  !runSubmitRules({ importTypes: ["BAHAN_BAKU_NON_INDUSTRI"], nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "1" }] })
    .some((issue) => issue.startsWith("konsumsiProducts")),
  "18. Non-Industri-only application is not required to fill konsumsiProducts",
);

assert(
  runSubmitRules({
    ...baseKonsumsi,
    importTypes: ["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"],
    partnerIndustriEntries: [{ partnerId: "p1", enabled: true }],
    products: [{ id: "prod1", materialType: "Benang Katun", hsCode: "52053100" }],
    konsumsiProducts: [validProduct()],
  }).length === 0,
  "19. mixed Industri + Konsumsi, both schemes' product/document requirements satisfied -> clean",
);

console.log(failed ? "\nFAILED" : "\nAll Product Information checks passed.");
process.exit(failed ? 1 : 0);
