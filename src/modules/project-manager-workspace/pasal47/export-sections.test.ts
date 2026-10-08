import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildExportSections, EXPORT_PARTS } from "./export-sections";
import { businessFlow, conclusionSections, kpis } from "./summary";
import type { P47Brand, P47Dataset, P47Report } from "./types";

const brand: P47Brand = {
  id: "b1", name: "Verona", owner: "Verona Holdings", ownerCountry: "Italia", representative: "", evidenceType: "Sertifikat Merek",
  registrationNumber: "IDM1", registrationDate: "2022-03-14", expiryDate: "2032-03-14", classes: ["25"], evidencePath: "x.pdf",
  uses: [{ applicationId: "A", applicationNumber: "APP-A", company: "PT A", role: "Hanya Bertindak sebagai Importir", basis: "", docStatus: { label: "Valid", tone: "ok" }, missingDocuments: [] }],
};
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "",
  applications: [{ id: "A", applicationNumber: "APP-A", companyId: "C", company: "PT A", nib: "1", kbli: [{ code: "46412", description: "" }], submittedAt: "2025-11-05", status: "COMPLETED", lhviu: null, kantor: null, gudang: [] }],
  lines: [{ id: "1", applicationId: "A", applicationNumber: "APP-A", company: "PT A", productName: "Kaos", brandId: "b1", brandName: "Verona", hs: "6109.10.00", hsDescription: "Kaos", kelompok: "", subKelompok: "Kaus", komoditas: "Kaus", countries: ["Vietnam"], quantity: 10, stock: 0, unit: "PCS", price: 2, currency: "USD", total: 20 }],
  brands: [brand], technical: [], warehouses: [], values: [],
  findings: [{ key: "survey:1", applicationId: "A", applicationNumber: "APP-A", company: "PT A", source: "Survei Lapangan", area: "Survei Gudang", text: "Stok berbeda", severity: "Major", status: { label: "Belum Ditinjau", tone: "warn" }, followUp: "—", pic: "S" }],
};
const report: P47Report = { status: "DRAFT", pmNote: "", materiality: { "survey:1": "MATERIAL" }, updatedAt: null, updatedByName: null };

describe("export sections", () => {
  it("builds every requested part in report order", () => {
    const sections = buildExportSections(ds, report, EXPORT_PARTS.map(([no]) => no));
    assert.deepEqual(sections.map((s) => s.no), EXPORT_PARTS.map(([no]) => no));
    for (const s of sections) for (const t of s.tables) for (const r of t.rows) assert.equal(r.length, t.headers.length, `${s.no} row width`);
  });
  it("prints materiality as classified by the PM", () => {
    const [s] = buildExportSections(ds, report, ["8.13"]);
    assert.equal(s.tables[0].rows[0][5], "Material");
  });
});

describe("summary", () => {
  it("counts material findings from the PM's classification", () => {
    assert.equal(kpis(ds, report).material, 1);
    assert.equal(kpis(ds, { ...report, materiality: {} }).material, 0);
  });
  it("never marks downstream steps as verified", () => {
    const flow = businessFlow(brand, ds);
    assert.deepEqual(flow.slice(4).map((n) => n.status.label), ["Data Not Available", "Data Not Available", "Data Not Available"]);
    assert.equal(flow[2].status.label, "Partial Data"); // completed application without LHVIU file
  });
  it("draft conclusion only cites counted figures", () => {
    const text = conclusionSections(ds, report).map((s) => s.paragraphs.join(" ")).join(" ");
    assert.match(text, /1 permohonan VIU Barang Konsumsi dari 1 perusahaan/);
    assert.match(text, /1 isu material/);
  });
});
