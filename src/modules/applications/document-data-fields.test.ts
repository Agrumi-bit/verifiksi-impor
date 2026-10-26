import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ApplicationWizardValues } from "./schema";
import { applyDocumentDataToPayload, companyDocumentDataUpdate, documentDataFieldValues, parseDocumentData } from "./document-data-fields";

const payload = { sktNumber: "S-OLD", sktIssuer: "KPP Lama", sktDate: "2020-01-02" } as unknown as ApplicationWizardValues;

describe("document data re-entered with a new document version", () => {
  it("prefills from the live company value, then the payload", () => {
    const fields = documentDataFieldValues("skt", payload, { companyLegal: { sktNumber: "S-LIVE", sktDate: "2021-05-06T00:00:00.000Z" } });
    assert.deepEqual(fields.map((f) => [f.name, f.value]), [["sktNumber", "S-LIVE"], ["sktIssuer", "KPP Lama"], ["sktDate", "2021-05-06"]]);
    assert.deepEqual(documentDataFieldValues("tax-support:ppn", payload), []);
  });

  it("requires every field and a valid date", () => {
    assert.deepEqual(parseDocumentData("skt", { sktNumber: "S-NEW", sktIssuer: "", sktDate: "2026-10-01" }), { ok: false, error: "KPP Terdaftar wajib diisi" });
    assert.deepEqual(parseDocumentData("skt", { sktNumber: "S-NEW", sktIssuer: "KPP Baru", sktDate: "01/10/2026" }), { ok: false, error: "Tanggal Terdaftar tidak valid" });
  });

  it("writes the new values to the payload and the Company row", () => {
    const parsed = parseDocumentData("skt", { sktNumber: " S-NEW ", sktIssuer: "KPP Baru", sktDate: "2026-10-01", nibNumber: "ignored" });
    assert.ok(parsed.ok);
    const next = applyDocumentDataToPayload(payload, parsed.values, "skt");
    assert.equal(next.sktNumber, "S-NEW");
    assert.equal(next.sktDate, "2026-10-01");
    assert.equal((next as Record<string, unknown>).nibNumber, undefined);
    const company = companyDocumentDataUpdate("skt", parsed.values);
    assert.equal(company.sktIssuer, "KPP Baru");
    assert.equal((company.sktDate as Date).toISOString(), "2026-10-01T00:00:00.000Z");
  });

  it("VKI surat pernyataan: fields live on its vkiSupportDocs entry only", () => {
    const sp = { vkiSupportDocs: [{ key: "memiliki-menguasai", nomorSurat: "SP-1", tanggal: "2026-01-02", penandatangan: "Budi", documentPath: "a.pdf" }, { key: "kebenaran-data", nomorSurat: "SP-9" }] } as unknown as ApplicationWizardValues;
    const key = "vki-support:memiliki-menguasai";
    assert.deepEqual(documentDataFieldValues(key, sp, { companyLegal: { sktNumber: "x" } }).map((f) => f.value), ["SP-1", "2026-01-02", "Budi"]);
    const parsed = parseDocumentData(key, { nomorSurat: "SP-2", tanggal: "2026-10-05", penandatangan: "Sari" });
    assert.ok(parsed.ok);
    const next = applyDocumentDataToPayload(sp, parsed.values, key);
    assert.deepEqual(next.vkiSupportDocs?.[0], { key: "memiliki-menguasai", nomorSurat: "SP-2", tanggal: "2026-10-05", penandatangan: "Sari", documentPath: "a.pdf" });
    assert.equal(next.vkiSupportDocs?.[1].nomorSurat, "SP-9");
    assert.equal((next as Record<string, unknown>).nomorSurat, undefined);
    assert.deepEqual(companyDocumentDataUpdate(key, parsed.values), {});
  });

  it("Surat Pernyataan Tenaga Kerja: re-enters the whole per-kategori list", () => {
    const key = "vki-support:tenaga-kerja";
    const p = { tenagaKerjaEntries: [{ id: "t1", kategori: "Produksi", jumlah: "40" }] } as unknown as ApplicationWizardValues;
    const [field] = documentDataFieldValues(key, p);
    assert.equal(field.type, "rows");
    assert.deepEqual(JSON.parse(field.value), [{ kategori: "Produksi", jumlah: "40" }]);
    assert.deepEqual(parseDocumentData(key, { tenagaKerjaEntries: "[]" }), { ok: false, error: "Jumlah Tenaga Kerja per Kategori wajib diisi" });
    assert.deepEqual(parseDocumentData(key, { tenagaKerjaEntries: JSON.stringify([{ kategori: "Kantor", jumlah: "" }]) }), {
      ok: false,
      error: "Jumlah Tenaga Kerja per Kategori: lengkapi setiap baris",
    });
    const parsed = parseDocumentData(key, {
      tenagaKerjaEntries: JSON.stringify([{ kategori: " Produksi ", jumlah: "1.250" }, { kategori: "", jumlah: "" }, { kategori: "Kantor", jumlah: "12" }]),
    });
    assert.ok(parsed.ok);
    const next = applyDocumentDataToPayload(p, parsed.values, key);
    assert.equal(next.tenagaKerjaEntries?.length, 2);
    assert.deepEqual(next.tenagaKerjaEntries?.[0], { id: "t1", kategori: "Produksi", jumlah: "1250" });
    assert.equal(next.tenagaKerjaEntries?.[1].kategori, "Kantor");
    assert.ok(next.tenagaKerjaEntries?.[1].id);
  });

  it("location, listrik, LHVKI mitra and modal kerja keep their data on their own entry", () => {
    const p = {
      locations: [{ id: "L1", leaseOriginalOwnerName: "Lama", leaseStartDate: "2024-01-01", leaseEndDate: "2025-01-01" }],
      electricityMonths: [{ id: "m1", bulan: "2026-07", nominal: "100", kwh: "5" }],
      partnerIndustriEntries: [{ partnerId: "P1", enabled: true, lhvki: "OLD" }],
      nonIndustriDocuments: [{ key: "surat-pernyataan-modal-kerja", enabled: true, amount: "1000" }],
    } as unknown as ApplicationWizardValues;
    const lease = "location:L1:lease:SEWA_MENYEWA";
    assert.deepEqual(documentDataFieldValues(lease, p, { companyLocations: [{ id: "L1", leaseOriginalOwnerName: "Live" }] })[0].value, "Live");
    const leaseData = parseDocumentData(lease, { leaseOriginalOwnerName: "Baru", leaseStartDate: "2026-01-01", leaseEndDate: "2028-01-01" });
    assert.ok(leaseData.ok);
    assert.equal(applyDocumentDataToPayload(p, leaseData.values, lease).locations?.[0].leaseEndDate, "2028-01-01");
    assert.deepEqual(companyDocumentDataUpdate(lease, leaseData.values), {});
    assert.deepEqual(parseDocumentData("location:L1:warehouseRegistration", { warehouseRegistrationType: "X", warehouseRegistrationNumber: "1", warehouseRegistrationIssueDate: "2026-01-01", warehouseRegistrationIssuingAuthority: "Dinas" }), { ok: false, error: "Jenis Tanda Daftar tidak valid" });
    const bill = parseDocumentData("vki-support:listrik:m1", { bulan: "2026-08", nominal: "Rp 1.250.000", kwh: "900" });
    assert.ok(bill.ok);
    assert.equal(applyDocumentDataToPayload(p, bill.values, "vki-support:listrik:m1").electricityMonths?.[0].nominal, "1250000");
    const lhvki = parseDocumentData("partner:P1:lhvki", { lhvki: "NEW-1" });
    assert.ok(lhvki.ok);
    assert.equal(applyDocumentDataToPayload(p, lhvki.values, "partner:P1:lhvki").partnerIndustriEntries?.[0].lhvki, "NEW-1");
    const modal = parseDocumentData("nonindustri-support:surat-pernyataan-modal-kerja", { amount: "2.000.000" });
    assert.ok(modal.ok);
    assert.equal(applyDocumentDataToPayload(p, modal.values, "nonindustri-support:surat-pernyataan-modal-kerja").nonIndustriDocuments?.[0].amount, "2000000");
    for (const k of ["tax-support:ppn", "location:L1:ownership:SHM", "nonindustri-support:rekening-koran", "partner:P1:contract"]) assert.deepEqual(documentDataFieldValues(k, p), [], k);
  });
});
