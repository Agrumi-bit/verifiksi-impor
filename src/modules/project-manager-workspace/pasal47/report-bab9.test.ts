import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab9 } from "./report-bab9";
import type { P47Application, P47Dataset, P47Line, P47Place } from "./types";

const place = (city: string, province: string, ownership: string, over: Partial<P47Place> = {}): P47Place => ({ address: "Jl. A", city, province, ownership, ...over });
const app = (id: string, kantor: P47Place | null, gudang: P47Place[]): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: "1", kbli: [], submittedAt: "2026-02-01", status: "COMPLETED", lhviu: null, kantor, gudang,
});
const line = (id: string, appId: string, unit: string, quantity: number): P47Line => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, productName: "", brandId: "b", brandName: "B", hs: "6109", hsDescription: "",
  kelompok: "", subKelompok: "", komoditas: "", countries: [], quantity, stock: 0, unit, price: 1, currency: "IDR", total: 1,
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [
    app("A", place("JAKARTA UTARA", "DKI JAKARTA", "Sewa", { leaseEnd: "2026-12-31", fieldConclusion: "Sesuai" }), [
      place("BEKASI", "JAWA BARAT", "Milik Sendiri", { registration: "TDG 1", area: 1000, fieldConclusion: "Tidak Sesuai" }),
      place("BEKASI", "JAWA BARAT", "Sewa", { registration: "", area: 500, leaseEnd: "2028-01-01" }),
    ]),
    app("B", null, []),
  ],
  lines: [line("1", "A", "Pcs", 3000), line("2", "A", "M2", 10), line("3", "B", "Pcs", 100)],
  brands: [], technical: [], warehouses: [], values: [], findings: [],
};

describe("Bab 9 Fasilitas & Lokasi", () => {
  it("counts kantor and gudang by ownership, legality and conclusion", () => {
    const b = bab9(ds);
    assert.equal(b.kantor.length, 1);
    assert.equal(b.gudang.length, 2);
    assert.deepEqual(b.ownership.gudang, [{ label: "Milik Sendiri", value: 1 }, { label: "Sewa", value: 1 }]);
    assert.deepEqual(b.registrations, [{ label: "TDG", value: 1 }, { label: "Tidak diisi", value: 1 }]);
    assert.equal(b.conclusions.find((c) => c.label === "Tidak Sesuai")?.value, 1);
    assert.equal(b.kantorProvinces[0].province, "DKI Jakarta");
    assert.deepEqual(b.leaseEnding.map((l) => l.leaseEnd), ["2026-12-31"]);
  });
  it("compares the rencana volume with the measured luas gudang", () => {
    const b = bab9(ds);
    const a = b.rows.find((r) => r.company === "PT A")!;
    assert.equal(a.area, 1500);
    assert.equal(a.perArea, 2);
    assert.equal(b.rows.find((r) => r.company === "PT B")!.perArea, null);
    assert.equal(b.areaBuckets.find((x) => x.label === "500–1.000 m²")?.value, 1);
    for (const r of b.table) assert.equal(r.length, 10);
  });
});
