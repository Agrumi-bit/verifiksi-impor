import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { companyChapterNarrative, kbliRows, locationRows } from "./company-chapter";
import type { P47Application, P47Dataset } from "./types";

const place = (city: string, province: string, ownership: string) => ({ address: "Jl. Contoh 1", city, province, ownership });
const app = (id: string, company: string, over: Partial<P47Application> = {}): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: id, company, nib: id, kbli: [{ code: "46411", description: "Perdagangan Besar Tekstil" }],
  submittedAt: "2026-09-02", status: "SUBMITTED", lhviu: null, kantor: place("Bandung", "Jawa Barat", "Milik Sendiri"), gudang: [place("Bandung", "Jawa Barat", "Sewa")], ...over,
});
const dataset = (applications: P47Application[]): P47Dataset => ({
  period: { from: "2026-01-01", to: "2026-12-31" }, generatedAt: "2026-10-09T00:00:00Z", applications, lines: [], brands: [], technical: [], warehouses: [], values: [], findings: [],
});

describe("company chapter", () => {
  it("says so when the period has no company", () => {
    const text = companyChapterNarrative(dataset([])).join(" ");
    assert.match(text, /belum terdapat Perusahaan API-U/);
  });

  it("counts companies, KBLI, locations and ownership from the data", () => {
    const apps = [app("1", "PT Satu"), app("2", "PT Dua", { gudang: [], kantor: place("Surabaya", "Jawa Timur", "Sewa") })];
    const text = companyChapterNarrative(dataset(apps)).join("\n");
    assert.match(text, /2 \(dua\) Perusahaan API-U/);
    assert.match(text, /46411 \(perdagangan besar tekstil\) pada 2 perusahaan/);
    assert.match(text, /1 berstatus milik sendiri, 1 berstatus sewa/);
    assert.match(text, /lokasi kantor atau gudang belum lengkap pada 1 permohonan \(PT Dua\)/);
  });

  it("groups KBLI and locations per code and per city", () => {
    const apps = [app("1", "PT Satu"), app("2", "PT Dua")];
    assert.deepEqual(kbliRows(apps).map((r) => [r.code, r.companies.length, r.allowed]), [["46411", 2, true]]);
    assert.deepEqual(locationRows(apps).map((r) => [r.city, r.kantor, r.gudang]), [["Bandung", 2, 2]]);
  });
});
