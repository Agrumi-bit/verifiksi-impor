import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { dominantUnit, hsRows, nonIndustriReport } from "./report";
import type { NonIndustriDataset, NonIndustriLine } from "./types";
import type { P47Application, P47Report } from "../types";

const app = (id: string, over: Partial<P47Application> = {}): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: "1", kbli: [{ code: "46411", description: "Perdagangan Besar Tekstil" }], submittedAt: "2026-02-01", status: "COMPLETED",
  lhviu: null, kantor: { address: "", city: "BANDUNG", province: "JAWA BARAT", ownership: "Sewa", fieldConclusion: "Sesuai" },
  gudang: [{ address: "", city: "BANDUNG", province: "JAWA BARAT", ownership: "Milik Sendiri", registration: "TDG 1", area: 500, capacity: 1200, fieldConclusion: "Sesuai" }], ...over,
});
const line = (id: string, appId: string, hs: string, quantity: number, unit = "KG", material = "Benang"): NonIndustriLine => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, material, hs, hsDescription: "Benang dari poliester", quantity, unit, intendedUse: "Bahan baku konveksi",
});
const ok = { label: "Sesuai", tone: "ok" as const };
const ds: NonIndustriDataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [app("A", { lhviu: { fileName: "x", uploadedAt: "", path: "p", number: "1/LHVIU", issuedAt: "2026-03-17" } }), app("B", { kbli: [{ code: "46900", description: "Lain" }] })],
  lines: [line("1", "A", "5402.33.00", 1000), line("2", "A", "5402.33.00", 500), line("3", "B", "5503.20.00", 300), line("4", "B", "5503.20.00", 10, "M")],
  needs: [{ applicationId: "A", applicationNumber: "APP-A", company: "PT A", hs: "5402.33.00", contractNeed: 1000, stock: 200, requested: 1500, status: ok }],
  analysis: [{ applicationId: "A", applicationNumber: "APP-A", company: "PT A", moduleKey: "modal", module: "Kepemilikan Modal", status: { label: "Tidak Sesuai", tone: "bad" }, conclusion: "Modal kurang" }],
  warehouses: [{ id: "w", applicationId: "A", applicationNumber: "APP-A", company: "PT A", city: "BANDUNG", province: "JAWA BARAT", ownership: "Sewa", area: 500, capacity: 1200, analystCapacity: 1000, analystStock: 400, analystPlan: 700, analystDecision: ok }],
  values: [{ applicationId: "A", applicationNumber: "APP-A", company: "PT A", nilaiImpor: 2e9, modalKerja: 1e9, evidence: ["Rekening Koran"], decision: ok }],
  findings: [{ key: "f1", applicationId: "A", applicationNumber: "APP-A", company: "PT A", source: "Survei Lapangan", area: "Survei Gudang", text: "Papan nama tidak ada", severity: "Minor", status: ok, followUp: "—", pic: "—" }],
};
const report: P47Report = { status: "DRAFT", pmNote: "", materiality: { f1: "MATERIAL" }, updatedAt: null, updatedByName: null, preparedAt: null };

describe("Laporan VIU Non Industri", () => {
  it("sums volumes per HS only within one unit", () => {
    assert.equal(dominantUnit(ds.lines), "KG");
    const rows = hsRows(ds.lines);
    assert.equal(rows[0].hs, "5402.33.00");
    assert.equal(rows[0].quantity, 1500);
    assert.ok(Number.isNaN(rows[1].quantity));
  });
  it("builds ten chapters with consistent table widths", () => {
    const m = nonIndustriReport(ds, report);
    assert.equal(m.chapters.length, 10);
    for (const c of m.chapters) for (const b of c.blocks) if (b.t === "table") for (const r of b.rows) assert.equal(r.length, b.headers.length, `${c.n} ${b.title}`);
  });
  it("flags KBLI, coverage, capacity and capital gaps", () => {
    const m = nonIndustriReport(ds, report);
    const text = m.chapters.flatMap((c) => c.blocks.flatMap((b) => (b.t === "p" ? [b.text] : b.t === "highlights" ? b.items : []))).join("\n");
    assert.match(text, /1 dari 2 permohonan diajukan perusahaan yang memiliki KBLI Utama/);
    assert.match(text, /melebihi kebutuhan kontrak \(PT A\)/);
    assert.match(text, /melebihi kapasitas gudang \(PT A\)/);
    assert.match(text, /modal kerja lebih kecil dari nilai impor \(PT A\)/);
    assert.match(text, /1 temuan material/);
  });
  it("reports nihil for an empty period", () => {
    const m = nonIndustriReport({ ...ds, applications: [], lines: [], needs: [], analysis: [], warehouses: [], values: [], findings: [] }, report);
    assert.match(m.conclusion[0].paragraphs[0], /laporan nihil/);
    for (const c of m.chapters) assert.ok(c.blocks.length > 0);
  });
});
