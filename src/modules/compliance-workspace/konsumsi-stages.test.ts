import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { DocumentRow } from "./document-matrix";
import {
  brandValidity,
  buildLabelStage,
  buildMerekStage,
  buildRencanaImporStage,
  buildStokStage,
  buildUjiMutuStage,
  documentAgeMonths,
  documentsVerdict,
  totalsByCurrency,
  type BrandInput,
  type KonsumsiStageInput,
  type ProductInput,
} from "./konsumsi-stages";

function brand(overrides: Partial<BrandInput> = {}): BrandInput {
  return {
    brandId: "B1",
    brandName: "Arunika",
    ownerName: "PT Arunika",
    ownerLocation: "DOMESTIC",
    ownerCountry: null,
    evidenceType: "SERTIFIKAT_MEREK_TERDAFTAR",
    evidenceTypeLabel: "Sertifikat Merek",
    registrationNumber: "IDM000123",
    registrationDate: "2020-01-10T00:00:00.000Z",
    registrationExpiryDate: "2030-01-10T00:00:00.000Z",
    applicantRole: "Perwakilan Resmi",
    appointedBy: null,
    requiredDocuments: ["Akta Penunjukan"],
    ...overrides,
  };
}

function product(overrides: Partial<ProductInput> = {}): ProductInput {
  return {
    id: "P1",
    brandId: "B1",
    brandName: "Arunika",
    productName: "Kaos",
    kelompok: "Pakaian",
    subKelompok: "Pakaian Rajut",
    commodityGroupId: "G1",
    hsCode: "6109.10.00",
    hsDescription: "T-shirt katun",
    quantity: 100,
    stock: 20,
    unit: "PCS",
    unitPrice: 5,
    currency: "USD",
    ...overrides,
  };
}

function doc(key: string, status: DocumentRow["status"], path: string | null = "x.pdf"): DocumentRow {
  return { key, label: key, value: "—", document: path ? { label: key, path } : null, status, verifiedBy: null, note: null, requirement: "Wajib", regulation: "—" };
}

function input(overrides: Partial<KonsumsiStageInput> = {}): KonsumsiStageInput {
  return {
    submittedAt: "2026-03-01T00:00:00.000Z",
    brands: [brand()],
    products: [product()],
    certificates: [],
    productStatuses: {},
    documents: [],
    warehouses: [],
    ...overrides,
  };
}

describe("brandValidity", () => {
  it("is Berlaku for a registered certificate still valid at Tanggal Pengajuan", () => {
    assert.equal(brandValidity(brand(), "2026-03-01").tone, "green");
  });
  it("flags a certificate that expired before Tanggal Pengajuan", () => {
    const result = brandValidity(brand({ registrationExpiryDate: "2026-01-01T00:00:00.000Z" }), "2026-03-01");
    assert.equal(result.label, "Kedaluwarsa saat pengajuan");
  });
  it("applies the production 9-month rule to a Tanda Daftar Merek, judged at Tanggal Pengajuan", () => {
    const tdm = brand({ evidenceType: "TANDA_DAFTAR_MEREK", registrationDate: "2025-01-01T00:00:00.000Z", registrationExpiryDate: null });
    assert.equal(brandValidity(tdm, "2025-06-01").tone, "green");
    assert.equal(brandValidity(tdm, "2026-03-01").label, "Melewati batas 9 bulan");
  });
  it("reports a brand without evidence", () => {
    assert.equal(brandValidity(brand({ evidenceType: null }), "2026-03-01").label, "Tidak ada bukti merek");
  });
});

describe("documentsVerdict", () => {
  it("takes the worst recorded status", () => {
    assert.equal(documentsVerdict([doc("a", "VERIFIED"), doc("b", "NEED_REVISION")]).label, "Perlu Revisi");
    assert.equal(documentsVerdict([doc("a", "VERIFIED"), doc("b", "REJECTED")]).tone, "red");
    assert.equal(documentsVerdict([doc("a", "VERIFIED")]).label, "Terverifikasi");
    assert.equal(documentsVerdict([]).label, "Tidak ada dokumen");
  });
});

describe("buildMerekStage", () => {
  it("groups each brand's documents and counts uploaded relationship documents", () => {
    const stage = buildMerekStage(
      input({
        documents: [doc("konsumsi-brand:B1:evidence", "VERIFIED"), doc("konsumsi-brand:B1:rel:importer_appointment", "NOT_YET_VERIFIED", null), doc("konsumsi-label:statement", "VERIFIED")],
      }),
    );
    assert.equal(stage.relations[0].documents.length, 2);
    assert.deepEqual(stage.relations[0].completeness, { uploaded: 0, required: 1 });
    assert.equal(stage.brands[0].status.label, "Terverifikasi");
    assert.equal(stage.matrix.length, 2);
    assert.equal(stage.matrix[0].brandName, "Arunika");
  });
});

