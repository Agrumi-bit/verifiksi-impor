import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { bab1, chapterDivider, CHAPTERS, executiveSummary, kbliCompliance, lhviuByMonth, lhviuValidity } from "./report-model";
import type { P47Application, P47Dataset, P47Report } from "./types";

const app = (id: string, company: string, kbli: string[], issuedAt: string | null, number: string | null = null): P47Application => ({
  id, applicationNumber: `APP-${id}`, companyId: `C-${id}`, company, nib: "1", kbli: kbli.map((code) => ({ code, description: `KBLI ${code}` })),
  submittedAt: "2026-02-01", status: "COMPLETED", lhviu: { fileName: "x.pdf", uploadedAt: "2026-10-09T00:00:00Z", path: "documents/x.pdf", number, issuedAt }, kantor: null, gudang: [],
});
const ds: P47Dataset = {
  period: { from: "2025-10-01", to: "2026-09-30" }, generatedAt: "2026-10-10T03:00:00Z",
  applications: [app("A", "PT A", ["46412", "46900"], "2026-03-07", "1/LHVIU/TBI/III/2026"), app("B", "PT B", ["46412"], "2026-03-20"), app("C", "PT C", ["45101"], "2026-08-01"), app("D", "PT D", ["46411"], null)],
  lines: [], brands: [], technical: [], warehouses: [], values: [], findings: [],
};
const report: P47Report = { status: "DRAFT", pmNote: "", materiality: {}, updatedAt: null, updatedByName: null };

describe("LHVIU per bulan terbit and validity", () => {
  it("counts LHVIU in the month of their recorded Tanggal Terbit; undated ones are set apart", () => {
    const { months, undated } = lhviuByMonth(ds);
    assert.equal(months.length, 12);
    assert.deepEqual(months.find((m) => m.key === "2026-03")?.companies, ["PT A", "PT B"]);
    assert.deepEqual(undated.map((a) => a.company), ["PT D"]);
  });
  it("is valid one year from issuance (Pasal 39 ayat (6))", () => {
    assert.deepEqual(lhviuValidity("2026-03-07", "2026-10-10"), { until: "2027-03-07", monthsLeft: 4, status: "Berlaku" });
    assert.equal(lhviuValidity("2025-11-01", "2026-10-10").status, "Berlaku – segera berakhir");
    assert.equal(lhviuValidity("2025-01-01", "2026-10-10").status, "Tidak berlaku");
  });
});

describe("KBLI against Pasal 37", () => {
  it("counts companies holding at least one required KBLI", () => {
    const k = kbliCompliance(ds);
    assert.equal(k.compliant.length, 3);
    assert.equal(k.pairs, 5);
    assert.equal(k.requiredPairs, 3);
    assert.equal(k.required[0].code, "46412");
    assert.equal(k.required[0].companies.length, 2);
  });
});

describe("report layout", () => {
  it("has ten chapters, each with a divider", () => {
    assert.equal(CHAPTERS.length, 10);
    for (const c of CHAPTERS) assert.ok(chapterDivider(c.no, ds, report).lead, c.no);
  });
  it("builds Bab 1 with one company row per application, every row the width of Tabel 1.2", () => {
    const b = bab1(ds);
    assert.equal(b.companyRows.length, 4);
    for (const row of b.companyRows) assert.equal(row.length, 10);
    assert.equal(b.companyRows[0][1], "1/LHVIU/TBI/III/2026");
    assert.ok(b.highlights.length > 0);
  });
  it("states the LHVIU still missing a number or date as a recommendation", () => {
    assert.ok(executiveSummary(ds, report).recs.some((r) => r.includes("nomor dan tanggal terbit")));
  });
});
