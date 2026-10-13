import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ApplicationWizardValues } from "./schema";
import { applyDocumentDataToPayload, companyDocumentDataUpdate, documentDataFieldValues, parseDocumentData } from "./document-data-fields";

const payload = { sktNumber: "S-OLD", sktIssuer: "KPP Lama", sktDate: "2020-01-02" } as unknown as ApplicationWizardValues;

describe("document data re-entered with a new document version", () => {
  it("prefills from the live company value, then the payload", () => {
    const fields = documentDataFieldValues("skt", payload, { sktNumber: "S-LIVE", sktDate: "2021-05-06T00:00:00.000Z" });
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
    assert.deepEqual(documentDataFieldValues(key, sp, { sktNumber: "x" }).map((f) => f.value), ["SP-1", "2026-01-02", "Budi"]);
    assert.deepEqual(documentDataFieldValues("vki-support:tenaga-kerja", sp), []);
    const parsed = parseDocumentData(key, { nomorSurat: "SP-2", tanggal: "2026-10-05", penandatangan: "Sari" });
    assert.ok(parsed.ok);
    const next = applyDocumentDataToPayload(sp, parsed.values, key);
    assert.deepEqual(next.vkiSupportDocs?.[0], { key: "memiliki-menguasai", nomorSurat: "SP-2", tanggal: "2026-10-05", penandatangan: "Sari", documentPath: "a.pdf" });
    assert.equal(next.vkiSupportDocs?.[1].nomorSurat, "SP-9");
    assert.equal((next as Record<string, unknown>).nomorSurat, undefined);
    assert.deepEqual(companyDocumentDataUpdate(key, parsed.values), {});
  });
});
