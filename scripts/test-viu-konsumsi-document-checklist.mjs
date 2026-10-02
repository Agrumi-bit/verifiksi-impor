// Regression for buildDocumentChecklist's VIU Konsumsi document-checklist isolation
// (Customer Relation Workspace's "Kelengkapan Dokumen" tab, also used by every other workspace
// that calls buildDocumentChecklist).
//
// Reproduces and locks in the fix for a real production bug: a VIU Konsumsi application with
// leftover `nonIndustriDocuments` data (a field that belongs to Bahan Baku Industri/Non Industri,
// never Konsumsi's own UI) showed up TWICE in the Document List — once under "Dokumen Pendukung"
// (from the stale nonIndustriDocuments) and once under "Bukti Kemampuan Finansial — Konsumsi"
// (the real data). Root cause: the "Dokumen Pendukung" loop in buildDocumentChecklist
// (src/modules/verifikator-workspace/schema.ts) ran unconditionally for every non-VKI
// application, never gated on Bahan Baku Industri/Non Industri actually being selected.
//
// Run with: npx tsx scripts/test-viu-konsumsi-document-checklist.mjs
import { buildDocumentChecklist } from "../src/modules/verifikator-workspace/schema.ts";

let failed = false;
function assert(cond, label) {
  const ok = Boolean(cond);
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label);
}

function basePayload(overrides) {
  return {
    verificationType: "VIU",
    importTypes: [],
    companyName: "PT Contoh",
    nibDocumentPath: null,
    kbliDocumentPath: null,
    notarialDocumentPath: null,
    notarialAmendmentDocPath: null,
    skDocumentPath: null,
    npwpDocumentPath: null,
    taxProofSummaryDocumentPath: null,
    sptTahunanDocumentPath: null,
    bpeDocumentPath: null,
    skfDocumentPath: null,
    sspDocumentPath: null,
    ppnDocumentPath: null,
    eBillingDocumentPath: null,
    sktDocumentPath: null,
    locations: [],
    partnerIndustriEntries: [],
    nonIndustriDocuments: [],
    konsumsiFinancialDocuments: [],
    konsumsiDocuments: [],
    applicationBrands: [],
    brandQualityTests: [],
    products: [],
    ...overrides,
  };
}

console.log("--- BUG REPRODUCTION: Konsumsi-only with stale nonIndustriDocuments must not duplicate the financial category ---");

const konsumsiPayload = basePayload({
  importTypes: ["BARANG_KONSUMSI"],
  // Stale leftover data — reproduces the reported bug's exact payload shape (surat-pernyataan +
  // surat-referensi-bank enabled with files, 8 other PENDUKUNG items disabled with no file).
  nonIndustriDocuments: [
    { key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "1" },
    { key: "surat-referensi-bank", enabled: true, documentPath: "y.pdf" },
    { key: "laporan-keuangan", enabled: false },
  ],
  konsumsiFinancialDocuments: [
    { key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "z.pdf", amount: "2" },
    { key: "laporan-keuangan", enabled: false },
  ],
});

const konsumsiChecklist = buildDocumentChecklist(konsumsiPayload);
const categories = new Set(konsumsiChecklist.map((item) => item.category));

assert(!categories.has("Dokumen Pendukung"), "Konsumsi-only: no 'Dokumen Pendukung' category from stale nonIndustriDocuments");
assert(categories.has("Bukti Kemampuan Finansial — Konsumsi"), "Konsumsi-only: 'Bukti Kemampuan Finansial — Konsumsi' category present");
assert(
  konsumsiChecklist.filter((item) => item.category === "Bukti Kemampuan Finansial — Konsumsi").length === 1,
  "Konsumsi-only: financial category has exactly 1 item (UTAMA statement only — disabled PENDUKUNG item excluded)",
);
assert(!categories.has("Dokumen Partner Industri"), "Konsumsi-only: no 'Dokumen Partner Industri' category (no enabled partners)");

console.log("--- Konsumsi financial group: only enabled PENDUKUNG items are shown ---");
const konsumsiWithEvidence = buildDocumentChecklist(
  basePayload({
    importTypes: ["BARANG_KONSUMSI"],
    konsumsiFinancialDocuments: [
      { key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "z.pdf", amount: "2" },
      { key: "rekening-koran", enabled: true, documentPath: "rk.pdf" },
      { key: "laporan-keuangan", enabled: false },
    ],
  }),
);
const financialItems = konsumsiWithEvidence.filter((item) => item.category === "Bukti Kemampuan Finansial — Konsumsi");
assert(financialItems.length === 2, "Exactly 2 financial items: UTAMA statement + the one enabled PENDUKUNG evidence");
assert(financialItems.some((item) => item.key === "konsumsi-financial:rekening-koran"), "The enabled PENDUKUNG item (rekening-koran) is present");
assert(!financialItems.some((item) => item.key === "konsumsi-financial:laporan-keuangan"), "The disabled PENDUKUNG item (laporan-keuangan) is absent");

