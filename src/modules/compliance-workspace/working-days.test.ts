import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { workingDaysBetween } from "./working-days";

describe("workingDaysBetween", () => {
  it("counts Monday–Friday after the start day, up to and including the end day", () => {
    // Fri 13 Mar → Tue 17 Mar 2026: Mon 16, Tue 17.
    assert.equal(workingDaysBetween("2026-03-13", "2026-03-17"), 2);
    // Mon 2 Mar → Mon 9 Mar 2026: one full week.
    assert.equal(workingDaysBetween("2026-03-02", "2026-03-09"), 5);
  });

  it("never counts Saturday or Sunday", () => {
    // Fri 13 Mar → Sun 15 Mar 2026.
    assert.equal(workingDaysBetween("2026-03-13", "2026-03-15"), 0);
  });

  it("is zero on the same day and null when a day is missing or out of order", () => {
    assert.equal(workingDaysBetween("2026-03-13", "2026-03-13"), 0);
    assert.equal(workingDaysBetween(null, "2026-03-13"), null);
    assert.equal(workingDaysBetween("2026-10-02", "2026-03-17"), null);
  });
});
