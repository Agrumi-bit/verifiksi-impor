import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findForbiddenTerms } from "@/modules/schemes";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist } from "./schema";
import { createComplianceResolver } from "./scheme-compliance";
import { createSchemeReport } from "./scheme-report";
import {
  buildElectricityDocuments,
  buildLocationDocuments,
  LEGALITAS_DOCUMENTS,
  PERPAJAKAN_DOCUMENTS,
  SURAT_PERNYATAAN_DOCUMENTS,
  TENAGA_KERJA_DOCUMENTS,
  type NarrativeContext,
} from "./report-narrative";

/** Tahap 5 — VKI served by src/modules/schemes with the exact text it printed before. */
const payload = {
  verificationType: "VKI",
  companyName: "PT TENUN MAKMUR",
  companyType: "PT",
  nibNumber: "9120001234567",
  nibIssueDate: "2020-02-03",
  nibDocumentPath: "documents/nib.pdf",
  kbliDocumentPath: "documents/kbli.pdf",
  kbliEntries: [
    { code: "13112", description: "Industri Pertenunan", category: "UTAMA" },
    { code: "13121", description: "Industri Penyempurnaan Kain", category: "PENDUKUNG" },
  ],
  skNumber: "AHU-0001.AH.01.01",
  skDocumentPath: "documents/sk.pdf",
  notarialDeedNumber: "12",
  notarialDeedIssueDate: "2019-05-01",
  notarialIssuingAuthority: "Budi, S.H., M.Kn.",
  notarialDocumentPath: "documents/akta.pdf",
  npwpNumber: "01.234.567.8-901.000",
  npwpDocumentPath: "documents/npwp.pdf",
  companyAge: "OVER_3",
  taxProofSummaryDocumentPath: "documents/pajak.pdf",
  sptTahunanDocumentPath: "documents/spt.pdf",
  ppnDocumentPath: "documents/ppn.pdf",
  skfDocumentPath: "documents/skf.pdf",
  locations: [
    { id: "L1", locationType: "KANTOR", buildingStatus: "SEWA", address: "Jl. A", city: "Bandung", province: "Jawa Barat", leaseOriginalOwnerName: "Pak Ali", leaseStartDate: "2025-01-01", leaseEndDate: "2027-01-01", leaseDocuments: [{ type: "SEWA_MENYEWA", documentPath: "d/sewa.pdf" }] },
    { id: "L2", locationType: "PABRIK", buildingStatus: "MILIK_SENDIRI", address: "Jl. B", city: "Bandung", province: "Jawa Barat", ownershipDocuments: [{ type: "SHM", documentPath: "d/shm.pdf" }] },
    { id: "L3", locationType: "GUDANG", buildingStatus: "MILIK_SENDIRI", address: "Jl. C", city: "Bandung", province: "Jawa Barat", ownershipDocuments: [{ type: "HGB", documentPath: "d/hgb.pdf" }], warehouseRegistrationDocumentPath: "d/tdg.pdf", warehouseRegistrationNumber: "TDG-1", warehouseLayoutDocumentPath: "d/layout.pdf" },
  ],
  tenagaKerjaDocumentPath: "d/tk.pdf",
  tenagaKerjaEntries: [
    { kategori: "Tenaga Kerja Langsung", jumlah: "120" },
    { kategori: "Tenaga Kerja Tidak Langsung", jumlah: "15" },
  ],
  vkiSupportDocs: [
    { key: "tidak-diperjualbelikan", documentPath: "d/sp1.pdf", nomorSurat: "SP-01", tanggal: "2026-09-01", penandatangan: "Direktur" },
    { key: "memiliki-menguasai", documentPath: "d/sp2.pdf", nomorSurat: "SP-02", tanggal: "2026-09-01", penandatangan: "Direktur" },
    { key: "kebenaran-data", documentPath: "d/sp3.pdf", nomorSurat: "SP-03", tanggal: "2026-09-01", penandatangan: "Direktur" },
    { key: "alur-proses", documentPath: "d/sp4.pdf", nomorSurat: "", tanggal: "", penandatangan: "" },
  ],
  electricityMonths: [
    { id: "m1", bulan: "2026-07", nominal: "45000000", kwh: "30000", documentPath: "d/pln1.pdf" },
    { id: "m2", bulan: "2026-08", nominal: "", kwh: "", documentPath: "d/pln2.pdf" },
  ],
  submissionDate: "2026-10-05",
} as unknown as ApplicationWizardValues;

const CITATION_FIXED: Record<string, string> = {
  "vki-support:alur-proses": "Pasal 30 ayat (2) huruf b angka 5 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025",
  "vki-support:tidak-diperjualbelikan": "Pasal 8 ayat (2) huruf a angka 2 huruf c) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025",
  "vki-support:kebenaran-data": "Pasal 8 ayat (2) huruf a angka 2 huruf d) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025",
};

