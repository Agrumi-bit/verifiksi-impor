import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { caseRow, detailInput } from "./test-fixtures";
import { actionLabel, buildLineage, historyRows, sortTrail, trailSourceOf } from "./traceability";

describe("trailSourceOf / actionLabel", () => {
  it("credits Compliance's own actions to Compliance and the rest to the actor's workspace", () => {
    assert.equal(trailSourceOf("COMPLIANCE_ASSIGN_PIC", "ADMIN"), "CMP");
    assert.equal(trailSourceOf("RETURN", "VERIFIKATOR"), "VF");
    assert.equal(trailSourceOf("RESUBMIT", "PERUSAHAAN"), "COMPANY");
    assert.equal(trailSourceOf("COMPLETE", null), "SYSTEM");
    assert.equal(actionLabel("RETURN"), "Dikembalikan untuk revisi");
    assert.equal(actionLabel("SOMETHING_NEW"), "something new");
  });

  it("orders the trail newest first", () => {
    const events = [
      { id: "a", at: "2026-07-01T00:00:00Z", applicationId: "x", applicationNumber: "X", source: "CR" as const, text: "", by: null },
      { id: "b", at: "2026-07-03T00:00:00Z", applicationId: "x", applicationNumber: "X", source: "VF" as const, text: "", by: null },
    ];
    assert.deepEqual(sortTrail(events).map((event) => event.id), ["b", "a"]);
  });
});

describe("historyRows", () => {
  it("lists every changed field with readable labels and values", () => {
    const rows = historyRows([
      {
        id: "l1",
        createdAt: "2026-07-25T10:00:00Z",
        applicationId: "a1",
        applicationNumber: "APP-1",
        action: "COMPLIANCE_ADMIN_CHECK",
        actorName: "Budi",
        actorRole: "COMPLIANCE",
        changedFields: [
          { path: "compliance.finalReviewDone", before: false, after: true },
          { path: "compliance.status", before: "Belum Direview", after: "Compliance Lengkap" },
        ],
      },
      {
        id: "l2",
        createdAt: "2026-07-26T10:00:00Z",
        applicationId: "a1",
        applicationNumber: "APP-1",
        action: "COMPLIANCE_FINDING_FOLLOW_UP",
        actorName: "Budi",
        actorRole: "COMPLIANCE",
        changedFields: [{ path: "compliance.finding.ISS-0001.status", before: "OPEN", after: "RESOLVED" }],
      },
      { id: "l3", createdAt: "2026-07-27T10:00:00Z", applicationId: "a1", applicationNumber: "APP-1", action: "RETURN", actorName: "Vera", actorRole: "VERIFIKATOR", changedFields: null },
    ]);
    assert.deepEqual(
      rows.map((row) => [row.field, row.before, row.after]),
      [
        ["Status ISS-0001", "Open Issue", "Resolved"],
        ["Final Review Compliance", "Tidak", "Ya"],
        ["Status compliance", "Belum Direview", "Compliance Lengkap"],
      ],
    );
    assert.equal(rows[0].source, "CMP");
  });
});

describe("buildLineage", () => {
  it("traces each LHVIU field to its workspace, document and recorded data", () => {
    const rows = Object.fromEntries(buildLineage(detailInput()).map((row) => [row.field, row]));
    assert.equal(rows.NIB.evidence?.path, "documents/nib.pdf");
    assert.equal(rows["Alamat Kantor"].data, "Jl. Industri No. 10");
    assert.equal(rows["HS Code"].data, "2 HS: 6109.10, 6204.42");
    assert.equal(rows["Modal Kerja"].evidence?.path, "documents/modal.pdf");
    assert.equal(rows["Nomor LHVIU"].data, "3/LHVIU/TBI/III/2026");
  });

  it("hides data until the source workspace hands over", () => {
    const input = detailInput({ row: caseRow({ assignments: [{ scheduleType: "dokumen", status: "IN_PROGRESS", letterStatus: "APPROVED", pmReviewStatus: null }] }) });
    const npwp = buildLineage(input).find((row) => row.field === "NPWP")!;
    assert.equal(npwp.data, "Menunggu handover");
    assert.equal(npwp.evidence, null);
  });
});
