import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab6 } from "./report-bab6";
import type { P47Dataset, P47Line, P47Warehouse } from "./types";

const line = (id: string, appId: string, unit: string, quantity: number, stock: number, kelompok = "Pakaian"): P47Line => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, productName: "", brandId: "b", brandName: "B", hs: "6109.10.10", hsDescription: "Kaos",
  kelompok, subKelompok: "", komoditas: "", countries: [], quantity, stock, unit, price: 1, currency: "IDR", total: 1,
});
const wh = (id: string, appId: string, capacity: number | null, stock: number | null, plan: number | null): P47Warehouse => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, place: { address: "", city: "BEKASI", province: "", ownership: "" },
  capacity, analystStock: stock, analystPlan: plan, declaredStock: {}, analystDecision: capacity === null ? "Belum Dianalisis" : "Sesuai",
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [],
  lines: [line("1", "A", "Pcs", 1000, 100), line("2", "A", "Pcs", 1000, 0), line("3", "A", "M2", 50, 20, "Karpet"), line("4", "B", "Pcs", 2000, 0)],
  brands: [], technical: [], values: [], findings: [],
  warehouses: [wh("W1", "A", 100, 30, 90), wh("W2", "A", null, null, null), wh("W3", "B", null, null, null)],
};

describe("Bab 6 Persediaan", () => {
  it("keeps stock per unit and counts zero-stock lines", () => {
    const b = bab6(ds);
    assert.deepEqual(b.units, ["Pcs", "M2"]);
    assert.deepEqual(b.stockByUnit, [100, 20]);
    assert.deepEqual(b.planByUnit, [4000, 50]);
    assert.equal(b.zero.length, 2);
    assert.equal(b.companies[0].company, "PT A");
    assert.equal(b.companies[0].ratio, 0.05);
    assert.equal(b.companies[0].warehouses, 2);
  });
  it("reads the Technical Analyst's kapasitas gudang (stok + rencana ÷ kapasitas)", () => {
    const b = bab6(ds);
    assert.equal(b.storage[0].company, "PT A");
    assert.equal(b.storage[0].used, 1.2);
    assert.equal(b.storage[1].used, null);
    assert.equal(b.storageTable[0][5], "120%");
  });
  it("keeps table widths in step with the headers", () => {
    const b = bab6(ds);
    for (const r of b.companyTable) assert.equal(r.length, b.companyHeaders.length);
    for (const r of b.storageTable) assert.equal(r.length, 7);
  });
});