describe("VKI checklist & report (scheme module)", () => {
  const items = buildDocumentChecklist(payload, null, [], [], new Map());
  const keys = items.map((i) => i.key);

  it("keeps every VKI checklist document (Pabrik, surat pernyataan, listrik, tenaga kerja)", () => {
    for (const k of ["location:L2:ownership:SHM", "vki-support:memiliki-menguasai", "vki-support:alur-proses", "vki-support:tenaga-kerja", "vki-support:listrik:m1", "tax-support:skf"]) {
      assert.ok(keys.includes(k), k);
    }
  });

  it("compliance cells come from the VKI scheme (Pasal 30) with the VKI keterangan", () => {
    const c = createComplianceResolver(payload);
    assert.equal(c.schemes?.[0], "VKI");
    assert.match(c.def("npwp")!.referensi, /^Pasal 30 ayat \(2\) huruf b angka 1/);
    assert.equal(c.def("location:L1:lease:SEWA_MENYEWA")!.keterangan, "Digunakan apabila fasilitas produksi atau gudang disewa dari pihak lain.");
    assert.equal(c.def("tax-support:ppn")!.keterangan, "Diverifikasi untuk memastikan kepatuhan pembayaran PPN sesuai kegiatan usaha perusahaan.");
    for (const k of keys) assert.ok(c.def(k), `no VKI def for ${k}`);
  });

  for (const status of ["VALID", "PENDING"]) {
    it(`report text is identical to the pre-refactor VKI text except the corrected surat pernyataan citations (status ${status})`, () => {
      const report = createSchemeReport({ verificationType: "VKI", payload, companyLocations: null })!;
      assert.ok(report);
      assert.equal(report.productChapter, null);
      const rows = report.relevantRows(items.map((i) => ({ ...i, status })));
      const ctx = {
        payload,
        company: "PT TENUN MAKMUR",
        businessAddress: "Jl. A, Bandung",
        companyLegal: null,
        companyLocations: null,
        partners: [],
        documentStatuses: Object.fromEntries(rows.map((r) => [r.key, status])),
      } as unknown as NarrativeContext;
      const legacy = [
        ...LEGALITAS_DOCUMENTS,
        ...PERPAJAKAN_DOCUMENTS,
        ...buildLocationDocuments(ctx),
        ...TENAGA_KERJA_DOCUMENTS,
        ...SURAT_PERNYATAAN_DOCUMENTS,
        ...buildElectricityDocuments(ctx),
      ];
      let compared = 0;
      for (const category of report.orderCategories([...new Set(rows.map((r) => r.category))])) {
        for (const d of report.buildCategoryDocs(category, rows, ctx)) {
          const old = legacy.find((l) => l.key === d.key);
          assert.ok(old, `no legacy text for ${d.key}`);
          assert.deepEqual(d.findings(ctx), old.findings(ctx), `${d.key} findings`);
          const citation = CITATION_FIXED[d.key];
          if (citation) {
            // Only the citation was corrected (legacy cited angka 6 for every surat pernyataan).
            const text = [...d.intro(ctx), d.kesimpulan(ctx).text].join(" ");
            assert.ok(text.includes(citation), `${d.key} cites ${citation}`);
            assert.ok(!text.includes("angka 6"), `${d.key} still cites angka 6`);
            assert.equal(d.kesimpulan(ctx).memenuhi, old.kesimpulan(ctx).memenuhi);
          } else {
            assert.deepEqual(d.intro(ctx), old.intro(ctx), `${d.key} intro`);
            assert.deepEqual(d.kesimpulan(ctx), old.kesimpulan(ctx), `${d.key} kesimpulan`);
          }
          const text = [...d.intro(ctx), ...d.findings(ctx), d.kesimpulan(ctx).text].join(" ");
          assert.deepEqual(findForbiddenTerms("VKI", text), [], `${d.key}: ${text}`);
          compared++;
        }
      }
      assert.equal(compared, rows.length);
      assert.ok(compared >= 20, `only ${compared} documents compared`);
    });
  }

  it("chapters keep the VKI order and section texts", () => {
    const report = createSchemeReport({ verificationType: "VKI", payload, companyLocations: null })!;
    const categories = report.orderCategories([...new Set(items.map((i) => i.category))]);
    assert.deepEqual(categories, ["Legalitas Perusahaan", "Perpajakan", "Dokumen Lokasi", "Dokumen Pendukung VKI", "Tenaga Kerja", "Surat Pernyataan"]);
    assert.equal(report.compliance.section("Dokumen Lokasi")?.title, "Pemeriksaan Administratif Kepemilikan Bangunan");
    assert.equal(report.compliance.section("Dokumen Pendukung VKI")?.title, "Pemeriksaan Administratif Dokumen Pendukung VKI");
    assert.equal(report.label, "VKI");
  });
});
