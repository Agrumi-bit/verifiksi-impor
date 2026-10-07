import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findForbiddenTerms } from "@/modules/schemes";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist } from "./schema";
import { getChecklistItems } from "./document-checklist-items";
import { createComplianceResolver } from "./scheme-compliance";
import { createSchemeReport } from "./scheme-report";
import type { NarrativeContext } from "./report-narrative";

/** Tahap 2 — VIU Barang Konsumsi served end-to-end by src/modules/schemes. */
const payload = {
  verificationType: "VIU",
  importTypes: ["BARANG_KONSUMSI"],
  companyName: "PT CONTOH JAYA",
  nibNumber: "1234567890123",
  nibDocumentPath: "documents/nib.pdf",
  kbliDocumentPath: "documents/kbli.pdf",
  kbliEntries: [{ code: "46412", description: "Perdagangan Besar Pakaian", category: "UTAMA" }],
  npwpNumber: "01.234",
  npwpDocumentPath: "documents/npwp.pdf",
  companyAge: "OVER_3",
  locations: [
    { id: "L1", locationType: "KANTOR", buildingStatus: "SEWA", address: "Jl. A", leaseDocuments: [{ type: "SEWA_MENYEWA", documentPath: "d/sewa.pdf" }] },
    { id: "L2", locationType: "GUDANG", buildingStatus: "MILIK_SENDIRI", address: "Jl. B", ownershipDocuments: [{ type: "SHM", documentPath: "d/shm.pdf" }], warehouseRegistrationDocumentPath: "d/tdg.pdf" },
    { id: "L3", locationType: "PABRIK", buildingStatus: "MILIK_SENDIRI", address: "Jl. C", ownershipDocuments: [{ type: "SHM", documentPath: "d/shm2.pdf" }] },
  ],
  konsumsiFinancialDocuments: [{ key: "surat-pernyataan-modal-kerja", documentPath: "d/modal.pdf", amount: "500000000" }],
  konsumsiDocuments: [{ id: "old1", label: "Dokumen lama", documentPath: "d/old.pdf" }],
  vkiSupportDocs: [{ key: "memiliki-menguasai", documentPath: "d/sp.pdf" }],
  applicationBrands: [{ brandId: "B1", applicantRole: "IMPORTER_ONLY", relationshipDocuments: { importer_appointment: { filePath: "d/tunjuk.pdf" } } }],
  labelStatementDocument: { filePath: "d/label.pdf", fileName: "label.pdf" },
  konsumsiProducts: [{ brandId: "B1", commodityGroupId: "G1", commodityName: "Kemeja", hsCode: "6205.20.00" }],
  productGroupCertificates: [{ brandId: "B1", commodityGroupId: "G1", filePath: "d/qt.pdf" }],
} as unknown as ApplicationWizardValues;
const brands = [
  {
    brandId: "B1",
    brandName: "MEREKKU",
    registrationDocumentPath: "d/merek.pdf",
    requiredRelationshipDocuments: [{ code: "importer_appointment", label: "Surat Penunjukan Importir" }],
    details: {
      evidenceTypeLabel: "Sertifikat Merek",
      registrationNumber: "IDM000123456",
      registrationDate: "2024-03-01T00:00:00.000Z",
      registrationExpiryDate: "2034-03-01T00:00:00.000Z",
      trademarkClasses: ["Kelas 25 — Pakaian"],
      ownerName: "PT PEMILIK MEREK",
      applicantRelationship: "Hanya Bertindak sebagai Importir (ditunjuk oleh Pemilik Merek)",
    },
  },
];

describe("VIU Barang Konsumsi checklist & report (scheme module)", () => {
  const items = buildDocumentChecklist(payload, null, [], brands, new Map());
  const keys = items.map((i) => i.key);

  it("lists Merek, Label and Uji Mutu documents (Pasal 37 ayat (2) huruf c f)–h))", () => {
    for (const k of ["konsumsi-brand:B1:evidence", "konsumsi-brand:B1:rel:importer_appointment", "konsumsi-label:statement", "konsumsi-label:documentation", "konsumsi-qt:B1:G1"]) {
      assert.ok(keys.includes(k), k);
    }
  });

  it("hides documents no Konsumsi rule asks for (legacy support:, VKI SP, Pabrik)", () => {
    assert.ok(!keys.includes("support:old1"));
    assert.ok(!keys.includes("vki-support:memiliki-menguasai"));
    assert.ok(!keys.some((k) => k.startsWith("location:L3:")));
  });

  it("compliance cells come from the Konsumsi scheme", () => {
    const c = createComplianceResolver(payload);
    assert.equal(c.schemes?.[0], "VIU_KONSUMSI");
    assert.match(c.def("npwp")!.referensi, /^Pasal 37 ayat \(2\) huruf c angka 2 huruf a\)/);
    assert.match(c.def("location:L1:lease:SEWA_MENYEWA")!.referensi, /huruf c angka 2 huruf c\)/);
    assert.match(c.def("location:L2:ownership:SHM")!.referensi, /huruf c angka 2 huruf d\)/);
    assert.equal(c.def("tax-proof-summary")!.persyaratan, "Pendukung");
  });

  it("report: no unuploaded supporting documents, no VKI wording, renumbered", () => {
    const report = createSchemeReport({ verificationType: "VIU", payload, companyLocations: null })!;
    assert.ok(report);
    const rows = report.relevantRows(items.map((i) => ({ ...i, status: "VALID" })));
    assert.ok(!rows.some((r) => r.key.startsWith("tax-support:")), "unuploaded pendukung printed");
    const ctx = {
      payload,
      company: "PT CONTOH JAYA",
      businessAddress: null,
      companyLegal: null,
      companyLocations: null,
      partners: [],
      documentStatuses: Object.fromEntries(rows.map((r) => [r.key, "VALID"])),
    } as unknown as NarrativeContext;
    const categories = report.orderCategories([...new Set(rows.map((r) => r.category))]);
    assert.deepEqual(categories.slice(0, 3), ["Legalitas Perusahaan", "Perpajakan", "Dokumen Lokasi"]);
    for (const category of categories) {
      const docs = report.buildCategoryDocs(category, rows, ctx);
      assert.deepEqual(docs.map((d) => d.no), docs.map((_, i) => i + 1));
      for (const d of docs) {
        const text = [...d.intro(ctx), ...d.findings(ctx), d.kesimpulan(ctx).text].join(" ");
        assert.deepEqual(findForbiddenTerms("VIU_KONSUMSI", text), [], `${d.key}: ${text}`);
        assert.ok(!text.includes("[BELUM DIATUR"), d.key);
      }
    }
  });
});

