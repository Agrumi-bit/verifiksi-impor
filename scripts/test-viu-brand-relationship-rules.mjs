// Regression check for the VIU Barang Konsumsi "Merek yang Digunakan" rule
// engine (9-month evidence rule, license-doc exemption, relationship
// validity, readiness). The project has no test runner configured (no
// vitest/jest in package.json) — this plain script is the pragmatic
// alternative: pure functions, no DB, run directly with tsx.
//
// Run with: npx tsx scripts/test-viu-brand-relationship-rules.mjs
// Exits non-zero if any assertion fails.
import { getVIUConsumptionBrandRequirements } from "../src/modules/applications/viu-brand-relationship-rules.ts";

let failed = false;

function assertEq(actual, expected, label) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (ok ? "" : `   got=${JSON.stringify(actual)} want=${JSON.stringify(expected)}`));
}

const now = new Date("2026-01-01T00:00:00.000Z");

const r1 = getVIUConsumptionBrandRequirements({
  brandStatus: "ACTIVE", evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR", registrationDate: null,
  ownerLocation: "foreign", applicantRole: "OFFICIAL_REPRESENTATIVE", appointmentSource: null,
  officialRepresentativeCompanyId: null,
  availableDocumentCodes: new Set(["official_representative_appointment", "license_or_sublicense", "license_registration"]),
  now,
});
assertEq(r1.evidenceValidity.status, "NOT_APPLICABLE", "1. certificate has no 9-month rule");
assertEq(r1.readiness, "READY", "1. all 3 docs available -> READY");
assertEq(r1.requirements.length, 3, "1. exactly 3 relevant requirements (representation only)");

const r2 = getVIUConsumptionBrandRequirements({
  brandStatus: "ACTIVE", evidenceType: "TANDA_DAFTAR_MEREK", registrationDate: "2025-11-01",
  ownerLocation: "foreign", applicantRole: "OFFICIAL_REPRESENTATIVE", appointmentSource: null,
  officialRepresentativeCompanyId: null,
  availableDocumentCodes: new Set(["official_representative_appointment"]),
  now,
});
assertEq(r2.evidenceValidity.status, "VALID_WITHIN_9_MONTHS", "2. within 9 months");
const exemptCodes2 = r2.requirements.filter(x => x.requirementStatus === "EXEMPT").map(x => x.code).sort();
assertEq(exemptCodes2, ["license_or_sublicense", "license_registration"], "2. license docs exempt");
assertEq(r2.readiness, "READY", "2. only required doc (appointment) available -> READY");

const r3 = getVIUConsumptionBrandRequirements({
  brandStatus: "ACTIVE", evidenceType: "TANDA_DAFTAR_MEREK", registrationDate: "2024-01-01",
  ownerLocation: "foreign", applicantRole: "OFFICIAL_REPRESENTATIVE", appointmentSource: null,
  officialRepresentativeCompanyId: null, availableDocumentCodes: new Set(), now,
});
assertEq(r3.evidenceValidity.status, "EXPIRED_9_MONTH_LIMIT", "3. expired 9-month");
assertEq(r3.readiness, "NOT_ELIGIBLE", "3. expired -> NOT_ELIGIBLE");

const r4 = getVIUConsumptionBrandRequirements({
  brandStatus: "ACTIVE", evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR", registrationDate: null,
  ownerLocation: "domestic", applicantRole: "IMPORTER_ONLY", appointmentSource: "BRAND_OWNER",
  officialRepresentativeCompanyId: null, availableDocumentCodes: new Set(["importer_appointment"]), now,
});
assertEq(r4.relationshipValid, true, "4. domestic brand owner appointment valid");
assertEq(r4.readiness, "READY", "4. importer_appointment available -> READY");

const r5 = getVIUConsumptionBrandRequirements({
  brandStatus: "ACTIVE", evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR", registrationDate: null,
  ownerLocation: "foreign", applicantRole: "IMPORTER_ONLY", appointmentSource: "BRAND_OWNER",
  officialRepresentativeCompanyId: null, availableDocumentCodes: new Set(), now,
});
assertEq(r5.relationshipValid, false, "5. foreign brand owner direct appointment invalid");
assertEq(r5.readiness, "NOT_ELIGIBLE", "5. invalid relationship -> NOT_ELIGIBLE");

const r6 = getVIUConsumptionBrandRequirements({
  brandStatus: "ACTIVE", evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR", registrationDate: null,
  ownerLocation: "foreign", applicantRole: "IMPORTER_ONLY", appointmentSource: "OFFICIAL_REPRESENTATIVE",
  officialRepresentativeCompanyId: "rep-1",
  availableDocumentCodes: new Set(["importer_appointment", "official_rep_deed", "official_rep_business_license", "official_representative_appointment", "license_or_sublicense"]),
  now,
});
assertEq(r6.requiredDocumentCount, 6, "6. importer via official rep + certificate = 6 required docs");
assertEq(r6.missingRequiredDocumentCount, 1, "6. 5/6 available matches spec's ADIDAS example");
assertEq(r6.readiness, "INCOMPLETE", "6. missing 1 doc -> INCOMPLETE");

const r7 = getVIUConsumptionBrandRequirements({
  brandStatus: "ACTIVE", evidenceType: "SERTIFIKAT_INTERNASIONAL", registrationDate: "2025-10-01",
  ownerLocation: "foreign", applicantRole: "IMPORTER_ONLY", appointmentSource: "OFFICIAL_REPRESENTATIVE",
  officialRepresentativeCompanyId: "rep-1",
  availableDocumentCodes: new Set(["importer_appointment", "official_rep_deed", "official_rep_business_license", "official_representative_appointment"]),
  now,
});
assertEq(r7.requiredDocumentCount, 4, "7. 4 required (2 exempt)");
assertEq(r7.exemptDocumentCount, 2, "7. license docs exempt");
assertEq(r7.readiness, "READY", "7. all 4 required available -> READY");

const r8 = getVIUConsumptionBrandRequirements({
  brandStatus: "DRAFT", evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR", registrationDate: null,
  ownerLocation: "domestic", applicantRole: "OFFICIAL_REPRESENTATIVE", appointmentSource: null,
  officialRepresentativeCompanyId: null, availableDocumentCodes: new Set(), now,
});
assertEq(r8.readiness, "NOT_ELIGIBLE", "8. DRAFT brand -> NOT_ELIGIBLE");

const r9 = getVIUConsumptionBrandRequirements({
  brandStatus: "INACTIVE", evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR", registrationDate: null,
  ownerLocation: "domestic", applicantRole: "OFFICIAL_REPRESENTATIVE", appointmentSource: null,
  officialRepresentativeCompanyId: null, availableDocumentCodes: new Set(), now,
});
assertEq(r9.readiness, "NOT_ELIGIBLE", "9. INACTIVE brand -> NOT_ELIGIBLE");

console.log(failed ? "FAILED" : "All assertions passed.");
process.exit(failed ? 1 : 0);
