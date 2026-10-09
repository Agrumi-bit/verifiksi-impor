import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab3, countryInfo } from "./report-bab3";
import type { P47Application, P47Dataset, P47Line } from "./types";

const app = (id: string): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: "1", kbli: [], submittedAt: "2026-02-01", status: "COMPLETED",
  lhviu: { fileName: "x.pdf", uploadedAt: "", path: "x.pdf", number: null, issuedAt: "2026-03-10" }, kantor: null, gudang: [],
});
const line = (id: string, appId: string, countries: string[], quantity: number, total: number): P47Line => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, productName: "", brandId: "b", brandName: "B", hs: "6109.10.10", hsDescription: "Kaos",
  kelompok: "Pakaian", subKelompok: "", komoditas: "", countries, quantity, stock: 0, unit: "Pcs", price: 1, currency: "IDR", total,
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [app("A"), app("B")],
  lines: [line("1", "A", ["REP. RAKYAT CINA"], 100, 1000), line("2", "B", ["REP. RAKYAT CINA", "HongKong", "Vietnam", "Spanyol"], 400, 2000)],
  brands: [], technical: [], warehouses: [], values: [], findings: [],
};

describe("Bab 3 Negara Asal", () => {
  it("normalises spellings and knows the kawasan", () => {
    assert.equal(countryInfo("HongKong").key, countryInfo("HONGKONG").key);
    assert.equal(countryInfo("REP. RAKYAT CINA").region, "Asia Timur");
    assert.equal(countryInfo("Vietnam").region, "ASEAN");
    assert.equal(countryInfo("Atlantis").region, "Lainnya");
  });
  it("splits a multi-country line evenly over its countries (estimate)", () => {
    const b = bab3(ds);
    const cn = b.countries.find((c) => c.key === "REPRAKYATCINA")!;
    assert.equal(cn.qty, 100 + 100);
    assert.equal(cn.value, 1000 + 500);
    assert.equal(cn.lines, 2);
    assert.equal(b.countries[0].key, "REPRAKYATCINA");
    assert.equal(b.relations, 5);
    assert.equal(b.multi, 1);
    const total = b.regionTable[b.regionTable.length - 1];
    assert.equal(total[2], 3000);
  });
  it("groups lines by how many countries they list and finds the certain lower bound", () => {
    const b = bab3(ds);
    assert.equal(b.buckets[0].value, 1);
    assert.equal(b.buckets[1].value, 1);
    assert.equal(b.singleTopQty, 100);
    for (const row of b.companyTable) assert.equal(row.length, 6);
  });
});
