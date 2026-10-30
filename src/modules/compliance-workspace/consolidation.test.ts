import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TOTAL_REQUIREMENTS,
  allWorkspaceCompleted,
  complianceSummary,
  handoverStatus,
  readiness,
  validateResolutionNote,
} from "./consolidation";
import type { WorkspaceStatuses } from "./workspace-status";

const COMPLETE: WorkspaceStatuses = { CR: "COMPLETED", SV: "COMPLETED", VF: "COMPLETED", TA: "COMPLETED", PM: "COMPLETED" };
const AT_TA: WorkspaceStatuses = { CR: "COMPLETED", SV: "COMPLETED", VF: "COMPLETED", TA: "IN_PROGRESS", PM: "NOT_STARTED" };
const VF_ISSUE: WorkspaceStatuses = { CR: "COMPLETED", SV: "COMPLETED", VF: "ISSUE", TA: "NOT_STARTED", PM: "NOT_STARTED" };
const NO_ADMIN = { finalReviewDone: false, dossierComplete: false };

describe("handover", () => {
  it("counts 42 requirements: 40 from the workspaces + 2 administrative", () => {
    assert.equal(TOTAL_REQUIREMENTS, 42);
  });

  it("is ready for consolidation only when all five workspaces are completed", () => {
    assert.equal(allWorkspaceCompleted(COMPLETE), true);
    assert.equal(allWorkspaceCompleted(AT_TA), false);
    assert.equal(handoverStatus(COMPLETE, "BELUM_DIREVIEW"), "SIAP_KONSOLIDASI");
  });

  it("waits for handover, or reports a partial one when a workspace has an issue", () => {
    assert.equal(handoverStatus(AT_TA, "BELUM_DIREVIEW"), "MENUNGGU_HANDOVER");
    assert.equal(handoverStatus(VF_ISSUE, "BELUM_DIREVIEW"), "HANDOVER_SEBAGIAN");
  });

  it("is complete once the case is finished", () => {
    assert.equal(handoverStatus(COMPLETE, "SELESAI"), "HANDOVER_LENGKAP");
    // Not before every workspace has handed over, whatever the compliance status says.
    assert.equal(handoverStatus(AT_TA, "SELESAI"), "MENUNGGU_HANDOVER");
  });
});

describe("readiness", () => {
  it("waits for handover while a workspace is unfinished", () => {
    assert.equal(readiness(AT_TA, []), "waiting_handover");
  });

  it("needs follow-up while any finding is open, awaiting clarification or in conflict", () => {
    assert.equal(readiness(COMPLETE, [{ kind: "OPEN" }]), "needs_follow_up");
    assert.equal(readiness(COMPLETE, [{ kind: "KLARIFIKASI" }]), "needs_follow_up");
    assert.equal(readiness(COMPLETE, [{ kind: "CONFLICT" }, { kind: "RESOLVED" }]), "needs_follow_up");
  });

  it("is ready when everything is handed over and every finding is resolved", () => {
    assert.equal(readiness(COMPLETE, [{ kind: "RESOLVED" }]), "ready");
    assert.equal(readiness(COMPLETE, []), "ready");
  });
});

describe("complianceSummary", () => {
  it("counts only handed-over workspaces as available", () => {
    const summary = complianceSummary(AT_TA, [], NO_ADMIN);
    assert.equal(summary.available, 6 + 6 + 20);
    assert.equal(summary.pending, 6 + 2);
    assert.equal(summary.score, Math.round((32 / 42) * 100));
  });

  it("counts a workspace with an issue as handed over", () => {
    assert.equal(complianceSummary(VF_ISSUE, [], NO_ADMIN).available, 6 + 6 + 20);
  });

  it("subtracts active findings and adds the administrative checks", () => {
    const summary = complianceSummary(COMPLETE, [{ kind: "OPEN" }, { kind: "RESOLVED" }], { finalReviewDone: true, dossierComplete: false });
    assert.equal(summary.available, 40);
    assert.equal(summary.activeFindings, 1);
    assert.equal(summary.sesuai, 39);
    assert.equal(summary.administrative, 1);
    assert.equal(summary.score, Math.round((40 / 42) * 100));
  });

  it("reaches 100 with everything handed over, no active finding and both administrative checks", () => {
    const summary = complianceSummary(COMPLETE, [], { finalReviewDone: true, dossierComplete: true });
    assert.equal(summary.score, 100);
  });

  it("never goes below zero", () => {
    const findings = Array.from({ length: 50 }, () => ({ kind: "OPEN" as const }));
    assert.equal(complianceSummary(COMPLETE, findings, NO_ADMIN).sesuai, 0);
  });
});

describe("validateResolutionNote", () => {
  it("requires at least 10 characters, ignoring surrounding spaces", () => {
    assert.match(validateResolutionNote("") ?? "", /minimal 10 karakter/);
    assert.match(validateResolutionNote("   singkat   ") ?? "", /minimal 10 karakter/);
    assert.equal(validateResolutionNote("Dokumen pengganti sudah diterima."), null);
  });
});