describe("Sertifikat Merek — Uraian yang Diperiksa", () => {
  const items = getChecklistItems("konsumsi-brand:B1:evidence");
  const ctx = { payload, businessAddress: null, companyLegal: null, companyLocations: null, konsumsiBrands: brands } as unknown as Parameters<
    NonNullable<(typeof items)[number]["getValue"]>
  >[0];
  const valueOf = (id: string) => items.find((item) => item.id === id)?.getValue?.(ctx);

  it("lists the eight brand points in order", () => {
    assert.deepEqual(
      items.map((item) => item.title),
      [
        "Nama Merek",
        "Jenis Bukti Merek",
        "Nomor Sertifikat / Pendaftaran",
        "Tanggal Penerbitan",
        "Tanggal Kedaluwarsa",
        "Kelas Merek",
        "Pemilik Merek",
        "Hubungan dengan Pemohon VIU Konsumsi",
      ],
    );
  });

  it("fills each point from the brand record and the application's brand entry", () => {
    assert.equal(valueOf("brand-name"), "MEREKKU");
    assert.equal(valueOf("brand-evidence-type"), "Sertifikat Merek");
    assert.equal(valueOf("brand-registration-number"), "IDM000123456");
    assert.equal(valueOf("brand-issue-date"), "1 Maret 2024");
    assert.equal(valueOf("brand-expiry-date"), "1 Maret 2034");
    assert.equal(valueOf("brand-class"), "Kelas 25 — Pakaian");
    assert.equal(valueOf("brand-owner"), "PT PEMILIK MEREK");
    assert.equal(valueOf("brand-applicant-relationship"), "Hanya Bertindak sebagai Importir (ditunjuk oleh Pemilik Merek)");
  });

  it("leaves relationship documents on the generic points", () => {
    assert.ok(!getChecklistItems("konsumsi-brand:B1:rel:importer_appointment").some((item) => item.id === "brand-name"));
  });
});

describe("Sertifikat Merek — Laporan Verifikasi Dokumen", () => {
  const items = buildDocumentChecklist(payload, null, [], brands, new Map());
  const report = createSchemeReport({ verificationType: "VIU", payload, companyLocations: null })!;
  const rows = report.relevantRows(items.map((i) => ({ ...i, status: "VALID" })));
  const ctx = {
    payload,
    company: "PT CONTOH JAYA",
    businessAddress: null,
    companyLegal: null,
    companyLocations: null,
    partners: [],
    konsumsiBrands: brands,
    documentStatuses: Object.fromEntries(rows.map((r) => [r.key, "VALID"])),
  } as unknown as NarrativeContext;
  const page = report.buildCategoryDocs("Dokumen Merek", rows, ctx).find((d) => d.key === "konsumsi-brand:B1:evidence")!;

  it("prints the same brand points as the review modal", () => {
    const fields = Object.fromEntries(page.fields(ctx).map((f) => [f.label, f.value]));
    assert.equal(fields["Nama Merek"], "MEREKKU");
    assert.equal(fields["Jenis Bukti Merek"], "Sertifikat Merek");
    assert.equal(fields["Nomor Sertifikat / Pendaftaran"], "IDM000123456");
    assert.equal(fields["Tanggal Penerbitan"], "1 Maret 2024");
    assert.equal(fields["Tanggal Kedaluwarsa"], "1 Maret 2034");
    assert.equal(fields["Kelas Merek"], "Kelas 25 — Pakaian");
    assert.equal(fields["Pemilik Merek"], "PT PEMILIK MEREK");
    assert.equal(fields["Hubungan dengan Pemohon VIU Konsumsi"], "Hanya Bertindak sebagai Importir (ditunjuk oleh Pemilik Merek)");
  });

  it("findings cite the examined certificate data", () => {
    const text = page.findings(ctx).join(" ");
    assert.match(text, /Nomor IDM000123456/);
    assert.match(text, /PT PEMILIK MEREK/);
  });
});

