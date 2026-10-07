import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { qualityTestSubmissionWindow } from "./quality-test-window";

describe("qualityTestSubmissionWindow — Pasal 37: diajukan paling lama 6 (enam) bulan sejak diterbitkan", () => {
  it("meets the rule when submitted within six months", () => {
    const result = qualityTestSubmissionWindow("2026-04-10", "2026-10-05");
    assert.equal(result.withinWindow, true);
    assert.match(result.label, /^Memenuhi/);
  });

  it("meets the rule on the exact six-month day", () => {
    assert.equal(qualityTestSubmissionWindow("2026-04-05", "2026-10-05").withinWindow, true);
  });

  it("fails the rule one day after six months", () => {
    const result = qualityTestSubmissionWindow("2026-04-04", "2026-10-05");
    assert.equal(result.withinWindow, false);
    assert.match(result.label, /^Tidak Memenuhi/);
  });

  it("handles month-end issue dates without overflowing into the next month", () => {
    assert.equal(qualityTestSubmissionWindow("2026-08-31", "2027-02-28").withinWindow, true);
    assert.equal(qualityTestSubmissionWindow("2026-08-31", "2027-03-01").withinWindow, false);
  });

  it("cannot decide without both dates", () => {
    assert.equal(qualityTestSubmissionWindow("2026-04-10", "").withinWindow, null);
    assert.equal(qualityTestSubmissionWindow("", "2026-10-05").withinWindow, null);
  });

  it("accepts full ISO datetimes", () => {
    assert.equal(qualityTestSubmissionWindow("2026-04-10T00:00:00.000Z", "2026-10-05").withinWindow, true);
  });
});
