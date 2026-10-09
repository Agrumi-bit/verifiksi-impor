import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab5, certificateValidity } from "./report-bab5";
import type { P47Application, P47Dataset, P47Line, P47Technical, Status } from "./types";

const app = (id: string): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: "1", kbli: [], submittedAt: "2026-02-01", status: "COMPLETED",
  lhviu: null, kantor: null, gudang: [],
});
const line = (id: string, appId: string, brand: string, sub: string, total: number): P47Line => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, productName: "", brandId: brand, brandName: brand, hs: `6109.10.${id}`, hsDescription: "Kaos",
  kelompok: "Pakaian", subKelompok: sub, komoditas: "", countries: [], quantity: 10, stock: 0, unit: "Pcs", price: 1, currency: "IDR", total,
});
const ok: Status = { label: "Lengkap", tone: "ok" };
const cert = (id: string, appId: string, brand: string, sub: string, over: Partial<P47Technical> = {}): P47Technical => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, brandName: brand, subKelompok: sub, documentType: "Sertifikat Hasil Uji Mutu",
  laboratory: "Lab A", reportNumber: `R-${id}`, issueDate: "2026-03-01", validUntil: "2027-03-01", labelStatement: { label: "Terverifikasi", tone: "ok" }, verification: "Terverifikasi", status: ok, ...over,
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [app("A"), app("B")],
  lines: [
    line("1", "A", "Alfa", "Atasan", 100), line("2", "A", "ALFA", "atasan", 100), line("3", "A", "Alfa", "Bawahan", 50),
    line("4", "B", "Beta", "Atasan", 300),
  ],
  brands: [],
  technical: [
    cert("1", "A", "Alfa", "Atasan"),
    cert("2", "B", "Beta", "Atasan", { validUntil: "2026-08-01", status: { label: "Kedaluwarsa", tone: "bad" }, laboratory: "", labelStatement: { label: "Perlu Revisi", tone: "warn" } }),
  ],
  warehouses: [], values: [], findings: [],
};

describe("Bab 5 Persyaratan Teknis", () => {
  it("rates validity at the end of the period", () => {
    assert.equal(certificateValidity("2027-03-01", "2026-09-30"), "Berlaku");
    assert.equal(certificateValidity("2026-12-15", "2026-09-30"), "Berlaku – segera berakhir");
    assert.equal(certificateValidity("2026-08-01", "2026-09-30"), "Kedaluwarsa");
    assert.equal(certificateValidity("", "2026-09-30"), "Tidak dicatat");
  });
  it("links product lines to the certificate of their merek and sub kelompok", () => {
    const b = bab5(ds);
    assert.equal(b.certs[0].lines.length, 2);
    assert.equal(b.covered.length, 3);
    assert.deepEqual(b.uncovered.map((l) => l.id), ["3"]);
    assert.equal(b.coveredValue, 500);
    assert.deepEqual(b.statusRows.map((r) => [r.label, r.certs]), [["Lengkap", 1], ["Kedaluwarsa", 1]]);
    assert.equal(b.labs.at(-1)?.lab, "Tidak dicatat");
    assert.deepEqual(b.labels.map((l) => [l.label, l.apps]), [["Terverifikasi", 1], ["Perlu Revisi", 1]]);
  });
  it("keeps table widths", () => {
    const b = bab5(ds);
    for (const r of b.companyTable) assert.equal(r.length, 10);
    for (const r of b.certTable) assert.equal(r.length, 10);
    assert.equal(b.companies[0].uncovered, 1);
  });
});
