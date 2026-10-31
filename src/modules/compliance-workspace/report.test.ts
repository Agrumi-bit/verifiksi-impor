import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DossierInput } from "./dossier";
import type { KonsumsiStageInput } from "./konsumsi-stages";
import { buildComplianceReport, type ReportInput } from "./report";
import { caseRow, detailInput } from "./test-fixtures";

function dossier(overrides: Partial<DossierInput> = {}): DossierInput {
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

const KONSUMSI: KonsumsiStageInput = {
  submittedAt: "2026-07-25T00:00:00.000Z",
  brands: [],
  products: [
    { id: "P1", brandId: "b1", brandName: "ABC", productName: "Kaos", kelompok: "Pakaian", subKelompok: "Kaos", commodityGroupId: "g1", hsCode: "6109.10", hsDescription: null, quantity: 10, stock: 0, unit: "Pcs", unitPrice: 5, currency: "USD" },
  ],
  certificates: [{ brandId: "b1", commodityGroupId: "g1", subKelompok: "Kaos", certificateNumber: "C-1", laboratory: "Lab", issueDate: "2025-12-01", validUntil: null, filePath: "c.pdf" }],
  productStatuses: { P1: { status: "VERIFIED", note: null } },
  documents: [],
  warehouses: [],
};

function report(overrides: Partial<ReportInput> = {}) {
  return buildComplianceReport({ detail: dossier(), legalitas: null, lokasi: null, konsumsi: null, generatedAt: "2026-10-31T00:00:00.000Z", ...overrides });
}

describe("buildComplianceReport", () => {
  it("numbers the document after the application and stays a draft until compliance is Selesai", () => {
    assert.equal(report().documentNumber, "LHC/APP-VIU-0001");
    assert.equal(report().isFinal, false);
    assert.equal(report({ detail: dossier({ row: caseRow({ complianceStatus: "SELESAI" }) }) }).isFinal, true);
  });

  it("has the agreed sections in order", () => {
    const keys = report({ konsumsi: KONSUMSI }).sections.map((section) => section.key);
    assert.deepEqual(keys, ["ringkasan", "informasi", "workspace", "matrix", "merek", "rencana-impor", "stok", "uji-mutu", "label", "modal", "temuan", "dossier", "lhviu"]);
  });

  it("concludes green when everything is handed over with no finding and no flagged verdict", () => {
    assert.equal(report().conclusion.tone, "green");
  });

  it("cannot conclude while a workspace has not handed over", () => {
    const pending = report({ detail: dossier({ row: caseRow({ lhviuIssued: false, assignments: [] }) }) });
    assert.equal(pending.conclusion.tone, "slate");
    assert.match(pending.conclusion.text, /Belum dapat disimpulkan/);
  });

  it("puts active findings ahead of everything else", () => {
    const finding = { id: "f1", issueNumber: "CMP-1", kind: "OPEN" as const, title: "NPWP berbeda", requirementKey: "npwp", sourceWorkspace: "VF" };
    const withFinding = report({ detail: dossier({ row: caseRow({ findings: [finding] }), findings: [finding] }) });
    assert.equal(withFinding.conclusion.tone, "red");
    const temuan = withFinding.sections.find((section) => section.key === "temuan")!;
    assert.equal(temuan.blocks[0].kind === "table" && temuan.blocks[0].rows.length, 1);
  });

  it("lists a quality-test certificate older than 6 months as an inspection note", () => {
    const result = report({ konsumsi: KONSUMSI });
    assert.equal(result.conclusion.tone, "orange");
    const ringkasan = result.sections[0].blocks.find((block) => block.kind === "notes");
    assert.ok(ringkasan && ringkasan.kind === "notes" && ringkasan.items.some((item) => /Uji Mutu ABC/.test(item.text)));
  });
});
