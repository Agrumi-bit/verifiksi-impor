import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { casesNeedingAttention, summarizeDashboard } from "./dashboard";
import { caseRow } from "./test-fixtures";

const waiting = caseRow({ applicationId: "w", assignments: [{ scheduleType: "dokumen", status: "IN_PROGRESS", letterStatus: "APPROVED", pmReviewStatus: null }], lhviuIssued: false });
const ready = caseRow({ applicationId: "r", updatedAt: "2026-07-20T00:00:00.000Z" });
const openIssue = caseRow({
  applicationId: "o",
  updatedAt: "2026-07-10T00:00:00.000Z",
  findings: [{ id: "f1", issueNumber: "ISS-0001", kind: "OPEN", title: "x", sourceWorkspace: "VF", requirementKey: "modal" }],
});
const flagged = caseRow({ applicationId: "f", reviewFlag: true, updatedAt: "2026-07-30T00:00:00.000Z" });

describe("summarizeDashboard", () => {
  it("counts cases per bucket, where waiting cases are held, and findings per kind", () => {
    const summary = summarizeDashboard([waiting, ready, openIssue, flagged], [{ kind: "OPEN" }, { kind: "CONFLICT" }, { kind: "RESOLVED" }]);
    assert.equal(summary.totalCases, 4);
    assert.equal(summary.byCategory.MH, 1);
    assert.equal(summary.byCategory.SK, 2);
    assert.equal(summary.byCategory.OI, 1);
    assert.equal(summary.waitingAt.CR, 0);
    assert.equal(summary.waitingAt.SV, 1);
    assert.equal(summary.readyForConsolidation, 2);
    assert.deepEqual(summary.activeFindings, { OPEN: 1, KLARIFIKASI: 0, CONFLICT: 1 });
    assert.equal(summary.resolvedFindings, 1);
    assert.equal(summary.lhviuIssued, 3);
    assert.equal(summary.reviewFlagged, 1);
    // The fixtures' LHVIU (25 Jul 2026) predates the administrative checks: scored over 40 requirements.
    assert.equal(summary.averageScore, Math.round((100 + 98 + 100) / 3));
  });

  it("has no average score without handed-over cases", () => {
    assert.equal(summarizeDashboard([waiting], []).averageScore, null);
  });
});

describe("casesNeedingAttention", () => {
  it("lists open issues first, then flagged cases, newest first", () => {
    assert.deepEqual(casesNeedingAttention([waiting, ready, openIssue, flagged]).map((row) => row.applicationId), ["o", "f"]);
  });

  it("includes a case with an active finding that is still waiting for handover", () => {
    const waitingWithFinding = caseRow({
      applicationId: "wf",
      assignments: [{ scheduleType: "dokumen", status: "IN_PROGRESS", letterStatus: "APPROVED", pmReviewStatus: null }],
      findings: [{ id: "f2", issueNumber: "ISS-0002", kind: "KLARIFIKASI", title: "y", sourceWorkspace: "VF", requirementKey: "npwp" }],
    });
    assert.deepEqual(casesNeedingAttention([flagged, waitingWithFinding]).map((row) => row.applicationId), ["wf", "f"]);
  });
});
