import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab10, needStatus } from "./report-bab10";
import type { P47Dataset, P47Finding, P47Line, P47Report } from "./types";

const line = (id: string, hs: string, countries: string[]): P47Line => ({
  id, applicationId: "A", applicationNumber: "APP-A", company: "PT A", productName: "", brandId: "b", brandName: "B", hs, hsDescription: "",
  kelompok: "", subKelompok: "", komoditas: "", countries, quantity: 1, stock: 0, unit: "Pcs", price: 1, currency: "IDR", total: 100,
});
const finding = (key: string, severity: P47Finding["severity"]): P47Finding => ({
  key, applicationId: "A", applicationNumber: "APP-A", company: "PT A", source: "Survei Lapangan", area: "Gudang", text: "Stok berbeda", severity,
  status: { label: "Belum Ditinjau", tone: "warn" }, followUp: "", pic: "",
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [{ id: "A", applicationNumber: "APP-A", companyId: "A", company: "PT A", nib: "1", kbli: [], submittedAt: "2026-02-01", status: "COMPLETED", lhviu: { fileName: "x", uploadedAt: "", path: "x", number: null, issuedAt: null }, kantor: null, gudang: [] }],
  lines: [line("1", "9619.00.13", ["Indonesia"]), line("2", "6109.10.10", ["Vietnam"])],
  brands: [], technical: [], warehouses: [], values: [], findings: [finding("f1", "Minor"), finding("f2", "Major")],
};
const report: P47Report = { status: "DRAFT", pmNote: "", materiality: { f2: "MATERIAL" }, updatedAt: null, updatedByName: null };

describe("Bab 10 Temuan & Rekomendasi", () => {
  it("derives analytical findings with priorities, highest first", () => {
    const b = bab10(ds, report, ["PT A"]);
    const areas = b.analytic.map((x) => x.area);
    assert.ok(areas.includes("KBLI"));
    assert.ok(areas.includes("Pos tarif/HS"));
    assert.ok(areas.includes("Negara asal"));
    assert.ok(areas.includes("Data LHVIU"));
    assert.equal(b.analytic[0].priority, "Tinggi");
    assert.equal(b.analytic.at(-1)?.priority, "Rendah");
    for (const r of b.analyticTable) assert.equal(r.length, 5);
  });
  it("summarises recorded findings and materiality", () => {
    const b = bab10(ds, report);
    assert.deepEqual(b.severities, ["Major", "Minor"]);
    assert.deepEqual(b.recorded, [{ source: "Survei Lapangan", counts: [1, 1], total: 2 }]);
    assert.deepEqual(b.materiality, [{ label: "Material", value: 1 }, { label: "Needs Review", value: 1 }]);
    assert.equal(b.recordedTable[0][4], "Major");
    for (const r of b.recordedTable) assert.equal(r.length, 8);
  });
  it("rates data completeness", () => {
    assert.equal(needStatus({ have: 0, of: 3 }), "Belum tersedia");
    assert.equal(needStatus({ have: 3, of: 3 }), "Lengkap");
    assert.equal(needStatus({ have: 1, of: 3 }), "Sebagian (1/3)");
    const b = bab10(ds, report);
    assert.equal(b.needs[0].data, "Nomor dan Tanggal Terbit LHVIU");
    assert.equal(needStatus(b.needs[0]), "Belum tersedia");
  });
});
