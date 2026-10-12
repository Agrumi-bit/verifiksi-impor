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
  it("reads luas and kapasitas gudang from the surveyor's gudang report", () => {
    const withGudang: P47Dataset = {
      ...ds,
      applications: [
        { id: "A", applicationNumber: "APP-A", companyId: "A", company: "PT A", nib: "", kbli: [], submittedAt: "2026-01-01", status: "SUBMITTED", lhviu: null, kantor: null,
          gudang: [{ address: "", city: "BEKASI", province: "", ownership: "", area: 500, capacity: 1200 }, { address: "", city: "BEKASI", province: "", ownership: "", area: 300, capacity: null }] },
        { id: "B", applicationNumber: "APP-B", companyId: "B", company: "PT B", nib: "", kbli: [], submittedAt: "2026-01-01", status: "SUBMITTED", lhviu: null, kantor: null, gudang: [] },
      ],
    };
    const b = bab6(withGudang);
    assert.equal(b.storage[0].company, "PT A");
    assert.equal(b.storage[0].area, 800);
    assert.equal(b.storage[0].capacity, 1200);
    assert.equal(b.storage[1].capacity, null);
    assert.deepEqual(b.storageTable[0], ["PT A", "BEKASI", "800", "1.200"]);
  });
  it("keeps table widths in step with the headers", () => {
    const b = bab6(ds);
    for (const r of b.companyTable) assert.equal(r.length, b.companyHeaders.length);
    for (const r of b.storageTable) assert.equal(r.length, 4);
  });
});
