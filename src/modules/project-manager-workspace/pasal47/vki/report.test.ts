import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { countriesOf, materialHsRows, vkiReport } from "./report";
import type { VkiDataset, VkiMaterial } from "./types";
import type { P47Report } from "../types";

const ref = (id: string) => ({ applicationId: id, applicationNumber: `APP-${id}`, company: `PT ${id}` });
const mat = (id: string, appId: string, hs: string, domestic: number, imported: number, unit = "KG", country = "Tiongkok, Vietnam"): VkiMaterial => ({
  ...ref(appId), id, name: "Benang", hs, hsDescription: "Benang", category: "Bahan Baku", use: "Tenun", stock: 100, needDomestic: domestic, needImport: imported, needTotal: domestic + imported, importCountry: country, unit,
});
const ok = { label: "Sesuai", tone: "ok" as const };
const place = { address: "", city: "BANDUNG", province: "JAWA BARAT", ownership: "Milik Sendiri", fieldConclusion: "Sesuai" };
const ds: VkiDataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-12T00:00:00Z",
  applications: [
    { id: "A", applicationNumber: "APP-A", companyId: "A", company: "PT A", nib: "1", kbli: [{ code: "13112", description: "Pertenunan" }], submittedAt: "2026-02-01", status: "COMPLETED", lhviu: null, kantor: place, gudang: [place], pabrik: [place] },
    { id: "B", applicationNumber: "APP-B", companyId: "B", company: "PT B", nib: "2", kbli: [{ code: "46411", description: "Perdagangan" }], submittedAt: "2026-03-01", status: "IN_PROGRESS", lhviu: null, kantor: place, gudang: [], pabrik: [place] },
  ],
  products: [{ ...ref("A"), id: "p1", category: "Kain", name: "Kain tenun", hs: "5208.11.00", hsDescription: "Kain", producedLastYear: 800, plannedProduction: 1200, productionUnit: "M", salesDomestic: 900, salesExport: 300, exportDestination: "Jepang", salesUnit: "M" }],
  capacities: [{ ...ref("A"), product: "Kain", kbli: "13112", basis: "Izin", capacity: 1000, unit: "M" }],
  materials: [mat("m1", "A", "5205.11.00", 300, 700), mat("m2", "B", "5205.11.00", 0, 500), mat("m3", "B", "5402.33.00", 10, 0, "M", "")],
  machines: [{ ...ref("A"), name: "Mesin tenun", brand: "Toyota", year: "2020", count: 10, process: "Tenun", capacity: 50, capacityUnit: "m/jam", condition: "Aktif", power: 5, powerUnit: "kW" }],
  workforce: [{ ...ref("A"), category: "Produksi", count: 40 }, { ...ref("A"), category: "Kantor", count: 5 }],
  electricity: [{ ...ref("A"), month: "Juli", kwh: 1000, nominal: 1.5e6 }],
  analysis: [{ ...ref("A"), moduleKey: "kapasitas", module: "Kapasitas Produksi", status: ok, conclusion: "Sesuai" }],
  findings: [],
};
const report: P47Report = { status: "DRAFT", pmNote: "", materiality: {}, updatedAt: null, updatedByName: null, preparedAt: null };

describe("Laporan Pelaksanaan VKI", () => {
  it("sums material need per HS within one unit and splits free-text countries", () => {
    const rows = materialHsRows(ds.materials);
    assert.equal(rows[0].hs, "5205.11.00");
    assert.equal(rows[0].need, 1500);
    assert.equal(rows[0].imported, 1200);
    assert.deepEqual(countriesOf("Tiongkok, Vietnam dan India"), ["TIONGKOK", "VIETNAM", "INDIA"]);
  });
  it("builds ten chapters with consistent table widths", () => {
    const m = vkiReport(ds, report);
    assert.equal(m.chapters.length, 10);
    for (const c of m.chapters) for (const b of c.blocks) if (b.t === "table") for (const r of b.rows) assert.equal(r.length, b.headers.length, `${c.n} ${b.title}`);
  });
  it("states capacity overrun, import share, workforce and missing bills", () => {
    const m = vkiReport(ds, report);
    const text = m.chapters.flatMap((c) => c.blocks.flatMap((b) => (b.t === "p" ? [b.text] : b.t === "highlights" ? b.items : []))).join("\n");
    assert.match(text, /melebihi kapasitas terpasang \(PT A\)/);
    assert.match(text, /impor sebesar 1\.200 KG \(80,0%\)/);
    assert.match(text, /45 tenaga kerja/);
    assert.match(text, /kurang dari 3 bulan tagihan/);
  });
  it("reads LHVKI status and its 3-year validity", () => {
    const withLhvki = { ...ds, applications: ds.applications.map((x, i) => (i ? x : { ...x, lhviu: { fileName: "l.pdf", uploadedAt: "", path: "p", number: "1/LHVKI/TBI/III/2026", issuedAt: "2026-03-17" } })) };
    const m = vkiReport(withLhvki, report);
    const text = m.chapters[0].blocks.flatMap((b) => (b.t === "p" ? [b.text] : b.t === "highlights" ? b.items : [])).join("\n");
    assert.match(text, /1 permohonan terbit/);
    assert.match(text, /masa berlaku paling awal berakhir 17 Maret 2029 \(PT A\)/);
    assert.match(text, /1 dari 2 LHVKI telah terbit/);
  });
  it("reports nihil for an empty period", () => {
    const empty = { ...ds, applications: [], products: [], capacities: [], materials: [], machines: [], workforce: [], electricity: [], analysis: [], findings: [] };
    const m = vkiReport(empty, report);
    assert.match(m.conclusion[0].paragraphs[0], /laporan nihil/);
  });
});
