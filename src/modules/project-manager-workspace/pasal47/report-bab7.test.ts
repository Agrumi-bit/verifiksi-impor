import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab7, ratioGroup } from "./report-bab7";
import type { P47Application, P47Dataset, P47Line, P47Value, Status } from "./types";

const app = (id: string, issuedAt: string | null): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: "1", kbli: [], submittedAt: "2026-02-01", status: "COMPLETED",
  lhviu: { fileName: "x.pdf", uploadedAt: "", path: "x.pdf", number: `LHVIU-${id}`, issuedAt }, kantor: null, gudang: [],
});
const line = (id: string, appId: string, currency: string, total: number): P47Line => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, productName: "", brandId: "b", brandName: "B", hs: "6109.10.10", hsDescription: "Kaos",
  kelompok: "", subKelompok: "", komoditas: "", countries: [], quantity: 1, stock: 0, unit: "Pcs", price: 1, currency, total,
});
const ok: Status = { label: "Sesuai", tone: "ok" };
const value = (appId: string, currency: string, modalKerja: number | null, rate: number | null, decision: Status = ok): P47Value => ({
  applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, currency, plan: 0, modalKerja, rate, decision,
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [app("A", "2026-03-05"), app("B", "2026-03-20"), app("C", null)],
  lines: [line("1", "A", "IDR", 600), line("2", "A", "USD", 10), line("3", "B", "IDR", 3000), line("4", "C", "CNY", 5)],
  brands: [], technical: [], warehouses: [], findings: [],
  values: [value("A", "IDR", 1000, 1), value("A", "USD", 1000, 20, { label: "Tidak Sesuai", tone: "bad" }), value("B", "IDR", 1000, 1), value("C", "CNY", null, null, { label: "Belum Dianalisis", tone: "na" })],
};

describe("Bab 7 Modal Operasi & Rencana Nilai Impor", () => {
  it("groups ratios", () => {
    assert.equal(ratioGroup(0.25), "≤ 25%");
    assert.equal(ratioGroup(0.6), "> 50–100%");
    assert.equal(ratioGroup(1.01), "> 100%");
    assert.equal(ratioGroup(null), "Tidak dapat dihitung");
  });
  it("compares the Rupiah plan of each permohonan with its modal kerja", () => {
    const b = bab7(ds);
    assert.deepEqual(b.rows.map((r) => [r.company, r.plan, r.ratio]), [["PT B", 3000, 3], ["PT A", 800, 0.8], ["PT C", 0, null]]);
    assert.equal(b.rows[1].decision, "Tidak Sesuai");
    assert.equal(b.rows[2].unconverted, 1);
    assert.equal(b.totalModal, 2000);
    assert.deepEqual(b.ratioBuckets.map((x) => x.value), [0, 0, 1, 1, 1]);
    assert.equal(b.months.find((m) => m.key === "2026-03")?.median, (3 + 0.8) / 2);
  });
  it("keeps the table width", () => {
    for (const r of bab7(ds).table) assert.equal(r.length, 9);
  });
});
