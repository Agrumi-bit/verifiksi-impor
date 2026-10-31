import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { deriveWorkspaceStatuses, type AssignmentForWorkspaceStatus } from "./workspace-status";

function assignment(overrides: Partial<AssignmentForWorkspaceStatus>): AssignmentForWorkspaceStatus {
  return { scheduleType: "dokumen", status: "IN_PROGRESS", letterStatus: "APPROVED", pmReviewStatus: null, ...overrides };
}

const allDone = [
  assignment({ scheduleType: "dokumen", status: "COMPLETED" }),
  assignment({ scheduleType: "survey", status: "SUBMITTED", pmReviewStatus: "APPROVED" }),
  assignment({ scheduleType: "technical", status: "COMPLETED" }),
];

describe("deriveWorkspaceStatuses", () => {
  it("marks nothing as started on a draft", () => {
    const result = deriveWorkspaceStatuses({ applicationStatus: "DRAFT", returnedByRole: null, assignments: [], lhviuIssued: false });
    assert.deepEqual(result, { CR: "NOT_STARTED", SV: "NOT_STARTED", VF: "NOT_STARTED", PM: "NOT_STARTED" });
  });

  it("puts a submitted application with no assignment at Customer Relation", () => {
    const result = deriveWorkspaceStatuses({ applicationStatus: "SUBMITTED", returnedByRole: null, assignments: [], lhviuIssued: false });
    assert.equal(result.CR, "IN_PROGRESS");
    assert.equal(result.VF, "NOT_STARTED");
  });

  it("completes Customer Relation only when every Surat Tugas is approved", () => {
    const pending = deriveWorkspaceStatuses({
      applicationStatus: "SUBMITTED",
      returnedByRole: null,
      assignments: [assignment({}), assignment({ scheduleType: "survey", letterStatus: "PENDING" })],
      lhviuIssued: false,
    });
    assert.equal(pending.CR, "IN_PROGRESS");
    const approved = deriveWorkspaceStatuses({ applicationStatus: "SUBMITTED", returnedByRole: null, assignments: allDone, lhviuIssued: false });
    assert.equal(approved.CR, "COMPLETED");
  });

  it("completes Customer Relation once the LHVIU is issued, even with Surat Tugas still in draft", () => {
    const result = deriveWorkspaceStatuses({
      applicationStatus: "COMPLETED",
      returnedByRole: null,
      assignments: [assignment({ letterStatus: "DRAFT", status: "COMPLETED" })],
      lhviuIssued: true,
    });
    assert.equal(result.CR, "COMPLETED");
  });

  it("flags Customer Relation when it returned the application for revision", () => {
    const result = deriveWorkspaceStatuses({
      applicationStatus: "RETURNED",
      returnedByRole: "CUSTOMER_RELATIONSHIP",
      assignments: [],
      lhviuIssued: false,
    });
    assert.equal(result.CR, "ISSUE");
  });

  it("treats a survey approved by the PM as done even though it stays SUBMITTED", () => {
    const result = deriveWorkspaceStatuses({ applicationStatus: "SUBMITTED", returnedByRole: null, assignments: allDone, lhviuIssued: false });
    assert.equal(result.SV, "COMPLETED");
    assert.equal(result.VF, "COMPLETED");
  });

  it("ignores a technical assignment — VIU Konsumsi has no Technical Analyst step", () => {
    const result = deriveWorkspaceStatuses({
      applicationStatus: "SUBMITTED",
      returnedByRole: null,
      assignments: [...allDone, assignment({ scheduleType: "technical", status: "SUBMITTED", letterStatus: "PENDING", pmReviewStatus: "REJECTED" })],
      lhviuIssued: true,
    });
    assert.deepEqual(result, { CR: "COMPLETED", SV: "COMPLETED", VF: "COMPLETED", PM: "COMPLETED" });
  });

  it("needs every survey assignment of an application (one per location) to be done", () => {
    const result = deriveWorkspaceStatuses({
      applicationStatus: "SUBMITTED",
      returnedByRole: null,
      assignments: [
        assignment({ scheduleType: "survey", status: "SUBMITTED", pmReviewStatus: "APPROVED" }),
        assignment({ scheduleType: "survey", status: "IN_PROGRESS" }),
      ],
      lhviuIssued: false,
    });
    assert.equal(result.SV, "IN_PROGRESS");
  });

  it("flags a workspace whose assignment was returned or whose report the PM rejected", () => {
    const result = deriveWorkspaceStatuses({
      applicationStatus: "SUBMITTED",
      returnedByRole: null,
      assignments: [
        assignment({ scheduleType: "dokumen", status: "RETURNED" }),
        assignment({ scheduleType: "technical", status: "SUBMITTED", pmReviewStatus: "REJECTED" }),
      ],
      lhviuIssued: false,
    });
    assert.equal(result.VF, "ISSUE");
  });

  it("starts the PM once a report is under review or every workspace is done, and completes it on LHVIU", () => {
    const idle = deriveWorkspaceStatuses({
      applicationStatus: "SUBMITTED",
      returnedByRole: null,
      assignments: [assignment({ scheduleType: "dokumen" })],
      lhviuIssued: false,
    });
    assert.equal(idle.PM, "NOT_STARTED");
    const reviewing = deriveWorkspaceStatuses({
      applicationStatus: "SUBMITTED",
      returnedByRole: null,
      assignments: [assignment({ scheduleType: "dokumen", pmReviewStatus: "PENDING" })],
      lhviuIssued: false,
    });
    assert.equal(reviewing.PM, "IN_PROGRESS");
    const waitingLhviu = deriveWorkspaceStatuses({ applicationStatus: "SUBMITTED", returnedByRole: null, assignments: allDone, lhviuIssued: false });
    assert.equal(waitingLhviu.PM, "IN_PROGRESS");
    const issued = deriveWorkspaceStatuses({ applicationStatus: "COMPLETED", returnedByRole: null, assignments: allDone, lhviuIssued: true });
    assert.equal(issued.PM, "COMPLETED");
  });
});
