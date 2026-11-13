import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeListrik, listrikBebanFormula, resolveListrikTariff, suggestUtilisasi, TARIF_LAINNYA } from "./listrik-calc";

const master = [{ id: "t1", kelompok: "Industri", golongan: "I-4/TT", batasDaya: "≥ 30.000 kVA", tarifPerKwh: "1.035,78" }];

describe("resolveListrikTariff", () => {
  it("uses the Master Data row", () => {
    assert.deepEqual(resolveListrikTariff({ tarifId: "t1" }, master), { label: "Industri — I-4/TT (≥ 30.000 kVA)", perKwh: 1035.78 });
  });

  it("uses the analyst's own golongan and Rp/kWh for Golongan lainnya", () => {
    const t = resolveListrikTariff({ tarifId: TARIF_LAINNYA, tarifLainnyaGolongan: "Tarif efektif rekening PLN", tarifLainnyaPerKwh: "1.428,50" }, master);
    assert.deepEqual(t, { label: "Tarif efektif rekening PLN (tarif diisi manual)", perKwh: 1428.5 });
    const calc = computeListrik([], [], { tarifId: TARIF_LAINNYA }, t?.perKwh ?? null);
    assert.equal(calc.estimasiPembayaran, 0);
  });

  it("is empty when nothing is chosen or the nominal is missing", () => {
    assert.equal(resolveListrikTariff({}, master), null);
    assert.equal(resolveListrikTariff({ tarifId: TARIF_LAINNYA }, master)?.perKwh, null);
  });
});

describe("Faktor Utilisasi Produksi", () => {
  const machines = [{ id: "m1", power: "100", powerSatuan: "kW", quantity: "2", waktuBeroperasi: "24" }] as unknown as Parameters<typeof computeListrik>[0];

  it("scales the machine load and leaves 100% when empty or out of range", () => {
    const full = computeListrik(machines, [], {}, 1000);
    const half = computeListrik(machines, [], { utilisasiProduksi: "50" }, 1000);
    assert.equal(full.utilisasi, 1);
    assert.equal(half.utilisasi, 0.5);
    assert.equal(half.rataRataBeban, full.rataRataBeban / 2);
    assert.equal(computeListrik(machines, [], { utilisasiProduksi: "150" }, 1000).utilisasi, 1);
    assert.match(listrikBebanFormula(half, (n) => `${n} kWh`), /× 85% × utilisasi 50% =/);
    assert.doesNotMatch(listrikBebanFormula(full, (n) => `${n} kWh`), /utilisasi/);
  });

  it("suggests realisasi ÷ kapasitas terpasang when the units match", () => {
    const s = suggestUtilisasi(
      [{ section: "sebelumnya", jumlah: "20469473", satuan: "KG" }, { section: "rencana", jumlah: "50000000", satuan: "KG" }],
      [{ kapasitasTerpasang: "50000000", satuan: "kg" }],
    );
    assert.ok(s);
    assert.equal(Math.round(s.pct * 100) / 100, 40.94);
    assert.equal(suggestUtilisasi([{ section: "sebelumnya", jumlah: "10", satuan: "TON" }], [{ kapasitasTerpasang: "50", satuan: "KG" }]), null);
  });
});
