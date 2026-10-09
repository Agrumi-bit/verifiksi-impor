import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab8, concentrationOf, hhiLevel } from "./report-bab8";
import type { P47Brand, P47Dataset, P47Line } from "./types";

const line = (id: string, company: string, brandId: string, hs: string, total: number): P47Line => ({
  id, applicationId: company, applicationNumber: `APP-${company}`, company, productName: "", brandId, brandName: brandId, hs, hsDescription: "",
  kelompok: "Pakaian", subKelompok: "", komoditas: "", countries: ["Vietnam"], quantity: 1, stock: 0, unit: "Pcs", price: 1, currency: "IDR", total,
});
const brand = (id: string, owner: string): P47Brand => ({
  id, name: id, owner, ownerCountry: "ID", representative: "", evidenceType: "", registrationNumber: "", registrationDate: "", expiryDate: "", classes: [], evidencePath: null, uses: [],
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [],
  lines: [line("1", "PT A", "X", "6109", 600), line("2", "PT B", "X", "6110", 300), line("3", "PT C", "Y", "6109", 100)],
  brands: [brand("X", "Budi"), brand("Y", "PT Y")], technical: [], warehouses: [], values: [], findings: [],
};

describe("Bab 8 Konsentrasi", () => {
  it("computes CR and HHI", () => {
    const d = concentrationOf("k", "K", [["a", 60], ["b", 30], ["c", 10], ["a", 0]]);
    assert.equal(d.hhi, 3600 + 900 + 100);
    assert.equal(d.cr1, 0.6);
    assert.ok(Math.abs(d.cr3 - 1) < 1e-9);
    assert.equal(d.level, "Tinggi");
    assert.equal(hhiLevel(1499), "Rendah");
    assert.equal(hhiLevel(2500), "Sedang");
  });
  it("measures six dimensions of the rencana nilai", () => {
    const b = bab8(ds);
    assert.equal(b.dims.length, 6);
    const owner = b.dims.find((d) => d.key === "owner")!;
    assert.equal(owner.items[0].label, "Budi");
    assert.equal(owner.cr1, 0.9);
    assert.equal(b.dims.find((d) => d.key === "country")!.hhi, 10000);
    for (const r of b.table) assert.equal(r.length, 8);
    assert.match(b.sub83[0], /diajukan oleh 2 pemohon/);
  });
});
