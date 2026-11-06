import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { completenessStats, completenessVerdict, type CompletenessDoc } from "./completeness";

const doc = (over: Partial<CompletenessDoc>): CompletenessDoc => ({
  key: "k",
  label: "Dok",
  category: "c",
  documentPath: "p.pdf",
  lengkap: true,
  status: "VALID",
  rejectionNote: "",
  requestNote: "",
  version: 1,
  uploadedAt: null,
  ...over,
});

describe("Laporan Kelengkapan Dokumen", () => {
  it("LENGKAP when every document is valid or not needed", () => {
    const docs = [doc({}), doc({ lengkap: false, documentPath: null, status: "NOT_APPLICABLE" })];
    assert.equal(completenessVerdict(docs).key, "LENGKAP");
    assert.equal(completenessStats(docs).kurang, 0);
  });
  it("BELUM LENGKAP when a document is missing or invalid", () => {
    assert.equal(completenessVerdict([doc({}), doc({ lengkap: false, documentPath: null, status: "PENDING" })]).key, "BELUM_LENGKAP");
    assert.equal(completenessVerdict([doc({ status: "REJECTED" })]).key, "BELUM_LENGKAP");
  });
  it("Belum Tersedia counts as missing even with a file", () => {
    const docs = [doc({ status: "PENDING", unavailable: true })];
    assert.equal(completenessVerdict(docs).key, "BELUM_LENGKAP");
    assert.deepEqual([completenessStats(docs).tersedia, completenessStats(docs).belumTersedia, completenessStats(docs).belumDiperiksa], [0, 1, 0]);
  });
  it("still running when uploaded documents are not yet checked", () => {
    assert.equal(completenessVerdict([doc({}), doc({ status: "PENDING" })]).key, "BELUM_SELESAI");
  });
});
