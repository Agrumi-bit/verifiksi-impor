import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findForbiddenTerms } from "@/modules/schemes";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist } from "./schema";
import { createComplianceResolver } from "./scheme-compliance";
import { createSchemeReport } from "./scheme-report";
import type { NarrativeContext } from "./report-narrative";

/** Tahap 4 — VIU Bahan Baku Industri served end-to-end by src/modules/schemes. */
const payload = {
  verificationType: "VIU",
  importTypes: ["BAHAN_BAKU_INDUSTRI"],
  companyName: "PT BAHAN JAYA",
  nibNumber: "1234567890123",
  nibDocumentPath: "documents/nib.pdf",
  kbliDocumentPath: "documents/kbli.pdf",
  kbliEntries: [{ code: "46411", description: "Perdagangan Besar Tekstil", category: "UTAMA" }],
  npwpNumber: "01.234",
  npwpDocumentPath: "documents/npwp.pdf",
  companyAge: "OVER_3",
  locations: [
    { id: "L1", locationType: "KANTOR", buildingStatus: "SEWA", address: "Jl. A", leaseDocuments: [{ type: "SEWA_MENYEWA", documentPath: "d/sewa.pdf" }] },
    { id: "L2", locationType: "GUDANG", buildingStatus: "SEWA", address: "Jl. B", leaseDocuments: [{ type: "SEWA_MENYEWA", documentPath: "d/sewa2.pdf" }], warehouseRegistrationDocumentPath: "d/tdg.pdf" },
    { id: "L3", locationType: "PABRIK", buildingStatus: "MILIK_SENDIRI", address: "Jl. C", ownershipDocuments: [{ type: "SHM", documentPath: "d/shm2.pdf" }] },
  ],
  partnerIndustriEntries: [{ partnerId: "P1", enabled: true, lhvki: "12/LHVKI/TBI/IV/2026", lhvkiDocumentPath: "d/lhvki.pdf", contractDocumentPath: "d/kontrak.pdf" }],
  nonIndustriDocuments: [
    { key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "d/modal.pdf", amount: "900000000" },
    { key: "rekening-koran", enabled: true, documentPath: "d/rk.pdf" },
  ],
  vkiSupportDocs: [{ key: "memiliki-menguasai", documentPath: "d/sp.pdf" }],
  products: [{ id: "p1", materialType: "Benang", hsCode: "5402.33.00", partnerIndustriId: "P1" }],
  submissionDate: "2026-10-05",
} as unknown as ApplicationWizardValues;
const partners = [{ partnerId: "P1", companyName: "PT PABRIK MITRA", nibDocumentPath: "d/pnib.pdf", npwpDocumentPath: "d/pnpwp.pdf", skDocumentPath: null }];

describe("VIU Bahan Baku Industri checklist & report (scheme module)", () => {
  const items = buildDocumentChecklist(payload, null, partners, [], new Map());
  const keys = items.map((i) => i.key);

  it("lists the Perusahaan Industri mitra documents and the financial documents", () => {
    for (const k of ["partner:P1:contract", "partner:P1:nib", "partner:P1:npwp", "partner:P1:sk", "partner:P1:lhvki", "nonindustri-support:surat-pernyataan-modal-kerja", "nonindustri-support:rekening-koran"]) {
      assert.ok(keys.includes(k), k);
    }
  });

  it("hides documents no Industri rule asks for (VKI SP, Pabrik)", () => {
    assert.ok(!keys.includes("vki-support:memiliki-menguasai"));
    assert.ok(!keys.some((k) => k.startsWith("location:L3:")));
  });

  it("compliance cells cite Pasal 37 ayat (2) huruf a, never a VKI article", () => {
    const c = createComplianceResolver(payload);
    assert.equal(c.schemes?.[0], "VIU_BAHAN_BAKU_INDUSTRI");
    assert.match(c.def("npwp")!.referensi, /^Pasal 37 ayat \(2\) huruf a angka 2 huruf a\)/);
    assert.match(c.def("location:L2:lease:SEWA_MENYEWA")!.referensi, /huruf a angka 2 huruf d\)/);
    assert.match(c.def("partner:P1:lhvki")!.referensi, /huruf a angka 2 huruf g\)/);
    assert.equal(c.def("partner:P1:sk")!.persyaratan, "Pendukung");
    assert.equal(c.def("partner:P1:contract")!.persyaratan, "Wajib");
    assert.match(c.def("partner:P1:contract")!.referensi, /huruf a angka 2 huruf f\)/);
    for (const k of keys) assert.ok(!/Pasal 30/.test(c.def(k)?.referensi ?? ""), k);
    assert.deepEqual(c.sections().map((s) => s.category), ["Legalitas Perusahaan", "Perpajakan", "Dokumen Lokasi", "Dokumen Partner Industri", "Dokumen Pendukung"]);
  });

  it("report: mitra pages keep the partner name and LHVKI number, no VKI wording, one financial evidence", () => {
    const report = createSchemeReport({ verificationType: "VIU", payload, companyLocations: null })!;
    assert.ok(report);
    assert.equal(report.productChapter?.title, "Bahan Baku/Penolong yang Akan Diimpor");
    const rows = report.relevantRows(items.map((i) => ({ ...i, status: "VALID" })));
    const financial = rows.filter((r) => r.key.startsWith("nonindustri-support:") && r.key !== "nonindustri-support:surat-pernyataan-modal-kerja");
    assert.deepEqual(financial.map((r) => r.key), ["nonindustri-support:rekening-koran"]);
    assert.ok(!rows.some((r) => r.key === "partner:P1:sk"), "unuploaded pendukung printed");
    const ctx = {
      payload,
      company: "PT BAHAN JAYA",
      businessAddress: null,
      companyLegal: null,
      companyLocations: null,
      partners,
      documentStatuses: Object.fromEntries(rows.map((r) => [r.key, "VALID"])),
    } as unknown as NarrativeContext;
    const categories = report.orderCategories([...new Set(rows.map((r) => r.category))]);
    const all: string[] = [];
    for (const category of categories) {
      const docs = report.buildCategoryDocs(category, rows, ctx);
      assert.deepEqual(docs.map((d) => d.no), docs.map((_, i) => i + 1));
      for (const d of docs) {
        const text = [...d.intro(ctx), ...d.findings(ctx), d.kesimpulan(ctx).text].join(" ");
        assert.deepEqual(findForbiddenTerms("VIU_BAHAN_BAKU_INDUSTRI", text), [], `${d.key}: ${text}`);
        assert.ok(!text.includes("[BELUM DIATUR"), d.key);
        all.push(text);
      }
    }
    const joined = all.join(" ");
    assert.match(joined, /LHVKI PT PABRIK MITRA Nomor 12\/LHVKI\/TBI\/IV\/2026/);
    assert.match(joined, /paling singkat 2 \(dua\) tahun/);
    assert.match(joined, /menyampaikan kontrak dengan PT PABRIK MITRA/);
    assert.ok(!/Pasal 30/.test(joined));
  });
});
