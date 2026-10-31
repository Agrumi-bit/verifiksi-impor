import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TOTAL_REQUIREMENTS,
  allWorkspaceCompleted,
  caseCategory,
  completedWorkspaceCount,
  complianceSummary,
  handoverStatus,
  lastWorkspace,
  readiness,
  validateResolutionNote,
} from "./consolidation";
import type { WorkspaceStatuses } from "./workspace-status";

const COMPLETE: WorkspaceStatuses = { CR: "COMPLETED", SV: "COMPLETED", VF: "COMPLETED", PM: "COMPLETED" };
const AT_PM: WorkspaceStatuses = { CR: "COMPLETED", SV: "COMPLETED", VF: "COMPLETED", PM: "IN_PROGRESS" };
const VF_ISSUE: WorkspaceStatuses = { CR: "COMPLETED", SV: "COMPLETED", VF: "ISSUE", PM: "NOT_STARTED" };
const NO_ADMIN = { finalReviewDone: false, dossierComplete: false };

describe("handover", () => {
  it("counts 42 requirements: 40 from the workspaces + 2 administrative", () => {
    assert.equal(TOTAL_REQUIREMENTS, 42);
  });

  it("is ready for consolidation only when all four workspaces are completed", () => {
    assert.equal(allWorkspaceCompleted(COMPLETE), true);
    assert.equal(allWorkspaceCompleted(AT_PM), false);
    assert.equal(handoverStatus(COMPLETE, "BELUM_DIREVIEW"), "SIAP_KONSOLIDASI");
  });

  it("waits for handover, or reports a partial one when a workspace has an issue", () => {
    assert.equal(handoverStatus(AT_PM, "BELUM_DIREVIEW"), "MENUNGGU_HANDOVER");
    assert.equal(handoverStatus(VF_ISSUE, "BELUM_DIREVIEW"), "HANDOVER_SEBAGIAN");
  });

  it("is complete once the case is finished", () => {
    assert.equal(handoverStatus(COMPLETE, "SELESAI"), "HANDOVER_LENGKAP");
    // Not before every workspace has handed over, whatever the compliance status says.
    assert.equal(handoverStatus(AT_PM, "SELESAI"), "MENUNGGU_HANDOVER");
  });
});

describe("readiness", () => {
  it("waits for handover while a workspace is unfinished", () => {
    assert.equal(readiness(AT_PM, []), "waiting_handover");
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
    const summary = complianceSummary(AT_PM, [], NO_ADMIN);
    assert.equal(summary.available, 6 + 6 + 26);
    assert.equal(summary.pending, 2);
    assert.equal(summary.score, Math.round((38 / 42) * 100));
  });

  it("counts a workspace with an issue as handed over", () => {
    assert.equal(complianceSummary(VF_ISSUE, [], NO_ADMIN).available, 6 + 6 + 26);
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

  it("leaves the administrative checks out for an LHVIU issued before they started (5 Oct 2026)", () => {
    const legacy = complianceSummary(COMPLETE, [], { finalReviewDone: false, dossierComplete: false, lhviuIssuedAt: "2026-10-04" });
    assert.equal(legacy.total, 40);
    assert.equal(legacy.administrativeTotal, 0);
    assert.equal(legacy.score, 100);
    const current = complianceSummary(COMPLETE, [], { finalReviewDone: false, dossierComplete: false, lhviuIssuedAt: "2026-10-05" });
    assert.equal(current.total, 42);
    assert.equal(current.administrativeTotal, 2);
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

describe("caseCategory", () => {
  it("keeps every unfinished handover in Menunggu Handover, whatever else is recorded", () => {
    assert.equal(caseCategory(AT_PM, "SELESAI", [{ kind: "OPEN" }]), "MH");
  });

  it("puts a handed-over case with nothing recorded in Siap Konsolidasi", () => {
    assert.equal(caseCategory(COMPLETE, "BELUM_DIREVIEW", []), "SK");
    assert.equal(caseCategory(COMPLETE, "DALAM_KONSOLIDASI", [{ kind: "RESOLVED" }]), "SK");
  });

  it("ranks an open finding above clarification and conflict", () => {
    assert.equal(caseCategory(COMPLETE, "BELUM_DIREVIEW", [{ kind: "KLARIFIKASI" }, { kind: "OPEN" }]), "OI");
    assert.equal(caseCategory(COMPLETE, "BELUM_DIREVIEW", [{ kind: "CONFLICT" }]), "PTL");
    assert.equal(caseCategory(COMPLETE, "PERLU_KLARIFIKASI", []), "PTL");
  });

  it("follows Compliance's own Lengkap / Selesai decisions", () => {
    assert.equal(caseCategory(COMPLETE, "COMPLIANCE_LENGKAP", []), "CL");
    assert.equal(caseCategory(COMPLETE, "SELESAI", [{ kind: "OPEN" }]), "SL");
  });
});

describe("lastWorkspace / completedWorkspaceCount", () => {
  it("points at the workspace currently working on the case", () => {
    assert.equal(lastWorkspace(AT_PM), "PM");
    assert.equal(lastWorkspace(VF_ISSUE), "VF");
    assert.equal(lastWorkspace({ CR: "COMPLETED", SV: "NOT_STARTED", VF: "NOT_STARTED", PM: "NOT_STARTED" }), "SV");
    assert.equal(lastWorkspace(COMPLETE), "PM");
    assert.equal(completedWorkspaceCount(AT_PM), 3);
  });
});
