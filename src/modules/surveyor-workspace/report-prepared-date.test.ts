import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  defaultReportPreparedDateMode,
  effectiveReportPreparedDate,
  resolveReportPreparedDate,
  validateReportPreparedDate,
} from "./report-prepared-date";

// 6 Oct 2026, 10:00 WIB
const NOW = new Date("2026-10-06T03:00:00Z");

describe("defaultReportPreparedDateMode", () => {
  it("is VISIT_DATE once the actual visit date exists, otherwise CUSTOM", () => {
    assert.equal(defaultReportPreparedDateMode("2026-10-01"), "VISIT_DATE");
    assert.equal(defaultReportPreparedDateMode(""), "CUSTOM");
    assert.equal(defaultReportPreparedDateMode(undefined), "CUSTOM");
  });
});

describe("validateReportPreparedDate", () => {
  it("VISIT_DATE uses the actual visit date", () => {
    const result = validateReportPreparedDate({ mode: "VISIT_DATE", date: "", actualVisitDate: "2026-10-01" }, NOW);
    assert.deepEqual(result, { ok: true, date: "2026-10-01", mode: "VISIT_DATE" });
  });

  it("VISIT_DATE without a visit date is rejected with a clear message", () => {
    const result = validateReportPreparedDate({ mode: "VISIT_DATE", date: "", actualVisitDate: "" }, NOW);
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /Tanggal Kunjungan Aktual/);
  });

  it("CUSTOM accepts a date between the visit and today, including both ends", () => {
    for (const date of ["2026-10-01", "2026-10-03", "2026-10-06"]) {
      assert.equal(validateReportPreparedDate({ mode: "CUSTOM", date, actualVisitDate: "2026-10-01" }, NOW).ok, true, date);
    }
  });

  it("CUSTOM rejects a date before the visit", () => {
    const result = validateReportPreparedDate({ mode: "CUSTOM", date: "2026-09-30", actualVisitDate: "2026-10-01" }, NOW);
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /sebelum Tanggal Kunjungan Aktual/);
  });

  it("CUSTOM rejects a date after today (Jakarta calendar day)", () => {
    const result = validateReportPreparedDate({ mode: "CUSTOM", date: "2026-10-07", actualVisitDate: "2026-10-01" }, NOW);
    assert.equal(result.ok, false);
    assert.match(!result.ok ? result.error : "", /setelah hari ini/);
    // 23:30 UTC on 6 Oct is already 7 Oct in Jakarta.
    assert.equal(validateReportPreparedDate({ mode: "CUSTOM", date: "2026-10-07", actualVisitDate: "2026-10-01" }, new Date("2026-10-06T23:30:00Z")).ok, true);
  });

  it("an empty or malformed date is rejected", () => {
    assert.equal(validateReportPreparedDate({ mode: "CUSTOM", date: "", actualVisitDate: "2026-10-01" }, NOW).ok, false);
    assert.equal(validateReportPreparedDate({ mode: "CUSTOM", date: "06/10/2026", actualVisitDate: "2026-10-01" }, NOW).ok, false);
    assert.equal(validateReportPreparedDate({ mode: "CUSTOM", date: "2026-02-31", actualVisitDate: "2026-01-01" }, NOW).ok, false);
  });

  it("without a visit date a custom date only has to be a valid date not after today", () => {
    assert.equal(validateReportPreparedDate({ mode: "CUSTOM", date: "2026-10-02", actualVisitDate: "" }, NOW).ok, true);
  });

  it("a missing mode falls back to the default for the form", () => {
    assert.equal(validateReportPreparedDate({ mode: null, date: "", actualVisitDate: "2026-10-01" }, NOW).ok, true);
    assert.equal(validateReportPreparedDate({ mode: undefined, date: "2026-10-02", actualVisitDate: "" }, NOW).ok, true);
  });

  it("a visit date in the future is rejected for VISIT_DATE (cannot be prepared after today)", () => {
    assert.equal(validateReportPreparedDate({ mode: "VISIT_DATE", date: "", actualVisitDate: "2026-10-09" }, NOW).ok, false);
  });
});

describe("effectiveReportPreparedDate", () => {
  it("shows the visit date for VISIT_DATE and the picked date for CUSTOM", () => {
    assert.equal(effectiveReportPreparedDate({ mode: "VISIT_DATE", date: "2026-10-03", actualVisitDate: "2026-10-01" }), "2026-10-01");
    assert.equal(effectiveReportPreparedDate({ mode: "CUSTOM", date: "2026-10-03", actualVisitDate: "2026-10-01" }), "2026-10-03");
  });
});

describe("resolveReportPreparedDate (what the report prints)", () => {
  const submittedAt = "2026-10-06T08:00:00.000Z";

  it("prefers the chosen date", () => {
    assert.equal(resolveReportPreparedDate({ reportPreparedDate: "2026-10-03", actualVisitDate: "2026-10-01" }, submittedAt), "2026-10-03");
  });

  it("a VISIT_DATE choice always follows the current visit date, not a stale stored value", () => {
    assert.equal(
      resolveReportPreparedDate({ reportPreparedDateMode: "VISIT_DATE", reportPreparedDate: "2026-09-01", actualVisitDate: "2026-10-01" }, submittedAt),
      "2026-10-01",
    );
  });

  it("older reports fall back to the actual visit date, then the submit time", () => {
    assert.equal(resolveReportPreparedDate({ actualVisitDate: "2026-10-01" }, submittedAt), "2026-10-01");
    assert.equal(resolveReportPreparedDate({}, submittedAt), submittedAt);
    assert.equal(resolveReportPreparedDate(null, submittedAt), submittedAt);
    assert.equal(resolveReportPreparedDate(null, null), null);
  });
});
