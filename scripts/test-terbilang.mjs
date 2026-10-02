// Regression check for the Indonesian number-to-words converter used by Step "Bukti Kemampuan
// Finansial"'s Jumlah Modal Kerja field (VIU Konsumsi, and Industri/Non-Industri too since the
// field is shared).
//
// Run with: npx tsx scripts/test-terbilang.mjs
import { terbilangRupiah } from "../src/lib/terbilang.ts";

let failed = false;
function assert(cond, label) {
  const ok = Boolean(cond);
  if (!ok) failed = true;
  console.log((ok ? "PASS" : "FAIL") + " - " + label);
}

const cases = [
  [0, "Nol Rupiah"],
  [1, "Satu Rupiah"],
  [11, "Sebelas Rupiah"],
  [12, "Dua Belas Rupiah"],
  [19, "Sembilan Belas Rupiah"],
  [20, "Dua Puluh Rupiah"],
  [21, "Dua Puluh Satu Rupiah"],
  [99, "Sembilan Puluh Sembilan Rupiah"],
  [100, "Seratus Rupiah"],
  [150, "Seratus Lima Puluh Rupiah"],
  [999, "Sembilan Ratus Sembilan Puluh Sembilan Rupiah"],
  [1000, "Seribu Rupiah"],
  [1500, "Seribu Lima Ratus Rupiah"],
  [1250000, "Satu Juta Dua Ratus Lima Puluh Ribu Rupiah"],
  [5000000, "Lima Juta Rupiah"], // the exact example given when this feature was requested
  [500000000, "Lima Ratus Juta Rupiah"],
  [1000000000, "Satu Miliar Rupiah"],
  [2500000000, "Dua Miliar Lima Ratus Juta Rupiah"],
  [1000000000000, "Satu Triliun Rupiah"],
];

for (const [input, expected] of cases) {
  assert(terbilangRupiah(input) === expected, `${input} -> "${expected}"`);
}

assert(terbilangRupiah("5000000") === "Lima Juta Rupiah", "accepts numeric string input (form fields store amount as a string)");
assert(terbilangRupiah("") === "", "empty string -> empty (never throws on a half-typed amount)");
assert(terbilangRupiah("abc") === "", "non-numeric string -> empty, never NaN in the output");
assert(terbilangRupiah(-100) === "", "negative amount -> empty, never a negative terbilang");

console.log(failed ? "\nFAILED" : "\nAll terbilang checks passed.");
process.exit(failed ? 1 : 0);
