import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { rencanaComparison } from "./kapasitas-calc";

const qty = [
  { productId: "p1", section: "sebelumnya", jenisProduk: "NCM", deskripsiProduk: "NCM", hsCode: "2853.90.90", satuan: "KG", jumlah: "20469473" },
  { productId: "p1", section: "rencana", jenisProduk: "NCM", deskripsiProduk: "NCM", hsCode: "2853.90.90", satuan: "KG", jumlah: "50000000" },
];

describe("D. Perbandingan Kapasitas dengan Rencana Produksi", () => {
  it("defaults to the bottleneck's yearly capacity and an automatic status", () => {
    const [row] = rencanaComparison(qty, 15768000, {});
    assert.equal(row.volPerhitungan, 15768000);
    assert.equal(row.volManual, false);
    assert.equal(row.sesuai, false);
    assert.equal(row.rencanaNum, 50000000);
    assert.equal(row.sebelumnya, "20469473");
  });

  it("uses the analyst's volume, and recomputes the automatic status from it", () => {
    const [row] = rencanaComparison(qty, 15768000, { perbandinganRencana: JSON.stringify({ p1: { vol: "50.000.000" } }) });
    assert.equal(row.volPerhitungan, 50000000);
    assert.equal(row.volManual, true);
    assert.equal(row.sesuai, true);
  });

  it("lets the analyst set the status by hand", () => {
    const [row] = rencanaComparison(qty, 15768000, { perbandinganRencana: JSON.stringify({ p1: { status: "SESUAI" } }) });
    assert.equal(row.autoSesuai, false);
    assert.equal(row.sesuai, true);
    assert.equal(row.statusManual, true);
    assert.equal(rencanaComparison(qty, 15768000, { perbandinganRencana: "not json" })[0].sesuai, false);
  });
});
