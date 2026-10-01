// Regression check for buildMerkCreateData/buildMerkDraftData (Add Merek ->
// POST/PATCH /api/merk payload shaping). The project has no test runner
// configured (no vitest/jest in package.json) — this plain script is the
// pragmatic alternative: no DB, run directly with tsx.
//
// Covers two real production incidents:
//   1. ownerCompanyId: "" (every domestic owner is manual free text in this
//      wizard — see step2/domestic-owner-ownership.tsx — so ownerCompanyId
//      is ALWAYS "" for that scenario, never a real id) must map to
//      brandOwnerId: null, not "". Writing "" into a real FK column
//      (Merk.brandOwnerId -> BrandOwner.id) violates the foreign key
//      constraint and crashes every single domestic+company "Tambah Merek"
//      with an uncaught 500.
//   2. Multi-class trademarkClasses[] must still produce the legacy
//      single-column bridge (trademarkClass/trademarkClassDescription,
//      mirroring the first entry) AND a full trademarkClassEntries list.
//
// Run with: npx tsx scripts/test-build-merk-create-data.mjs
// Exits non-zero if any assertion fails.
import { buildMerkCreateData, buildMerkDraftData } from "../src/modules/merk/build-create-data.ts";

let failed = false;

function assertEq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (ok ? "" : `   got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`));
}

// Real payload shape captured from the admin wizard (brand "POOKIO") that
// triggered the production bug — domestic owner, manually typed company
// name, never matched to a real BrandOwner row.
const basePayload = {
  brandName: "POOKIO",
  countryOfOrigin: "Indonesia",
  evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR",
  registrationNumber: "IDM000876999",
  registrationIssuer: "Direktorat Jenderal Kekayaan Intelektual, Kementerian Hukum dan HAM RI",
  registrationDate: "2021-07-30",
  registrationExpiryDate: "2030-01-21",
  trademarkClasses: [
    { trademarkClass: "05", trademarkClassDescription: "Popok bayi; popok dewasa" },
    { trademarkClass: "16", trademarkClassDescription: "Kemasan kertas" },
  ],
  merekStatusLabel: "Terdaftar",
  logoPath: "",
  documents: {
    trademark_evidence: { filePath: "documents/sertifikat.pdf", fileName: "sertifikat.pdf", fileSize: 1154755 },
  },
  productLabelDocumentation: [],
  qualityTests: [],
  declarationAccepted: true,
  ownerLocation: "domestic",
  ownerCompanyId: "", // <- the exact field that crashed every submission
  ownerType: "company",
  ownerName: "PT. SAVA GEMILANG INDONESIA",
  ownerAddress: "Jl. Pluit Raya No 7, Penjaringan, Jakarta Utara, DKI Jakarta 14440, Indonesia",
};

const created = await buildMerkCreateData(basePayload, null);

assertEq(created.brandOwnerId, null, "1. empty ownerCompanyId maps to brandOwnerId: null, not \"\"");
assertEq(created.ownershipType, "LISENSI", "1b. domestic+company (not apiu_is_owner) -> LISENSI legacy bridge");
assertEq(created.trademarkClass, "05", "2. legacy bridge mirrors the FIRST trademark class");
assertEq(created.trademarkClassDescription, "Popok bayi; popok dewasa", "2b. legacy bridge description matches first entry");
assertEq(created.trademarkClassEntries.create.length, 2, "2c. full trademarkClassEntries list keeps every class");
assertEq(
  created.trademarkClassEntries.create.map((e) => e.trademarkClass),
  ["05", "16"],
  "2d. every class code present in trademarkClassEntries",
);
assertEq(created.logoPath, null, "3. empty logoPath maps to null, not \"\"");

// Same ownerCompanyId: "" gap, now through the Draft path (which already
// had the `|| null` fallback buildMerkCreateData was missing).
const draftPayload = { ...basePayload, brandName: "POOKIO Draft" };
const draft = await buildMerkDraftData(draftPayload, null);
assertEq(draft.brandOwnerId, null, "4. draft path: empty ownerCompanyId also maps to null");

// A domestic owner who IS the applicant (apiu_is_owner) still never sends a
// real BrandOwner id either — brandOwnerId must stay null, not "".
const ownerIsApiuPayload = { ...basePayload, relationshipWithApiu: "apiu_is_owner" };
const ownerIsApiu = await buildMerkCreateData(ownerIsApiuPayload, null);
assertEq(ownerIsApiu.brandOwnerId, null, "5. apiu_is_owner scenario: empty ownerCompanyId also maps to null");
assertEq(ownerIsApiu.ownershipType, "MILIK_SENDIRI", "5b. domestic+apiu_is_owner -> MILIK_SENDIRI legacy bridge");

if (failed) {
  console.error("\nFAILED");
  process.exit(1);
}
console.log("\nAll checks passed.");
