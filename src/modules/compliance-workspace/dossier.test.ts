import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { administrativeBlocker, buildDossier, lhviuValidity, nextComplianceStatus, readySections, type DossierInput } from "./dossier";
import { caseRow, detailInput } from "./test-fixtures";

function dossierInput(overrides: Partial<DossierInput> = {}): DossierInput {
  return {
    ...detailInput(),
    outputs: {
      CR: { approvedLetters: 3, letters: 3 },
      SV: { doneAt: "2026-07-20T00:00:00.000Z", names: ["Rizky"], pmReview: "Disetujui" },
      VF: { doneAt: "2026-07-21T00:00:00.000Z", names: ["Vera"], pmReview: "Disetujui" },
      PM: { at: "2026-07-23T00:00:00.000Z", names: ["Hendra"] },
    },
    ...overrides,
  };
}

describe("buildDossier", () => {
  it("has the five sections of the final case file, all ready on a finished case", () => {
    const sections = buildDossier(dossierInput());
    assert.deepEqual(sections.map((section) => section.key), ["CR", "SV", "VF", "PM", "LH"]);
    assert.equal(readySections(sections), 5);
    assert.equal(sections[1].completedBy, "Rizky");
    assert.equal(sections[4].result, "LHVIU 3/LHVIU/TBI/III/2026");
    assert.equal(sections[4].documents[0].path, "lhviu/x.pdf");
  });

  it("keeps a section empty until its workspace hands over", () => {
    const input = dossierInput({
      ...detailInput({ row: caseRow({ assignments: [{ scheduleType: "dokumen", status: "IN_PROGRESS", letterStatus: "APPROVED", pmReviewStatus: null }], lhviuIssued: false }) }),
    });
    const verification = buildDossier(input).find((section) => section.key === "VF")!;
    assert.equal(verification.ready, false);
    assert.equal(verification.status, "Dalam Proses");
    assert.equal(verification.completedBy, "—");
    assert.deepEqual(verification.documents, []);
  });
});

describe("administrativeBlocker", () => {
  it("allows Dossier lengkap only when all six sections are ready", () => {
    const ready = dossierInput();
    assert.equal(administrativeBlocker("dossierComplete", ready, buildDossier(ready)), null);
    const partial = dossierInput({ ...detailInput({ row: caseRow({ lhviuIssued: false }) }) });
    assert.match(administrativeBlocker("dossierComplete", partial, buildDossier(partial)) ?? "", /belum lengkap/);
  });

  it("allows Final Review only when handed over and no finding is active", () => {
    const ready = dossierInput();
    assert.equal(administrativeBlocker("finalReviewDone", ready, buildDossier(ready)), null);
    const withFinding = dossierInput({
      ...detailInput({ row: caseRow({ findings: [{ id: "f", issueNumber: "ISS-0001", kind: "OPEN", title: "x", sourceWorkspace: "VF", requirementKey: "modal" }] }) }),
    });
    assert.match(administrativeBlocker("finalReviewDone", withFinding, buildDossier(withFinding)) ?? "", /temuan/);
  });
});

describe("nextComplianceStatus", () => {
  it("moves to Compliance Lengkap, then Selesai, and back when Final Review is removed", () => {
    assert.equal(nextComplianceStatus("BELUM_DIREVIEW", { finalReviewDone: true, dossierComplete: false }, true), "COMPLIANCE_LENGKAP");
    assert.equal(nextComplianceStatus("COMPLIANCE_LENGKAP", { finalReviewDone: true, dossierComplete: true }, true), "SELESAI");
    assert.equal(nextComplianceStatus("COMPLIANCE_LENGKAP", { finalReviewDone: true, dossierComplete: true }, false), "COMPLIANCE_LENGKAP");
    assert.equal(nextComplianceStatus("SELESAI", { finalReviewDone: false, dossierComplete: true }, true), "DALAM_KONSOLIDASI");
    assert.equal(nextComplianceStatus("PERLU_KLARIFIKASI", { finalReviewDone: false, dossierComplete: true }, true), "PERLU_KLARIFIKASI");
  });
});

describe("lhviuValidity", () => {
  it("is valid for one year from the issue date", () => {
    assert.deepEqual(lhviuValidity("2026-10-20", "2027-10-20"), { validUntil: "2027-10-20", status: "Berlaku" });
    assert.deepEqual(lhviuValidity("2026-10-20", "2027-10-21"), { validUntil: "2027-10-20", status: "Kedaluwarsa" });
  });
});
