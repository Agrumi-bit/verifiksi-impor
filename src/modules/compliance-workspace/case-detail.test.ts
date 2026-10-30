import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildCaseSteps, stepStatus, type CaseDetailInput } from "./case-detail";
import { buildCaseRow, type CaseSource } from "./case-list";
import type { WorkspaceStatuses } from "./workspace-status";

const DONE_ASSIGNMENTS = [
  { scheduleType: "dokumen", status: "COMPLETED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
  { scheduleType: "survey", status: "SUBMITTED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
  { scheduleType: "technical", status: "COMPLETED", letterStatus: "APPROVED", pmReviewStatus: "APPROVED" },
];

function row(overrides: Partial<CaseSource> = {}) {
  return buildCaseRow({
    applicationId: "a1",
    applicationNumber: "APP-VIU-0001",
    companyName: "PT Maju Tekstil Indonesia",
    nib: "8123456789012",
    submittedAt: "2026-07-25T00:00:00.000Z",
    submittedIsSystemDate: false,
    updatedAt: "2026-07-25T09:40:00.000Z",
    applicationStatus: "COMPLETED",
    returnedByRole: null,
    assignments: DONE_ASSIGNMENTS,
    lhviuIssued: true,
    lhviuNumber: "3/LHVIU/TBI/III/2026",
    lhviuIssuedAt: "2026-07-25",
    complianceStatus: "BELUM_DIREVIEW",
    picUserId: null,
    picName: null,
    reviewFlag: false,
    finalReviewDone: false,
    dossierComplete: false,
    findings: [],
    ...overrides,
  });
}

function input(overrides: Partial<CaseDetailInput> = {}): CaseDetailInput {
  return {
    row: row(),
    applicationCategory: "NEW",
    contact: { name: "Budi", email: "budi@majutekstil.co.id" },
    legal: { npwp: "12.345.678.9-012.000", nib: "8123456789012", kbli: [{ code: "46412", description: "Perdagangan Besar Pakaian" }], notarialDeedNumber: "12", documents: [{ label: "NIB", path: "documents/nib.pdf" }] },
    locations: [{ type: "Kantor", address: "Jl. Industri No. 10", buildingStatus: "Milik Sendiri", surveyStatus: "Selesai", documents: [] }],
    surveyorNames: ["Rizky"],
    brands: [{ name: "ABC", role: "Perwakilan Resmi", documents: [] }],
    products: [
      { brandId: "b1", commodityGroupId: "g1", hsCode: "6109.10", quantity: 10, averageUnitPrice: 5, currency: "USD", stockQuantity: 0 },
      { brandId: "b1", commodityGroupId: "g2", hsCode: "6204.42", quantity: 2, averageUnitPrice: 10, currency: "USD", stockQuantity: 4 },
    ],
    certificates: [
      { brandId: "b1", commodityGroupId: "g1", brandName: "ABC", commodityName: "Kaos", certificateNumber: "C-1", laboratoryName: "Lab", issueDate: "2026-05-01", file: { label: "C-1", path: "certificates/c1.pdf" } },
    ],
    label: { statement: { label: "SP Label", path: "documents/label.pdf" }, documentation: null },
    workingCapital: { amount: "Rp 5.000.000.000", statement: { label: "SP Modal Kerja", path: "documents/modal.pdf" }, supporting: [] },
    pmReviews: [{ report: "Laporan Survey", status: "Disetujui", by: "Hendra", at: null }],
    lhviu: { number: "3/LHVIU/TBI/III/2026", issuedAt: "2026-07-25", validUntil: "2027-07-25", file: { label: "LHVIU", path: "lhviu/x.pdf" } },
    findings: [],
    ...overrides,
  };
}

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
    const steps = buildCaseSteps(input());
    assert.equal(steps.length, 11);
    assert.deepEqual(steps.map((step) => step.source), ["CR", "VF", "SV", "VF", "TA", "VF", "VF", "VF", "VF", "PM", "PM"]);
  });

  it("puts a finding on the stage of its requirement only", () => {
    const steps = buildCaseSteps(
      input({ findings: [{ id: "f1", issueNumber: "ISS-0001", kind: "OPEN", title: "Nominal tidak terbaca", requirementKey: "modal", sourceWorkspace: "VF" }] }),
    );
    assert.equal(steps[8].status, "Open Issue");
    assert.equal(steps[8].findings.length, 1);
    assert.equal(steps[7].status, "Sesuai");
  });

  it("summarises the import plan as supporting data and counts merek × komoditas combinations", () => {
    const plan = buildCaseSteps(input())[4];
    assert.deepEqual(Object.fromEntries(plan.keyData).Kombinasi, "2 kombinasi merek × komoditas");
    assert.match(Object.fromEntries(plan.keyData)["Nilai rencana impor"], /USD 70/);
    assert.match(plan.note ?? "", /Data Pendukung/);
  });

  it("reports quality-test coverage per combination without judging certificate age", () => {
    const quality = Object.fromEntries(buildCaseSteps(input())[6].keyData);
    assert.equal(quality.Coverage, "1 dari 2 kombinasi merek × komoditas");
    assert.match(quality["Acuan usia sertifikat"], /25 Jul 2026/);
  });

  it("lists only the evidence that exists", () => {
    const steps = buildCaseSteps(input());
    assert.equal(steps[7].evidence.length, 1); // label statement, no documentation
    assert.equal(steps[10].evidence[0].path, "lhviu/x.pdf");
  });

  it("counts stock 0 as a valid value", () => {
    const stock = Object.fromEntries(buildCaseSteps(input())[5].keyData);
    assert.equal(stock["Stok 0"], "1 produk");
  });
});
