import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMatrix, matrixSummary } from "./matrix";
import { caseRow, detailInput } from "./test-fixtures";

const ASSIGNEES = { VF: ["Vera"], SV: ["Rizky"], TA: ["Tomi"], PM: ["Hendra"] };

describe("buildMatrix", () => {
  it("lists the 12 requirements with their source workspace and regulation label", () => {
    const rows = buildMatrix(detailInput(), ASSIGNEES);
    assert.equal(rows.length, 12);
    assert.deepEqual(rows.map((row) => row.key), ["npwp", "nib", "kbli", "kantor", "gudang", "merek", "hs", "stok", "uji", "label", "modal", "approval"]);
    assert.equal(rows.find((row) => row.key === "label")?.regulation, "Lampiran II huruf H");
  });

  it("repeats the recorded results and links the evidence", () => {
    const rows = Object.fromEntries(buildMatrix(detailInput(), ASSIGNEES).map((row) => [row.key, row]));
    assert.equal(rows.npwp.result, "12.345.678.9-012.000");
    assert.equal(rows.uji.result, "1 sertifikat · 1 dari 2 kombinasi merek × komoditas");
    assert.equal(rows.modal.result, "Nominal tercantum: Rp 5.000.000.000");
    assert.equal(rows.nib.evidence[0].path, "documents/nib.pdf");
    assert.equal(rows.uji.verifiedBy, "Vera");
    assert.equal(rows.approval.status, "Completed");
  });

  it("waits for handover and hides results of a workspace that hasn't finished", () => {
    const input = detailInput({ row: caseRow({ assignments: [{ scheduleType: "dokumen", status: "IN_PROGRESS", letterStatus: "APPROVED", pmReviewStatus: null }] }) });
    const npwp = buildMatrix(input, ASSIGNEES).find((row) => row.key === "npwp")!;
    assert.equal(npwp.status, "Menunggu Handover");
    assert.equal(npwp.result, "—");
    assert.equal(npwp.verifiedBy, "—");
  });

  it("shows the most serious finding of a requirement", () => {
    const input = detailInput({
      findings: [
        { id: "f1", issueNumber: "ISS-0001", kind: "KLARIFIKASI", title: "a", requirementKey: "gudang", sourceWorkspace: "SV" },
        { id: "f2", issueNumber: "ISS-0002", kind: "CONFLICT", title: "b", requirementKey: "gudang", sourceWorkspace: "SV" },
      ],
    });
    const gudang = buildMatrix(input, ASSIGNEES).find((row) => row.key === "gudang")!;
    assert.equal(gudang.status, "Conflict");
    assert.equal(gudang.finding?.issueNumber, "ISS-0002");
  });
});

describe("matrixSummary", () => {
  it("counts per status, Completed as Sesuai", () => {
    const input = detailInput({ findings: [{ id: "f1", issueNumber: "ISS-0001", kind: "OPEN", title: "a", requirementKey: "modal", sourceWorkspace: "VF" }] });
    assert.deepEqual(matrixSummary(buildMatrix(input, ASSIGNEES)), [
      { status: "Sesuai", count: 11 },
      { status: "Open Issue", count: 1 },
    ]);
  });
});
