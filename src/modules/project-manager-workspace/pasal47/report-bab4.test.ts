import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab4, brandOrigin, ownerType, relationshipOf } from "./report-bab4";
import type { P47Application, P47Brand, P47BrandUse, P47Dataset, P47Line } from "./types";

const app = (id: string): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company: `PT ${id}`, nib: "1", kbli: [], submittedAt: "2026-02-01", status: "COMPLETED",
  lhviu: { fileName: "x.pdf", uploadedAt: "", path: "x.pdf", number: `LHVIU-${id}`, issuedAt: id === "A" ? "2026-03-10" : "2026-05-02" }, kantor: null, gudang: [],
});
const line = (id: string, appId: string, brandId: string, quantity: number, total: number): P47Line => ({
  id, applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, productName: "", brandId, brandName: brandId, hs: "6109.10.10", hsDescription: "Kaos",
  kelompok: "Pakaian", subKelompok: "", komoditas: "", countries: ["Vietnam"], quantity, stock: 0, unit: "Pcs", price: 1, currency: "IDR", total,
});
const brandUse = (appId: string, role: string, valid = true): P47BrandUse => ({
  applicationId: appId, applicationNumber: `APP-${appId}`, company: `PT ${appId}`, role, basis: "",
  docStatus: { label: valid ? "Valid" : "Revisi", tone: valid ? "ok" : "warn" }, missingDocuments: [],
});
const brand = (id: string, owner: string, ownerCountry: string, uses: P47BrandUse[]): P47Brand => ({
  id, name: id, owner, ownerCountry, representative: "", evidenceType: "Sertifikat Merek", registrationNumber: "IDM1", registrationDate: "2020-01-01",
  expiryDate: "2030-01-01", classes: ["25"], evidencePath: null, uses,
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T00:00:00Z",
  applications: [app("A"), app("B")],
  lines: [line("1", "A", "ALFA", 100, 1000), line("2", "B", "ALFA", 50, 500), line("3", "B", "BETA", 10, 300)],
  brands: [
    brand("ALFA", "PT A", "ID", [brandUse("A", "Pemohon VIU Konsumsi sebagai Pemilik Merek"), brandUse("B", "Hanya Bertindak sebagai Importir", false)]),
    brand("BETA", "Beta Inc", "US", [brandUse("B", "Perwakilan Resmi Pemilik Merek")]),
  ],
  technical: [], warehouses: [], values: [], findings: [],
};

describe("Bab 4 Analisis Struktur Merek", () => {
  it("classifies role, origin and owner type", () => {
    assert.equal(relationshipOf({ role: "Pemohon VIU Konsumsi sebagai Pemilik Merek" }).key, "OWNER");
    assert.equal(relationshipOf({ role: "Perwakilan Resmi" }).key, "REP");
    assert.equal(relationshipOf({ role: "Hanya Bertindak sebagai Importir (ditunjuk oleh Pemilik Merek)" }).key, "IMPORTER");
    assert.equal(relationshipOf({ role: "Hanya Bertindak sebagai Importir" }).key, "IMPORTER");
    assert.equal(relationshipOf({ role: "" }).key, "UNKNOWN");
    assert.equal(brandOrigin({ ownerCountry: "ID" }), "Lokal");
    assert.equal(brandOrigin({ ownerCountry: "Amerika Serikat" }), "Luar negeri");
    assert.equal(brandOrigin({ ownerCountry: "INDONESIA" }), "Lokal");
    assert.equal(brandOrigin({ ownerCountry: "CHINA" }), "Luar negeri");
    assert.equal(brandOrigin({ ownerCountry: " " }), "Tidak diisi");
    assert.equal(ownerType({ owner: "PT Maju", ownerCountry: "ID" }), "Badan usaha dalam negeri");
    assert.equal(ownerType({ owner: "Budi Santoso", ownerCountry: "Indonesia" }), "Perorangan");
  });
  it("counts brands, pairs and relationships", () => {
    const b = bab4(ds);
    assert.equal(b.brands.length, 2);
    assert.equal(b.brands[0].name, "ALFA");
    assert.equal(b.brands[0].value, 1500);
    assert.equal(b.pairs.length, 3);
    assert.deepEqual(b.relRows.map((r) => r.pairs), [1, 1, 1, 0]);
    assert.equal(b.relRows[0].valid, 1);
    assert.equal(b.totalValue, 1800);
    assert.deepEqual(b.originRows.map((o) => o.origin), ["Lokal", "Luar negeri"]);
  });
  it("finds brands shared by several importers and keeps table widths", () => {
    const b = bab4(ds);
    assert.equal(b.shared.length, 2);
    assert.equal(b.shared[0][0], "ALFA");
    for (const r of b.pairTable) assert.equal(r.length, 10);
    for (const r of b.brandTable) assert.equal(r.length, 10);
    for (const r of b.shared) assert.equal(r.length, 6);
    for (const r of b.validityRows) assert.equal(r.length, 6);
    assert.equal(b.months.find((m) => m.key === "2026-05")?.count, 2);
    assert.equal(b.months[b.months.length - 1].cumulative, 2);
  });
});
