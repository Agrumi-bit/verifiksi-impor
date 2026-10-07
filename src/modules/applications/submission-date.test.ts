import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  compareBySubmissionDate,
  effectiveSubmissionDate,
  formatSubmissionDate,
  submissionDateToDb,
  validateSubmissionDate,
} from "./submission-date";

// 6 Oct 2026, 10:00 WIB
const NOW = new Date("2026-10-06T03:00:00Z");

describe("validateSubmissionDate", () => {
  it("is required", () => {
    assert.match(validateSubmissionDate("", NOW) ?? "", /wajib diisi/);
    assert.match(validateSubmissionDate(undefined, NOW) ?? "", /wajib diisi/);
    assert.match(validateSubmissionDate("   ", NOW) ?? "", /wajib diisi/);
  });

  it("accepts past dates and today (backdating is the point)", () => {
    assert.equal(validateSubmissionDate("2024-01-15", NOW), null);
    assert.equal(validateSubmissionDate("2026-10-06", NOW), null);
  });

  it("rejects a date after today (Jakarta calendar day)", () => {
    assert.match(validateSubmissionDate("2026-10-07", NOW) ?? "", /setelah hari ini/);
    // 23:30 UTC on 6 Oct is already 7 Oct in Jakarta
    assert.equal(validateSubmissionDate("2026-10-07", new Date("2026-10-06T23:30:00Z")), null);
  });

  it("rejects malformed and impossible dates", () => {
    assert.match(validateSubmissionDate("06/10/2026", NOW) ?? "", /tidak valid/);
    assert.match(validateSubmissionDate("2026-02-30", NOW) ?? "", /tidak valid/);
  });
});

describe("submissionDateToDb", () => {
  it("stores the picked day as UTC midnight", () => {
    assert.equal(submissionDateToDb("2026-08-20")?.toISOString(), "2026-08-20T00:00:00.000Z");
  });

  it("returns null for empty or invalid input", () => {
    assert.equal(submissionDateToDb(""), null);
    assert.equal(submissionDateToDb("nope"), null);
    assert.equal(submissionDateToDb(null), null);
  });
});

describe("effectiveSubmissionDate / formatSubmissionDate", () => {
  const created = new Date("2026-10-06T08:30:00Z");

  it("uses the chosen date when present", () => {
    const result = effectiveSubmissionDate({ submissionDate: new Date("2026-08-20T00:00:00Z"), createdAt: created });
    assert.deepEqual(result, { value: "2026-08-20T00:00:00.000Z", isFallback: false });
  });

  it("falls back to createdAt for older applications, flagged", () => {
    const result = effectiveSubmissionDate({ submissionDate: null, createdAt: created });
    assert.deepEqual(result, { value: created.toISOString(), isFallback: true });
  });

  it("formats in Jakarta without shifting the chosen day, and notes the fallback only when asked", () => {
    assert.equal(formatSubmissionDate({ submissionDate: new Date("2026-08-20T00:00:00Z"), createdAt: created }, true), "20 Agu 2026");
    assert.equal(formatSubmissionDate({ createdAt: created }, false), "6 Okt 2026");
    assert.equal(formatSubmissionDate({ createdAt: created }, true), "6 Okt 2026 (tanggal input sistem)");
  });
});

describe("compareBySubmissionDate", () => {
  it("orders by the chosen date, falling back to createdAt", () => {
    const backdated = { id: "a", submissionDate: new Date("2026-01-10T00:00:00Z"), createdAt: new Date("2026-10-06T00:00:00Z") };
    const legacy = { id: "b", submissionDate: null, createdAt: new Date("2026-05-01T00:00:00Z") };
    const recent = { id: "c", submissionDate: new Date("2026-09-01T00:00:00Z"), createdAt: new Date("2026-09-02T00:00:00Z") };
    const oldestFirst = [recent, backdated, legacy].sort(compareBySubmissionDate).map((x) => x.id);
    assert.deepEqual(oldestFirst, ["a", "b", "c"]);
  });
});