describe("buildRencanaImporStage", () => {
  it("computes line totals and keeps currencies apart", () => {
    const stage = buildRencanaImporStage(input({ products: [product(), product({ id: "P2", currency: "IDR", unitPrice: 1000, quantity: 3 })] }));
    assert.equal(stage.rows[0].total, 500);
    assert.deepEqual(stage.totals, [
      { currency: "USD", total: 500 },
      { currency: "IDR", total: 3000 },
    ]);
  });
  it("reads product status from the Verifikator and has no technical-analysis row", () => {
    const stage = buildRencanaImporStage(input({ productStatuses: { P1: { status: "VERIFIED", note: null } } }));
    assert.equal(stage.rows[0].verdict.label, "Verified");
    assert.equal(stage.checks.length, 1);
    assert.equal(stage.checks[0].verdict.label, "Sesuai");
    assert.equal(stage.checks[0].result, "1 dari 1 produk Verified oleh Verifikator");
  });
  it("shows the worst product status when not every product is verified", () => {
    const stage = buildRencanaImporStage(
      input({ products: [product(), product({ id: "P2" })], productStatuses: { P1: { status: "VERIFIED", note: null }, P2: { status: "NEED_REVISION", note: "HS salah" } } }),
    );
    assert.equal(stage.checks[0].verdict.label, "Need Revision");
    assert.equal(stage.rows[1].verdict.note, "HS salah");
  });
});

describe("totalsByCurrency", () => {
  it("returns nothing for no products", () => {
    assert.deepEqual(totalsByCurrency([], () => 1), []);
  });
});

describe("buildStokStage", () => {
  it("counts products with stock on hand", () => {
    const stage = buildStokStage(input({ products: [product(), product({ id: "P2", stock: 0 })], warehouses: ["Gudang A"] }));
    assert.equal(stage.stocked, 1);
    assert.equal(stage.rows.length, 2);
    assert.deepEqual(stage.warehouses, ["Gudang A"]);
  });
  it("judges the stock data on the Verifikator's per-product status", () => {
    const stage = buildStokStage(input({ products: [product(), product({ id: "P2" })], productStatuses: { P1: { status: "VERIFIED", note: null } } }));
    assert.equal(stage.check.verdict.label, "Belum Diperiksa");
    assert.equal(stage.check.result, "1 dari 2 produk Verified oleh Verifikator");
  });
});

describe("buildUjiMutuStage", () => {
  const certificate = { brandId: "B1", commodityGroupId: "G1", subKelompok: "Pakaian Rajut", certificateNumber: "LAB-1", laboratory: "BBT", issueDate: "2025-12-01", validUntil: null, filePath: "c.pdf" };

  it("makes one row per Merek × Sub Kelompok with every HS it covers", () => {
    const rows = buildUjiMutuStage(input({ products: [product(), product({ id: "P2", hsCode: "6109.90.00" }), product({ id: "P3", commodityGroupId: "G2" })] }));
    assert.equal(rows.length, 2);
    assert.deepEqual(rows[0].hsCodes, ["6109.10.00", "6109.90.00"]);
    assert.equal(rows[1].window.label, "Tidak ada sertifikat");
  });
  it("applies the production 6-month window at Tanggal Pengajuan", () => {
    assert.equal(buildUjiMutuStage(input({ certificates: [certificate] }))[0].window.label, "≤ 6 bulan");
    assert.equal(buildUjiMutuStage(input({ certificates: [{ ...certificate, issueDate: "2025-06-01" }] }))[0].window.tone, "red");
  });
  it("links the Verifikator's document status", () => {
    const rows = buildUjiMutuStage(input({ certificates: [certificate], documents: [doc("konsumsi-qt:B1:G1", "VERIFIED")] }));
    assert.equal(rows[0].document?.status, "VERIFIED");
  });
});

describe("documentAgeMonths", () => {
  it("counts whole months up to Tanggal Pengajuan", () => {
    assert.equal(documentAgeMonths("2025-12-01", "2026-03-01T00:00:00.000Z"), 3);
    assert.equal(documentAgeMonths("2025-12-15", "2026-03-01"), 2);
    assert.equal(documentAgeMonths(null, "2026-03-01"), null);
  });
});

describe("buildLabelStage", () => {
  it("picks the statement and documentation rows", () => {
    const stage = buildLabelStage(input({ documents: [doc("konsumsi-label:statement", "VERIFIED"), doc("konsumsi-label:documentation", "NEED_REVISION")] }));
    assert.equal(stage.statement?.status, "VERIFIED");
    assert.equal(stage.documentation?.status, "NEED_REVISION");
    assert.equal(stage.groups.length, 1);
    assert.equal(stage.matrix.length, 2);
  });
});
