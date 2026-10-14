import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CapacityRow, RawMaterialConversionRow, RawMaterialUsageRow } from "@/modules/verifikator-workspace/schema";
import { capacitySummary, conversionRatio, materialNeeds, materialTotals } from "./lhvki-summary";

const cap = (id: string, jenisProduk: string, izin: string): CapacityRow => ({ id, jenisProduk, kbliCode: "13112", kbliDescription: "Pertenunan", berdasarkanIzin: izin, kapasitasTerpasang: "", satuan: "m" });
const conv = (id: string, productName: string, jenis: string, produksi: string, kebutuhan: string): RawMaterialConversionRow => ({
  id, productId: null, productName, productHsCode: "", rawMaterialId: "rm1", jenis, hsCode: "5205.11", hsDesc: "", deskripsi: "", photoPath: null,
  kategori: "Bahan Baku", volumeProduksiJumlah: produksi, volumeProduksiSatuan: "m", volumeKebutuhanJumlah: kebutuhan, volumeKebutuhanSatuan: "kg", rasioKonversi: "", keterangan: "",
});

describe("LHVKI figures (Pasal 32 ayat (3) huruf c–f)", () => {
  const capacity = [cap("c1", "Kain Tenun", "1.000.000"), cap("c2", "Kain Rajut", "500000")];
  const data = {
    kapasitas: { status: "PENDING" as const, inputs: { kapasitasVki: JSON.stringify({ c1: "800000" }) } },
    bahanbaku: { status: "PENDING" as const, inputs: { rekapBahanBaku: JSON.stringify({ k2: { izin: "999", vki: "" } }) } },
  };

  it("kapasitas izin vs hasil VKI with selisih", () => {
    const rows = capacitySummary(capacity, data.kapasitas.inputs);
    assert.equal(rows[0].izin, 1000000);
    assert.equal(rows[0].vki, 800000);
    assert.equal(rows[0].selisihPct, -20);
    assert.equal(rows[1].vki, null);
  });

  it("kebutuhan = kapasitas × rasio konversi; the analyst's figure wins; totals per bahan baku", () => {
    assert.equal(conversionRatio(conv("x", "Kain Tenun", "Benang", "100", "25")), 0.25);
    const needs = materialNeeds(
      [conv("k1", "Kain Tenun", "Benang", "100", "25"), conv("k2", "Kain Rajut", "Benang", "10", "5")],
      capacity,
      data,
      [
        { rawMaterialId: "rm1", conversionId: "k1", rencanaKebutuhan: "300", satuan: "kg" },
        { rawMaterialId: "rm1", conversionId: "k2", rencanaKebutuhan: "300", satuan: "kg" },
      ] as unknown as RawMaterialUsageRow[],
    );
    assert.equal(needs[0].permohonan, 300);
    assert.equal(needs[0].izin, 250000);
    assert.equal(needs[0].vki, 200000);
    assert.equal(needs[1].izinOtomatis, 250000);
    assert.equal(needs[1].izin, 999);
    assert.equal(needs[1].vki, null);
    const totals = materialTotals(needs);
    assert.equal(totals.length, 1);
    assert.equal(totals[0].izin, 250999);
    assert.equal(totals[0].vki, 200000);
    // Rencana kebutuhan is per raw material — counted once although two products use it.
    assert.equal(totals[0].permohonan, 300);
  });
});
