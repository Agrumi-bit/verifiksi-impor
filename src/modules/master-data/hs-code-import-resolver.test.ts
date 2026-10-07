import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveHsCodeRows, summarizeIssues, type HsCodeSheetRow } from "./hs-code-import-resolver";

const TEKSTIL = { name: "Tekstil, Karpet, dan Penutup Lantai Tekstil Lainnya", code: "IND-01" };
const BATIK = { name: "Tekstil dan Produk Tekstil Batik dan Motif Batik", code: "TPT batik" };

const commodityGroups = [
  { id: "g-kt1", name: "Kain Tenun", code: "SK0101", status: "ACTIVE", industryGroup: TEKSTIL },
  { id: "g-kt2", name: "Kain Tenun", code: "SK0201", status: "ACTIVE", industryGroup: BATIK },
  { id: "g-pita", name: "Kain Pita", code: "SK0105", status: "ACTIVE", industryGroup: TEKSTIL },
  { id: "g-old", name: "Benang Pintal", code: "xx", status: "INACTIVE", industryGroup: TEKSTIL },
  { id: "g-bp", name: "Benang Pintal", code: "SK0102", status: "ACTIVE", industryGroup: TEKSTIL },
];
const commoditySubGroups = [
  { id: "s-kt1-kapas", name: "Dari Kapas", code: "KM010102", status: "ACTIVE", commodityGroupId: "g-kt1" },
  { id: "s-pita-kapas", name: "Dari Kapas", code: "KM010502", status: "ACTIVE", commodityGroupId: "g-pita" },
  { id: "s-kt2-kapas", name: "Dari Kapas", code: "KM020103", status: "ACTIVE", commodityGroupId: "g-kt2" },
  { id: "s-bp-art", name: "Dari Serat Stapel Artifisial", code: "KM010202", status: "ACTIVE", commodityGroupId: "g-bp" },
];
const units = [
  { id: "u-kg", name: "Kilogram", symbol: "KG", status: "ACTIVE" },
  { id: "u-m", name: "Meter", symbol: "M", status: "ACTIVE" },
  { id: "u-m2", name: "M2", symbol: "M2", status: "ACTIVE" },
];
const refs = { commodityGroups, commoditySubGroups, units };

function row(partial: Partial<HsCodeSheetRow>): HsCodeSheetRow {
  return {
    rowNumber: 2,
    hsCode: "5208.11.00",
    description: "Kain tenunan dari kapas",
    industryGroup: "",
    commodityGroup: "",
    commodityGroupCode: "",
    commoditySubGroup: "",
    commoditySubGroupCode: "",
    unit: "Meter",
    ...partial,
  };
}

describe("resolveHsCodeRows", () => {
  it("resolves Komoditas inside its own Sub Kelompok, never a same-named one elsewhere", () => {
    const { rows, issues } = resolveHsCodeRows(
      [row({ hsCode: "5806.31.90", commodityGroup: "Kain Pita", commoditySubGroup: "Dari Kapas" })],
      refs,
    );
    assert.equal(issues.length, 0);
    assert.equal(rows[0].commodityGroupId, "g-pita");
    assert.equal(rows[0].commoditySubGroupId, "s-pita-kapas");
  });

  it("uses Kelompok Komoditas to pick between Sub Kelompok with the same name", () => {
    const { rows } = resolveHsCodeRows(
      [row({ industryGroup: BATIK.name, commodityGroup: "Kain Tenun", commoditySubGroup: "dari kapas" })],
      refs,
    );
    assert.equal(rows[0].commodityGroupId, "g-kt2");
    assert.equal(rows[0].commoditySubGroupId, "s-kt2-kapas");
  });

  it("reports an ambiguous Sub Kelompok name instead of guessing", () => {
    const { rows, issues } = resolveHsCodeRows([row({ commodityGroup: "Kain Tenun", commoditySubGroup: "Dari Kapas" })], refs);
    assert.equal(rows.length, 0);
    assert.equal(issues[0].column, "Sub Kelompok Komoditas");
    assert.match(issues[0].reason, /ambigu/);
  });

  it("prefers the ACTIVE Sub Kelompok over an INACTIVE one with the same name", () => {
    const { rows } = resolveHsCodeRows(
      [row({ hsCode: "5510.12.00", commodityGroup: "Benang Pintal", commoditySubGroup: "Dari Serat Stapel Artifisial", unit: "Kg" })],
      refs,
    );
    assert.equal(rows[0].commodityGroupId, "g-bp");
  });

  it("resolves by codes and rejects a Komoditas code from another Sub Kelompok", () => {
    const ok = resolveHsCodeRows([row({ commodityGroupCode: "SK0101", commoditySubGroupCode: "KM010102" })], refs);
    assert.equal(ok.rows[0].commoditySubGroupId, "s-kt1-kapas");
    const bad = resolveHsCodeRows([row({ commodityGroupCode: "SK0101", commoditySubGroupCode: "KM010502" })], refs);
    assert.equal(bad.rows.length, 0);
    assert.equal(bad.issues[0].column, "Kode Komoditas");
  });

  it("matches Satuan by name, symbol or common alias, and names the unknown value", () => {
    const base = { commodityGroupCode: "SK0101", commoditySubGroupCode: "KM010102" };
    const { rows, issues } = resolveHsCodeRows(
      [
        row({ ...base, rowNumber: 2, unit: "kg" }),
        row({ ...base, rowNumber: 3, unit: "Meter Persegi" }),
        row({ ...base, rowNumber: 4, unit: "Lusin" }),
      ],
      refs,
    );
    assert.deepEqual(rows.map((r) => r.unitOfMeasurementId), ["u-kg", "u-m2"]);
    assert.equal(issues.length, 1);
    assert.deepEqual([issues[0].rowNumber, issues[0].column, issues[0].value], [4, "Satuan", "Lusin"]);
    assert.deepEqual(summarizeIssues(issues), ['Satuan "Lusin" (1 baris)']);
  });

  it("counts rows without HS Code / Uraian as skipped, not as issues", () => {
    const { skippedRows, issues } = resolveHsCodeRows([row({ hsCode: "" })], refs);
    assert.equal(skippedRows, 1);
    assert.equal(issues.length, 0);
  });
});
