import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findForbiddenTerms } from "@/modules/schemes";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist } from "./schema";
import { createComplianceResolver } from "./scheme-compliance";
import { createSchemeReport } from "./scheme-report";
import type { NarrativeContext } from "./report-narrative";

/** Tahap 3 — VIU Bahan Baku Non Industri served end-to-end by src/modules/schemes. */
const payload = {
  verificationType: "VIU",
  importTypes: ["BAHAN_BAKU_NON_INDUSTRI"],
  companyName: "PT NIAGA BAHAN",
  nibNumber: "1234567890123",
  nibDocumentPath: "documents/nib.pdf",
  kbliDocumentPath: "documents/kbli.pdf",
  kbliEntries: [{ code: "46414", description: "Perdagangan Besar Barang Lainnya Dari Tekstil", category: "UTAMA" }],
  npwpNumber: "01.234",
  npwpDocumentPath: "documents/npwp.pdf",
  companyAge: "OVER_3",
  locations: [
    { id: "L1", locationType: "KANTOR", buildingStatus: "SEWA", address: "Jl. A", leaseDocuments: [{ type: "SEWA_MENYEWA", documentPath: "d/sewa.pdf" }] },
    { id: "L2", locationType: "GUDANG", buildingStatus: "SEWA", address: "Jl. B", leaseDocuments: [{ type: "SEWA_MENYEWA", documentPath: "d/sewa2.pdf" }], warehouseRegistrationDocumentPath: "d/tdg.pdf" },
    { id: "L3", locationType: "PABRIK", buildingStatus: "MILIK_SENDIRI", address: "Jl. C", ownershipDocuments: [{ type: "SHM", documentPath: "d/shm2.pdf" }] },
  ],
  nonIndustriDocuments: [
    { key: "surat-pernyataan-modal-kerja", enabled: true, documentPath: "d/modal.pdf", amount: "900000000" },
    { key: "laporan-keuangan", enabled: true, documentPath: "d/lk.pdf" },
  ],
  vkiSupportDocs: [{ key: "memiliki-menguasai", documentPath: "d/sp.pdf" }],
  products: [{ id: "p1", materialType: "Kain", hsCode: "5208.11.00" }],
  submissionDate: "2026-10-05",
} as unknown as ApplicationWizardValues;

describe("VIU Bahan Baku Non Industri checklist & report (scheme module)", () => {
  const items = buildDocumentChecklist(payload, null, [], [], new Map());
  const keys = items.map((i) => i.key);

  it("hides documents no Non Industri rule asks for (VKI SP, Pabrik)", () => {
    assert.ok(keys.includes("nonindustri-support:surat-pernyataan-modal-kerja"));
    assert.ok(!keys.includes("vki-support:memiliki-menguasai"));
    assert.ok(!keys.some((k) => k.startsWith("location:L3:")));
  });

  it("compliance cells cite Pasal 37 ayat (2) huruf b, never a VKI article", () => {
    const c = createComplianceResolver(payload);
    assert.equal(c.schemes?.[0], "VIU_BAHAN_BAKU_NON_INDUSTRI");
    assert.match(c.def("npwp")!.referensi, /^Pasal 37 ayat \(2\) huruf b angka 2 huruf a\)/);
    assert.match(c.def("location:L2:lease:SEWA_MENYEWA")!.referensi, /huruf b angka 2 huruf d\)/);
    assert.equal(c.def("nonindustri-support:laporan-keuangan")!.persyaratan, "Wajib — pilih salah satu");
    for (const k of keys) assert.ok(!/Pasal 30/.test(c.def(k)?.referensi ?? ""), k);
  });

  it("report: gudang lease 1 year, one financial evidence, no VKI wording", () => {
    const report = createSchemeReport({ verificationType: "VIU", payload, companyLocations: null })!;
    assert.ok(report);
    assert.equal(report.productChapter?.title, "Bahan Baku/Penolong yang Akan Diimpor");
    const rows = report.relevantRows(items.map((i) => ({ ...i, status: "VALID" })));
    const financial = rows.filter((r) => r.key.startsWith("nonindustri-support:") && r.key !== "nonindustri-support:surat-pernyataan-modal-kerja");
    assert.deepEqual(financial.map((r) => r.key), ["nonindustri-support:laporan-keuangan"]);
    const ctx = {
      payload,
      company: "PT NIAGA BAHAN",
      businessAddress: null,
      companyLegal: null,
      companyLocations: null,
      partners: [],
      documentStatuses: Object.fromEntries(rows.map((r) => [r.key, "VALID"])),
    } as unknown as NarrativeContext;
    const all: string[] = [];
    for (const category of report.orderCategories([...new Set(rows.map((r) => r.category))])) {
      const docs = report.buildCategoryDocs(category, rows, ctx);
      assert.deepEqual(docs.map((d) => d.no), docs.map((_, i) => i + 1));
      for (const d of docs) {
        const text = [...d.intro(ctx), ...d.findings(ctx), d.kesimpulan(ctx).text].join(" ");
        assert.deepEqual(findForbiddenTerms("VIU_BAHAN_BAKU_NON_INDUSTRI", text), [], `${d.key}: ${text}`);
        assert.ok(!text.includes("[BELUM DIATUR"), d.key);
        all.push(text);
      }
    }
    const joined = all.join(" ");
    assert.match(joined, /gudang dengan jangka waktu sewa paling singkat 1 \(satu\) tahun/);
    assert.match(joined, /Pasal 39 ayat \(4\)/);
    assert.ok(!/Pasal 30|Pasal 39 ayat \(3\)|Pasal 37 ayat \(2\) huruf a/.test(joined));
  });
});
