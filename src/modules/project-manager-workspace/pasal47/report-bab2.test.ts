import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab2, btkiBab, btkiLabel } from "./report-bab2";
import type { P47Application, P47Dataset, P47Line } from "./types";

const app = (id: string, issuedAt: string | null): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: "1", kbli: [], submittedAt: "2026-02-01", status: "COMPLETED",
  lhviu: { fileName: "x.pdf", uploadedAt: "", path: "x.pdf", number: null, issuedAt }, kantor: null, gudang: [],
});
const line = (id: string, appId: string, hs: string, kelompok: string, unit: string, quantity: number, total: number, currency = "IDR"): P47Line => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, productName: "", brandId: "b", brandName: "B", hs, hsDescription: `Uraian ${hs}`,
  kelompok, subKelompok: "", komoditas: "", countries: ["VIETNAM"], quantity, stock: 0, unit, price: 1, currency, total,
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [app("A", "2026-03-07"), app("B", "2026-03-20"), app("C", null)],
  lines: [
    line("1", "A", "6109.10.10", "Pakaian Jadi", "PCS", 100, 1000),
    line("2", "A", "6109.10.10", "Pakaian Jadi", "PCS", 50, 500),
    line("3", "B", "6302.60.00", "Barang Tekstil Jadi", "PCS", 400, 20, "USD"),
    line("4", "B", "5703.30.90", "Karpet", "M2", 70, 100),
    line("5", "C", "9619.00.13", "Barang Tekstil Jadi", "PCS", 10, 30, "CNY"),
  ],
  brands: [], technical: [], warehouses: [], findings: [],
  // PT B priced one line in USD with a kurs of 10; PT C's CNY line has no kurs.
  values: [{ applicationId: "B", applicationNumber: "APP-B", company: "PT B", currency: "USD", plan: 20, modalKerja: null, rate: 10, decision: { label: "", tone: "na" } }],
};

describe("Bab 2 Komoditas & Pos Tarif/HS", () => {
  it("reads the BTKI chapter from the pos tarif, ex-prefix included", () => {
    assert.equal(btkiBab("6109.10.10"), "61");
    assert.equal(btkiBab("ex 6302.60.00"), "63");
    assert.equal(btkiLabel("61"), "Bab 61 · Pakaian rajutan");
  });
  it("sums quantity per unit and value in Rupiah (foreign lines converted with the kurs, none left in their own currency)", () => {
    const b = bab2(ds);
    assert.deepEqual(b.units, ["PCS", "M2"]);
    assert.deepEqual(b.totalQty, [560, 70]);
    assert.equal(b.currency, "IDR");
    assert.equal(b.totalValue, 1000 + 500 + 20 * 10 + 100);
    assert.equal(b.unconverted, 1);
    const total = b.groupTable[b.groupTable.length - 1];
    assert.deepEqual(total, ["Total", 4, 5, 3, 560, 70]);
  });
  it("puts each VIU in the month of its LHVIU Tanggal Terbit", () => {
    const b = bab2(ds);
    const march = b.months.find((m) => m.key === "2026-03")!;
    assert.equal(march.viu, 2);
    assert.equal(march.qty, 550);
    assert.equal(b.undatedViu, 1);
  });
  it("ranks pos tarif by volume and by value, and flags codes outside Bab 50–63", () => {
    const b = bab2(ds);
    assert.equal(b.topVolume[0].key, "6302.60.00");
    assert.equal(b.topValue[0].key, "6109.10.10");
    assert.ok(b.sub22.some((p) => p.includes("9619.00.13")));
    for (const row of b.companyTable) assert.equal(row.length, 5 + b.units.length);
  });
});
