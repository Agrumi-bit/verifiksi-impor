import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCaseSteps, stepStatus } from "./case-detail";
import { detailInput } from "./test-fixtures";
import type { WorkspaceStatuses } from "./workspace-status";

const COMPLETE: WorkspaceStatuses = { CR: "COMPLETED", SV: "COMPLETED", VF: "COMPLETED", TA: "COMPLETED", PM: "COMPLETED" };

describe("stepStatus", () => {
  it("waits for the source workspace before judging anything", () => {
    assert.equal(stepStatus("VF", { ...COMPLETE, VF: "IN_PROGRESS" }, [{ kind: "CONFLICT" }]), "Menunggu Handover");
  });

  it("shows the worst active finding, ignoring resolved ones", () => {
    assert.equal(stepStatus("VF", COMPLETE, [{ kind: "KLARIFIKASI" }, { kind: "CONFLICT" }]), "Conflict");
    assert.equal(stepStatus("VF", COMPLETE, [{ kind: "RESOLVED" }]), "Sesuai");
    assert.equal(stepStatus("PM", COMPLETE, []), "Completed");
  });
});

describe("buildCaseSteps", () => {
  it("returns the 11 stages with their source workspace", () => {
    const steps = buildCaseSteps(detailInput());
    assert.equal(steps.length, 11);
    assert.deepEqual(steps.map((step) => step.source), ["CR", "VF", "SV", "VF", "TA", "VF", "VF", "VF", "VF", "PM", "PM"]);
  });

  it("puts a finding on the stage of its requirement only", () => {
    const steps = buildCaseSteps(
      detailInput({ findings: [{ id: "f1", issueNumber: "ISS-0001", kind: "OPEN", title: "Nominal tidak terbaca", requirementKey: "modal", sourceWorkspace: "VF" }] }),
    );
    assert.equal(steps[8].status, "Open Issue");
    assert.equal(steps[8].findings.length, 1);
    assert.equal(steps[7].status, "Sesuai");
  });

  it("summarises the import plan as supporting data and counts merek × komoditas combinations", () => {
    const plan = buildCaseSteps(detailInput())[4];
    assert.deepEqual(Object.fromEntries(plan.keyData).Kombinasi, "2 kombinasi merek × komoditas");
    assert.match(Object.fromEntries(plan.keyData)["Nilai rencana impor"], /USD 70/);
    assert.match(plan.note ?? "", /Data Pendukung/);
  });

  it("reports quality-test coverage per combination without judging certificate age", () => {
    const quality = Object.fromEntries(buildCaseSteps(detailInput())[6].keyData);
    assert.equal(quality.Coverage, "1 dari 2 kombinasi merek × komoditas");
    assert.match(quality["Acuan usia sertifikat"], /25 Jul 2026/);
  });

  it("lists only the evidence that exists", () => {
    const steps = buildCaseSteps(detailInput());
    assert.equal(steps[7].evidence.length, 1); // label statement, no documentation
    assert.equal(steps[10].evidence[0].path, "lhviu/x.pdf");
  });

  it("counts stock 0 as a valid value", () => {
    const stock = Object.fromEntries(buildCaseSteps(detailInput())[5].keyData);
    assert.equal(stock["Stok 0"], "1 produk");
  });
});
