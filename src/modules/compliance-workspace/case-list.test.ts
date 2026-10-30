import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCaseRow, chipCounts, queryCases, type CaseSource } from "./case-list";

const DONE_ASSIGNMENTS = [
  { scheduleType: "dokumen", status: "COMPLETED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
  { scheduleType: "survey", status: "SUBMITTED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
  { scheduleType: "technical", status: "COMPLETED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
];

function source(overrides: Partial<CaseSource>): CaseSource {
  return {
    applicationId: "a1",
    applicationNumber: "APP-VIU-0001",
    companyName: "PT Maju Tekstil Indonesia",
    nib: "8123456789012",
    submittedAt: "2026-07-25T00:00:00.000Z",
    submittedIsSystemDate: false,
    updatedAt: "2026-07-25T09:40:00.000Z",
    applicationStatus: "SUBMITTED",
    returnedByRole: null,
    assignments: DONE_ASSIGNMENTS,
    lhviuIssued: false,
    lhviuNumber: null,
    lhviuIssuedAt: null,
    complianceStatus: "BELUM_DIREVIEW",
    picUserId: null,
    picName: null,
    reviewFlag: false,
    finalReviewDone: false,
    dossierComplete: false,
    findings: [],
    ...overrides,
  };
}

const rows = [
  buildCaseRow(source({ applicationId: "a1", applicationNumber: "APP-VIU-0001", lhviuIssued: true, lhviuNumber: "3/LHVIU/TBI/III/2026", complianceStatus: "COMPLIANCE_LENGKAP", picUserId: "u1", updatedAt: "2026-07-25T09:00:00.000Z" })),
  buildCaseRow(source({ applicationId: "a2", applicationNumber: "APP-VIU-0002", companyName: "PT Sandang Nusantara", assignments: [DONE_ASSIGNMENTS[0]], submittedAt: "2026-07-10T00:00:00.000Z", updatedAt: "2026-07-26T09:00:00.000Z" })),
  buildCaseRow(
    source({
      applicationId: "a3",
      applicationNumber: "APP-VIU-0003",
      nib: "9120006677889",
      lhviuIssued: true,
      reviewFlag: true,
      picUserId: "u2",
      findings: [{ id: "f1", issueNumber: "ISS-0001", kind: "CONFLICT", title: "Alamat gudang berbeda", sourceWorkspace: "SV" }],
      updatedAt: "2026-07-24T09:00:00.000Z",
    }),
  ),
];

describe("buildCaseRow", () => {
  it("derives handover, readiness, category and summary from real statuses", () => {
    const [lengkap, waiting, conflict] = rows;
    assert.equal(lengkap.category, "CL");
    assert.equal(lengkap.handover, "SIAP_KONSOLIDASI");
    assert.equal(lengkap.readiness, "ready");
    assert.equal(waiting.category, "MH");
    assert.equal(waiting.readiness, "waiting_handover");
    assert.equal(waiting.lastWorkspace, "SV");
    assert.equal(conflict.category, "PTL");
    assert.equal(conflict.hasConflict, true);
    assert.equal(conflict.summary.activeFindings, 1);
  });
});

describe("queryCases", () => {
  it("searches number, company and NIB", () => {
    assert.deepEqual(queryCases(rows, { q: "sandang" }).rows.map((row) => row.applicationId), ["a2"]);
    assert.deepEqual(queryCases(rows, { q: "912000" }).rows.map((row) => row.applicationId), ["a3"]);
    assert.deepEqual(queryCases(rows, { q: "app-viu-0001" }).rows.map((row) => row.applicationId), ["a1"]);
  });

  it("filters by category, LHVIU, review flag, PIC and conflict", () => {
    assert.deepEqual(queryCases(rows, { chip: "MH" }).rows.map((row) => row.applicationId), ["a2"]);
    assert.equal(queryCases(rows, { chip: "LH" }).total, 2);
    assert.deepEqual(queryCases(rows, { chip: "REVIEW" }).rows.map((row) => row.applicationId), ["a3"]);
    assert.deepEqual(queryCases(rows, { picUserId: "u1" }).rows.map((row) => row.applicationId), ["a1"]);
    assert.deepEqual(queryCases(rows, { hasConflict: "ya" }).rows.map((row) => row.applicationId), ["a3"]);
    assert.equal(queryCases(rows, { lhviu: "Belum Terbit" }).total, 1);
  });

  it("filters by workspace state and tanggal masuk (inclusive, Jakarta day)", () => {
    assert.deepEqual(queryCases(rows, { workspaceState: { SV: "NOT_STARTED" } }).rows.map((row) => row.applicationId), ["a2"]);
    assert.deepEqual(queryCases(rows, { submittedFrom: "2026-07-01", submittedTo: "2026-07-10" }).rows.map((row) => row.applicationId), ["a2"]);
  });

  it("sorts by last update (newest first by default) and by number", () => {
    assert.deepEqual(queryCases(rows, {}).rows.map((row) => row.applicationId), ["a2", "a1", "a3"]);
    assert.deepEqual(queryCases(rows, { sort: "number", dir: "asc" }).rows.map((row) => row.applicationId), ["a1", "a2", "a3"]);
  });

  it("paginates and clamps the page", () => {
    const page = queryCases(rows, { pageSize: 2, page: 9 });
    assert.equal(page.page, 2);
    assert.equal(page.pageCount, 2);
    assert.equal(page.rows.length, 1);
  });
});

describe("chipCounts", () => {
  it("counts every case per bucket", () => {
    const counts = chipCounts(rows);
    assert.equal(counts.ALL, 3);
    assert.equal(counts.CL, 1);
    assert.equal(counts.MH, 1);
    assert.equal(counts.PTL, 1);
    assert.equal(counts.LH, 2);
    assert.equal(counts.REVIEW, 1);
  });
});
