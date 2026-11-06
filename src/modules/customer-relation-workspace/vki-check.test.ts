import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildVkiCheck, parseCrDataCheck, vkiCheckConclusion, vkiCheckDeficiencies, type CheckDoc } from "./vki-check";

const payload = {
  verificationType: "VKI",
  companyName: "PT Contoh",
  companyApiType: "API-P",
  nibNumber: "123",
  npwpNumber: "01.234",
  contactFullName: "Budi",
  contactDesignation: "Direktur",
  kbliEntries: [{ code: "13111", description: "Tekstil" }],
  companyAge: "OVER_3",
  locations: [
    { id: "k", locationType: "KANTOR", address: "Jl. A", city: "Bandung", province: "Jawa Barat" },
    { id: "p", locationType: "PABRIK", address: "Jl. B", city: "Bandung", province: "Jawa Barat" },
  ],
  machines: [{ id: "m", nama: "Mesin tenun" }],
  productionQty: [{ productId: "x", perTahunSebelumnya: "100", perTahunRencana: "120", satuan: "ton" }],
  rawMaterialUsage: [{ rawMaterialId: "r", penggunaan: "50", dataStock: "10", rencanaKebutuhanLuarNegeri: "60" }],
  rawMaterialConversions: [],
  sales: [{ productId: "x", dalamNegeri: "90", luarNegeri: "0" }],
  electricityMonths: [{ id: "e1", bulan: "2026-08", kwh: "1000", nominal: "2000000" }],
  taxProofs: [{ year: "2025", type: "spt", docPath: "a/spt.pdf" }],
} as unknown as ApplicationWizardValues;

const doc = (key: string, over: Partial<CheckDoc> = {}): CheckDoc => ({ key, label: key, documentPath: `${key}.pdf`, lengkap: true, status: "VALID", rejectionNote: "", requestNote: "", ...over });

describe("Form Pemeriksaan Kelengkapan VKI", () => {
  const documents = [doc("npwp"), doc("nib"), doc("vki-support:tenaga-kerja"), doc("vki-support:alur-proses", { documentPath: null, lengkap: false, status: "PENDING" }), doc("vki-support:memiliki-menguasai"), doc("tax-proof-summary"), doc("vki-support:listrik:e1", { status: "REJECTED", rejectionNote: "buram" })];
  const c = buildVkiCheck({ payload, applicationNumber: "APP-1", submissionDate: "2026-09-01T00:00:00Z", category: "NEW", documents, lhvki: [], saved: parseCrDataCheck({ items: { "1": { sesuai: "TIDAK_SESUAI", note: "kapasitas tidak wajar" } } }) });

  it("reads data presence from the application", () => {
    const ada = Object.fromEntries(c.dataRows.map((r) => [r.key, r.ada]));
    assert.deepEqual(ada, { "1": true, "2a": true, "2b": true, "3": false, "4a": true, "4b": true, "5": true, "6": true });
  });
  it("defaults the Pasal 25 basis from API-P", () => assert.equal(c.check.dasarKewajiban, "API_P"));
  it("maps documents to Pasal 30 ayat (2) huruf b rows", () => {
    const row = (k: string) => c.docRows.find((r) => r.key === k)!;
    assert.equal(row("5").ada, false);
    assert.equal(row("8").checkStatus, "REJECTED");
    assert.equal(c.electricity[0].sesuai, false);
  });
  it("lists deficiencies and concludes LENGKAPI", () => {
    const d = vkiCheckDeficiencies(c).map((x) => x.item);
    assert.ok(d.some((x) => x.startsWith("Data B.1 ")));
    assert.ok(d.some((x) => x.startsWith("Data B.3 ")));
    assert.ok(d.some((x) => x.startsWith("Dokumen C.5 ")));
    assert.ok(d.some((x) => x.startsWith("Dokumen C.8 ")));
    const k = vkiCheckConclusion(c);
    assert.equal(k.dataLengkap, false);
    assert.equal(k.konsisten, false);
    assert.equal(k.tindakLanjut, "LENGKAPI");
  });
});
