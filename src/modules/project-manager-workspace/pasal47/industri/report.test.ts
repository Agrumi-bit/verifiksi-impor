import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { P47Application, P47Report } from "../types";
import { buildIndustriSections, industriAlerts, industriConclusion, industriHsRows, industriKpis, INDUSTRI_PARTS } from "./report";
import type { IndustriDataset, IndustriLine } from "./types";

const place = { address: "Jl. Contoh 1", city: "Bandung", province: "Jawa Barat", ownership: "Milik Sendiri" };
const app = (id: string, over: Partial<P47Application> = {}): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: id, kbli: [{ code: "46411", description: "Perdagangan Besar Tekstil" }],
  submittedAt: "2026-09-02", status: "SUBMITTED", lhviu: null, kantor: place, gudang: [place], ...over,
});
const line = (id: string, appId: string, over: Partial<IndustriLine> = {}): IndustriLine => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, material: "Benang Kapas", hs: "5205.11.00", hsDescription: "Benang kapas",
  quantity: 100, unit: "KG", intendedUse: "Produksi kain", partnerId: "p1", partnerName: "PT Mitra", ...over,
});
const report: P47Report = { status: "DRAFT", pmNote: "", materiality: {}, updatedAt: null, updatedByName: null, preparedAt: null };
const dataset = (over: Partial<IndustriDataset> = {}): IndustriDataset => ({
  period: { from: "2026-01-01", to: "2026-12-31" }, generatedAt: "2026-10-09T00:00:00Z", applications: [app("1"), app("2")],
  lines: [line("a", "1"), line("b", "2", { quantity: 50 })], partners: [{ id: "p1", name: "PT Mitra", nib: "N1", type: "INDUSTRI", contractNumber: "K-1", contractEnd: "2027-01-01",
    uses: [{ applicationId: "1", applicationNumber: "APP-1", company: "PT 1", lhvki: "LHVKI-1", lhvkiPath: "x.pdf", lines: 1 }, { applicationId: "2", applicationNumber: "APP-2", company: "PT 2", lhvki: "", lhvkiPath: null, lines: 1 }] }],
  analysis: [], warehouses: [], values: [], findings: [], ...over,
});

describe("industri report", () => {
  it("sums quantity within one unit and flags mixed units", () => {
    const rows = industriHsRows([line("a", "1"), line("b", "2", { quantity: 50 }), line("c", "2", { hs: "5407.52.00", unit: "KG" }), line("d", "1", { hs: "5407.52.00", unit: "M2" })]);
    assert.deepEqual(rows.map((r) => [r.hs, r.quantity, r.unit]), [["5205.11.00", 150, "KG"], ["5407.52.00", Number.NaN, "KG / M2"]]);
  });

  it("counts companies, HS and partners", () => {
    assert.deepEqual(industriKpis(dataset(), report), { companies: 2, applications: 2, lhviu: 0, hs: 1, lines: 2, partners: 1, findings: 0, material: 0 });
  });

  it("warns about a partner relation without LHVKI document", () => {
    assert.ok(industriAlerts(dataset()).some((a) => /1 relasi Partner Industri tanpa dokumen LHVKI/.test(a.text)));
  });

  it("says the system holds no price or origin country", () => {
    assert.ok(industriAlerts(dataset()).some((a) => /Harga, negara asal/.test(a.text)));
  });

  it("builds every section, with the chapter narrative on 8.2", () => {
    const sections = buildIndustriSections(dataset(), report, INDUSTRI_PARTS.map(([no]) => no));
    assert.deepEqual(sections.map((s) => s.no), INDUSTRI_PARTS.map(([no]) => no));
    assert.match(sections[0].narrative?.join(" ") ?? "", /Bahan Baku\/Penolong Perusahaan Industri/);
    assert.equal(sections.find((s) => s.no === "8.4")?.tables[0].rows.length, 2);
  });

  it("writes the conclusion from counted figures only", () => {
    const text = industriConclusion(dataset(), report).flatMap((s) => s.paragraphs).join(" ");
    assert.match(text, /2 permohonan VIU Bahan Baku Industri dari 2 perusahaan/);
  });
});
