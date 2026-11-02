import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { LAMPIRAN_CATALOG, beritaAcaraSchema, defaultLampiranOtomatis, lampiranList, roman, missingFields, nomorPlaceholder, parseBeritaAcara, schemeOf, tanggalPanjang, tanggalParts } from "./berita-acara";

const valid = {
  nomor: "BA/VKI/26/04/001",
  tanggal: "2026-04-15",
  tempat: "lokasi usaha perusahaan",
  kota: "Bandung",
  namaPerusahaan: "PT Tentac Label Indonesia",
  alamat: "Jln. Terusan Kopo Katapang No. 633",
  lembagaNama: "PT Tribhakti Inspektama",
  penandatanganNama: "",
  penandatanganJabatan: "",
  picNama: "",
  picJabatan: "",
  lampiranOtomatis: defaultLampiranOtomatis("VKI"),
  lampiranTambahan: [] as string[],
};

describe("Berita Acara Pelaksanaan", () => {
  it("prints the day, date, month and year of the template (Rabu 15 April 2026)", () => {
    assert.deepEqual(tanggalParts("2026-04-15"), { hari: "Rabu", tanggal: 15, bulan: "April", tahun: 2026 });
    assert.equal(tanggalPanjang("2026-04-15"), "15 April 2026");
    assert.equal(tanggalParts("2026-02-30"), null);
    assert.equal(tanggalPanjang(""), "");
  });

  it("suggests a nomor following BA/{skema}/{yy}/{mm}/001", () => {
    assert.equal(nomorPlaceholder("VKI", "2026-04-15"), "BA/VKI/26/04/001");
    assert.equal(nomorPlaceholder("VIU", "2025-11-03"), "BA/VIU/25/11/001");
  });

  it("lists the selected system lampiran in catalog order, then the extra lines, numbered I, II, …", () => {
    const list = lampiranList("VKI", { lampiranOtomatis: ["mesin", "registrasi"], lampiranTambahan: ["Foto kegiatan"] });
    assert.deepEqual(list.map((l) => l.title), ["Form Registrasi VKI", "Form Daftar Mesin", "Foto kegiatan"]);
    assert.equal(list[2].def, null);
    assert.equal(roman(8), "VIII");
    assert.deepEqual(LAMPIRAN_CATALOG.VIU.map((l) => l.key), ["opening", "registrasi", "hadir", "bak", "produk", "lokasi"]);
  });

  it("maps every non-VKI application to the VIU wording", () => {
    assert.equal(schemeOf("VKI"), "VKI");
    assert.equal(schemeOf("VIU"), "VIU");
  });

  it("validates the saved document and reports what the print still needs", () => {
    assert.ok(beritaAcaraSchema.safeParse(valid).success);
    assert.equal(beritaAcaraSchema.safeParse({ ...valid, tanggal: "15/04/2026" }).success, false);
    assert.deepEqual(missingFields(valid), []);
    assert.deepEqual(missingFields({ ...valid, nomor: "", kota: "" }), ["Nomor", "Kota penandatanganan"]);
  });

  it("reads a stored row back with its audit fields, and rejects junk", () => {
    const row = parseBeritaAcara({ ...valid, updatedAt: "2026-11-02T00:00:00.000Z", updatedByName: "Fajar Ramadhan" });
    assert.equal(row?.updatedByName, "Fajar Ramadhan");
    assert.equal(row?.lampiranOtomatis.length, 8);
    assert.equal(parseBeritaAcara(null), null);
    assert.equal(parseBeritaAcara({ nomor: 3 }), null);
  });
});
