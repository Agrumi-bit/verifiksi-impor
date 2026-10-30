import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildLegalitasRows, kbliCheck, legalitasSummary, type LegalitasValues } from "./legalitas";

const VALUES: LegalitasValues = {
  nib: "8123456789012",
  npwp: "12.345.678.9-012.000",
  kbliUtama: ["46412 – Perdagangan Besar Pakaian"],
  kbliPendukung: [],
  notarialDeedNumber: "12",
  notarialAmendmentNumber: null,
  skNumber: null,
  sktNumber: null,
  taxProofYears: [],
};

const CHECKLIST = [
  { key: "nib", label: "NIB", category: "Legalitas Perusahaan", documentPath: "documents/nib.pdf" },
  { key: "kbli-utama", label: "KBLI Utama", category: "Legalitas Perusahaan", documentPath: "documents/kbli.pdf" },
  { key: "notarial", label: "Akta Pendirian", category: "Legalitas Perusahaan", documentPath: null },
  { key: "npwp", label: "NPWP", category: "Perpajakan", documentPath: "documents/npwp.pdf" },
  { key: "location:L1:warehouseLayout", label: "Layout Gudang", category: "Dokumen Lokasi", documentPath: "x.pdf" },
];

describe("buildLegalitasRows", () => {
  const rows = buildLegalitasRows(
    CHECKLIST,
    {
      nib: { verificationStatus: "VERIFIED", verifiedByName: "Vera", verifiedByRole: "VERIFIKATOR", verifiedAt: null, rejectionNote: null },
      npwp: { verificationStatus: "NEED_REVISION", verifiedByName: "Vera", verifiedByRole: "VERIFIKATOR", verifiedAt: null, rejectionNote: "Pindaian buram" },
    },
    VALUES,
  );

  it("keeps the scheme's legal and tax documents, dropping supporting ones that weren't uploaded", () => {
    assert.deepEqual(rows.map((row) => row.key), ["nib", "kbli-utama", "npwp"]);
  });

  it("keeps a required document even when it is missing", () => {
    const missing = buildLegalitasRows([{ key: "npwp", label: "NPWP", category: "Perpajakan", documentPath: null }], {}, VALUES);
    assert.equal(missing.length, 1);
    assert.equal(missing[0].document, null);
  });

  it("shows the Verifikator's recorded status and note, defaulting to Belum Diverifikasi", () => {
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    assert.equal(byKey.nib.status, "VERIFIED");
    assert.equal(byKey.nib.verifiedBy, "Vera (Verifikator)");
    assert.equal(byKey.npwp.note, "Pindaian buram");
    assert.equal(byKey["kbli-utama"].status, "NOT_YET_VERIFIED");
  });

  it("takes requirement type and regulation from the VIU Konsumsi scheme", () => {
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    assert.equal(byKey.nib.requirement, "Wajib");
    assert.equal(byKey.nib.regulation, "Pasal 37 ayat (2) huruf c angka 2 huruf b)");
    assert.equal(byKey.npwp.regulation, "Pasal 37 ayat (2) huruf c angka 2 huruf a)");
  });

  it("fills Isian from the application and links the document when there is one", () => {
    const byKey = Object.fromEntries(rows.map((row) => [row.key, row]));
    assert.equal(byKey.npwp.value, "12.345.678.9-012.000");
    assert.equal(byKey["kbli-utama"].value, "46412 – Perdagangan Besar Pakaian");
    assert.equal(byKey.nib.document?.path, "documents/nib.pdf");
  });

  it("summarises per status", () => {
    assert.deepEqual(legalitasSummary(rows), [
      { status: "VERIFIED", count: 1 },
      { status: "NEED_REVISION", count: 1 },
      { status: "NOT_YET_VERIFIED", count: 1 },
    ]);
  });
});

describe("kbliCheck", () => {
  it("marks the KBLI Utama codes that are on the VIU Konsumsi list", () => {
    const result = kbliCheck(["46411", "46412", "46414"], ["46412"]);
    assert.deepEqual(result.matched, ["46412"]);
    assert.equal(result.ok, true);
    assert.match(result.regulation, /Pasal 37 ayat \(2\) huruf c angka 2 huruf b\)/);
    assert.equal(kbliCheck(["46411"], ["13111"]).ok, false);
  });
});