console.log("--- Dokumen Merek: brand evidence, quality test, and relationship documents ---");
const konsumsiBrands = [
  {
    brandId: "b1",
    brandName: "POOKIO",
    registrationDocumentPath: "pookio-cert.pdf",
    requiredRelationshipDocuments: [],
  },
  {
    brandId: "b2",
    brandName: "DIABON",
    registrationDocumentPath: null,
    requiredRelationshipDocuments: [{ code: "license_or_sublicense", label: "Perjanjian Lisensi/Sublisensi" }],
  },
];
const merekChecklist = buildDocumentChecklist(
  basePayload({
    importTypes: ["BARANG_KONSUMSI"],
    applicationBrands: [
      { brandId: "b1", applicantRole: "OWNER", relationshipDocuments: {} },
      {
        brandId: "b2",
        applicantRole: "OFFICIAL_REPRESENTATIVE",
        relationshipDocuments: { license_or_sublicense: { filePath: "lisensi.pdf", fileName: "lisensi.pdf" } },
      },
    ],
    brandQualityTests: [
      { brandId: "b1", commodityGroupId: "cg1", commodityName: "Popok, Pembalut, Pad", filePath: "qt-pookio.pdf" },
      { brandId: "b2", commodityGroupId: "cg2", commodityName: "Tisu Basah", filePath: "qt-diabon.pdf" },
    ],
  }),
  undefined,
  undefined,
  konsumsiBrands,
);
const merekItems = merekChecklist.filter((item) => item.category === "Dokumen Merek");
assert(
  merekItems.some((item) => item.label === "Sertifikat Merek — POOKIO" && item.documentPath === "pookio-cert.pdf"),
  "Sertifikat Merek — POOKIO present with its registrationDocumentPath",
);
assert(
  merekItems.some((item) => item.label === "Sertifikat Merek — DIABON" && item.documentPath === null),
  "Sertifikat Merek — DIABON present, no file (registrationDocumentPath null)",
);
assert(
  merekItems.some((item) => item.label === "Sertifikat Uji Mutu — POOKIO · Popok, Pembalut, Pad" && item.documentPath === "qt-pookio.pdf"),
  "Sertifikat Uji Mutu — POOKIO present with its own file",
);
assert(
  merekItems.some((item) => item.label === "Sertifikat Uji Mutu — DIABON · Tisu Basah" && item.documentPath === "qt-diabon.pdf"),
  "Sertifikat Uji Mutu — DIABON present with its own file",
);
assert(
  !merekItems.some((item) => item.label.includes("— POOKIO") && item.label.startsWith("Perjanjian")),
  "POOKIO (applicantRole OWNER) has no relationship-document item",
);
assert(
  merekItems.some((item) => item.label === "Perjanjian Lisensi/Sublisensi — DIABON" && item.documentPath === "lisensi.pdf"),
  "DIABON (applicantRole OFFICIAL_REPRESENTATIVE) has its required relationship document, with its uploaded file",
);

console.log("--- Omitted konsumsiBrands context: Dokumen Merek simply absent, no crash ---");
const withoutBrandContext = buildDocumentChecklist(
  basePayload({
    importTypes: ["BARANG_KONSUMSI"],
    applicationBrands: [{ brandId: "b1", applicantRole: "OWNER", relationshipDocuments: {} }],
  }),
);
assert(!withoutBrandContext.some((item) => item.category === "Dokumen Merek"), "No Dokumen Merek items when konsumsiBrands isn't passed by the caller");

console.log("--- Unaffected: Bahan Baku Industri/Non Industri still gets 'Dokumen Pendukung' unconditionally ---");
const industriChecklist = buildDocumentChecklist(
  basePayload({
    importTypes: ["BAHAN_BAKU_INDUSTRI"],
    nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "x.pdf", amount: "1" }],
  }),
);
assert(
  industriChecklist.filter((item) => item.category === "Dokumen Pendukung").length > 0,
  "Industri-only: 'Dokumen Pendukung' category present and populated (unaffected by the Konsumsi fix)",
);
assert(
  !industriChecklist.some((item) => item.category === "Bukti Kemampuan Finansial — Konsumsi"),
  "Industri-only: no 'Bukti Kemampuan Finansial — Konsumsi' category",
);

console.log(failed ? "\nFAILED" : "\nAll document-checklist checks passed.");
process.exit(failed ? 1 : 0);
