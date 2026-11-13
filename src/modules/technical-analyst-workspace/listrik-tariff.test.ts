import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeListrik, resolveListrikTariff, TARIF_LAINNYA } from "./listrik-calc";

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
