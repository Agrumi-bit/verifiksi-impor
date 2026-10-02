// Regression check for resolveTrademarkEvidenceExpiry (Dokumen & Monitoring sync with Merek).
// "Tanda Pendaftaran Merek" never carries its own BrandDocument.expiryDate (the Step 1 upload
// card doesn't collect one), so without this derivation Dokumen & Monitoring could never flag
// one as expiring/expired at all. DJKI only recognizes it as valid bukti merek for 6 months from
// its own registrationDate.
//
// Run with: npx tsx scripts/test-trademark-evidence-expiry.mjs
// Exits non-zero if any assertion fails.
import { resolveTrademarkEvidenceExpiry } from "../src/modules/merk/trademark-evidence-expiry.ts";

let failed = false;

function assertEq(actual, expected, label) {
  const a = actual instanceof Date ? actual.toISOString() : actual;
  const e = expected instanceof Date ? expected.toISOString() : expected;
  const ok = a === e;
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label + (ok ? "" : `   got=${a} want=${e}`));
}

// TANDA_DAFTAR_MEREK, no registrationExpiryDate set (the common case — "Kosongkan apabila belum
// diketahui") -> effective expiry is exactly registrationDate + 6 months.
assertEq(
  resolveTrademarkEvidenceExpiry("TANDA_DAFTAR_MEREK", new Date("2026-01-15"), null),
  new Date("2026-07-15"),
  "TANDA_DAFTAR_MEREK with no registrationExpiryDate -> registrationDate + 6 months",
);

// TANDA_DAFTAR_MEREK with a manually-entered registrationExpiryDate LATER than the 6-month cap
// -> the regulatory cap wins, not the (overly generous) manual entry.
assertEq(
  resolveTrademarkEvidenceExpiry("TANDA_DAFTAR_MEREK", new Date("2026-01-15"), new Date("2027-01-15")),
  new Date("2026-07-15"),
  "TANDA_DAFTAR_MEREK with later manual expiry -> 6-month cap still wins",
);

// TANDA_DAFTAR_MEREK with a manually-entered registrationExpiryDate EARLIER than the 6-month cap
// -> the earlier (more conservative) manual entry wins.
assertEq(
  resolveTrademarkEvidenceExpiry("TANDA_DAFTAR_MEREK", new Date("2026-01-15"), new Date("2026-03-01")),
  new Date("2026-03-01"),
  "TANDA_DAFTAR_MEREK with earlier manual expiry -> manual entry wins",
);

// TANDA_DAFTAR_MEREK with no registrationDate at all (not yet filled in) -> nothing to derive
// from, falls back to whatever registrationExpiryDate says (null here).
assertEq(
  resolveTrademarkEvidenceExpiry("TANDA_DAFTAR_MEREK", null, null),
  null,
  "TANDA_DAFTAR_MEREK with no registrationDate -> null (nothing to derive)",
);

// SERTIFIKAT_MEREK_TERDAFTAR (a final, already-issued certificate) -> the 6-month cap never
// applies; whatever registrationExpiryDate says (or doesn't) is untouched.
assertEq(
  resolveTrademarkEvidenceExpiry("SERTIFIKAT_MEREK_TERDAFTAR", new Date("2020-01-15"), new Date("2030-01-15")),
  new Date("2030-01-15"),
  "SERTIFIKAT_MEREK_TERDAFTAR -> registrationExpiryDate untouched, no 6-month cap",
);
assertEq(
  resolveTrademarkEvidenceExpiry("SERTIFIKAT_MEREK_TERDAFTAR", new Date("2020-01-15"), null),
  null,
  "SERTIFIKAT_MEREK_TERDAFTAR with no registrationExpiryDate -> null, no cap applied",
);

// SERTIFIKAT_INTERNASIONAL -> same as above, no 6-month cap.
assertEq(
  resolveTrademarkEvidenceExpiry("SERTIFIKAT_INTERNASIONAL", new Date("2020-01-15"), new Date("2030-01-15")),
  new Date("2030-01-15"),
  "SERTIFIKAT_INTERNASIONAL -> registrationExpiryDate untouched, no 6-month cap",
);

// Unknown/null certificateType (legacy rows, e.g. LAINNYA) -> no cap applied, passthrough.
assertEq(
  resolveTrademarkEvidenceExpiry(null, new Date("2026-01-15"), new Date("2026-02-01")),
  new Date("2026-02-01"),
  "null certificateType -> passthrough, no cap applied",
);

console.log(failed ? "\nFAILED" : "\nALL PASS");
process.exit(failed ? 1 : 0);
