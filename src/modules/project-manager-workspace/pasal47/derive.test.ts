import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyFilters, brandCertificateStatus, concentration, countryRows, defaultPeriod, hsRows, lhviuStatus, reportingPeriods, trend, valueByHs } from "./derive";
import type { P47Application, P47Dataset, P47Line } from "./types";

const app = (id: string, company: string, city: string, submittedAt: string, extra: Partial<P47Application> = {}): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company, nib: "", kbli: [{ code: "46412", description: "" }], submittedAt,
  status: "SUBMITTED", lhviu: null, kantor: { address: "", city, province: "", ownership: "Sewa" }, gudang: [], ...extra,
});
const line = (id: string, applicationId: string, hs: string, unit: string, quantity: number, total: number, currency: string, countries: string[], brandName = "B"): P47Line => ({
  id, applicationId, applicationNumber: `APP-${applicationId}`, company: applicationId, productName: "", brandId: brandName, brandName, hs, hsDescription: hs,
  kelompok: "", subKelompok: "Sub", komoditas: "Kom", countries, quantity, stock: 0, unit, price: 0, currency, total,
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "",
  applications: [app("A", "PT A", "Jakarta Utara", "2025-11-05"), app("B", "PT B", "Bandung", "2026-01-20", { lhviu: { fileName: "x.pdf", uploadedAt: "", path: "" } })],
  lines: [
    line("1", "A", "5209.42.00", "METER", 100, 1000, "USD", ["Italia", "Turki"], "Verona"),
    line("2", "A", "6109.10.00", "PCS", 50, 500, "USD", ["Vietnam"], "Kasai"),
    line("3", "B", "6109.10.00", "PCS", 30, 3000, "CNY", ["Vietnam"], "Kasai"),
    line("4", "B", "6109.10.00", "PCS", 20, 200, "USD", ["Jepang"], "Kasai"),
  ],
  brands: [], technical: [], warehouses: [], values: [], findings: [],
};

describe("Pasal 47 reporting periods", () => {
  it("runs 1 Oktober to 30 September, newest first", () => {
    const p = reportingPeriods(new Date("2026-10-09T00:00:00Z"));
    assert.deepEqual(p.map((x) => x.label), ["01 Okt 2026 – 30 Sep 2027", "01 Okt 2025 – 30 Sep 2026", "01 Okt 2024 – 30 Sep 2025"]);
  });
  it("defaults to the year that contains today", () => {
    assert.equal(defaultPeriod(new Date("2026-10-09T00:00:00Z")).label, "01 Okt 2026 – 30 Sep 2027");
    assert.equal(defaultPeriod(new Date("2026-09-30T00:00:00Z")).label, "01 Okt 2025 – 30 Sep 2026");
  });
});

describe("statuses", () => {
  it("LHVIU is judged on the uploaded report only", () => {
    assert.equal(lhviuStatus(ds.applications[1]).label, "Terbit");
    assert.equal(lhviuStatus(ds.applications[0]).label, "Dalam Proses");
    assert.equal(lhviuStatus({ ...ds.applications[0], status: "COMPLETED" }).label, "Belum Diunggah");
  });
  it("brand certificate validity is measured at the end of the period", () => {
    const end = "2026-09-30";
    assert.equal(brandCertificateStatus({ registrationNumber: "", expiryDate: "" }, end).label, "Tidak Lengkap");
    assert.equal(brandCertificateStatus({ registrationNumber: "X", expiryDate: "2026-08-12" }, end).label, "Kedaluwarsa");
    assert.equal(brandCertificateStatus({ registrationNumber: "X", expiryDate: "2026-11-18" }, end).label, "Akan Berakhir");
    assert.equal(brandCertificateStatus({ registrationNumber: "X", expiryDate: "2032-03-14" }, end).label, "Aktif");
  });
});

describe("aggregates never mix units or currencies", () => {
  it("sums quantity per HS only within one unit", () => {
    const rows = hsRows(ds.lines);
    assert.equal(rows.find((r) => r.hs === "6109.10.00")!.quantity, 100);
    assert.equal(rows.find((r) => r.hs === "6109.10.00")!.unit, "PCS");
  });
  it("leaves quantity uncomputed when an HS is declared in two units", () => {
    const rows = hsRows([...ds.lines, line("5", "B", "5209.42.00", "KG", 5, 50, "USD", ["Turki"])]);
    assert.ok(Number.isNaN(rows.find((r) => r.hs === "5209.42.00")!.quantity));
  });
  it("values per HS stay in one currency with shares inside that currency", () => {
    const usd = valueByHs(ds.lines, "USD");
    assert.deepEqual(usd.map((r) => [r.hs, r.value]), [["5209.42.00", 1000], ["6109.10.00", 700]]);
    assert.equal(usd.find((r) => r.hs === "6109.10.00")!.price, 10);
    assert.equal(valueByHs(ds.lines, "CNY")[0].value, 3000);
  });
  it("counts product-country relations, not volume", () => {
    const rows = countryRows(ds.lines);
    assert.deepEqual(rows[0], { country: "Vietnam", companies: 2, hs: 1, brands: 1, lines: 2 });
    assert.equal(concentration(ds.lines, "negara", 5).total, 5);
  });
});

describe("filters narrow every section together", () => {
  it("a brand filter keeps only applications that import it", () => {
    const f = applyFilters(ds, { brand: "Verona" });
    assert.deepEqual(f.applications.map((a) => a.id), ["A"]);
    assert.deepEqual(f.lines.map((l) => l.id), ["1"]);
  });
  it("a location filter keeps that city's applications and their lines", () => {
    const f = applyFilters(ds, { lokasi: "Bandung" });
    assert.deepEqual(f.lines.map((l) => l.id), ["3", "4"]);
  });
});

describe("trend", () => {
  it("places planned quantity in the application's submission month, per unit", () => {
    const t = trend(ds.lines, ds.applications, ds.period, "PCS", "bulanan");
    assert.equal(t.months.length, 12);
    assert.equal(t.series[0].values[t.months.indexOf("2025-11")], 50);
    assert.equal(t.series[0].values[t.months.indexOf("2026-01")], 50);
  });
});
