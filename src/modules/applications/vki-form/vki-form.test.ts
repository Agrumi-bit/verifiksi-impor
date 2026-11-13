import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { writeFileSync } from "node:fs";
import { inflateRawSync } from "node:zlib";

import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildVkiForm, fileNameOf, fmtNum, mergeLhvki, tanggalId } from "./model";
import { vkiFormToDocx } from "./docx.server";

const payload = {
  verificationType: "VKI",
  applicationCategory: "NEW",
  importTypes: [],
  companyName: "PT Contoh Industri",
  companyEmail: "info@contoh.id",
  companyPhone: "021123",
  contactFullName: "Budi",
  contactDesignation: "Direktur",
  contactPhone: "0812",
  contactEmail: "budi@contoh.id",
  nibNumber: "1302240025894",
  npwpNumber: "04.696.877.2-063.000",
  kbliEntries: [{ code: "24202", description: "Industri Prekursor", category: "UTAMA" }],
  companyAge: "UNDER_3",
  sktNumber: "S-1/2026",
  sktDocumentPath: "uploads/a/1712345678901-07 TERDAFTAR PAJAK.pdf",
  locations: [
    { id: "k", locationType: "KANTOR", address: "Jl. Mega Kuningan 1", addressDesa: "Kuningan Timur", addressKecamatan: "Setiabudi", city: "Kota Jakarta Selatan", province: "DKI Jakarta", buildingStatus: "SEWA" },
    { id: "p", locationType: "PABRIK", address: "Kawasan Industri Weda Bay", city: "Halmahera Tengah", province: "Maluku Utara", buildingStatus: "MILIK_SENDIRI" },
    { id: "g", locationType: "GUDANG", address: "Gudang 1", city: "Halmahera Tengah", province: "Maluku Utara" },
  ],
  products: [{ id: "pr1", materialType: "Nickel Cobalt Manganese", hsCode: "2853.90.90" }],
  capacity: [{ id: "c1", productId: "pr1", jenisProduk: "Prekursor", kbliCode: "24202", berdasarkanIzin: "50000", kapasitasTerpasang: "50000", satuan: "ton" }],
  productionQty: [{ productId: "pr1", perTahunSebelumnya: "4001.83", perTahunRencana: "7000", satuan: "ton" }],
  machines: [{ id: "m1", nama: "Reaction kettle <A&B>", merk: "Sichuan", model: "X1", jumlah: "10", kapasitasJam: "137.6", kapasitasJamSatuan: "KGM", waktuBeroperasi: "24", kondisi: "AKTIF", tahun: "2025" }],
  rawMaterials: [{ id: "r1", jenis: "Filter Cloth", hsCode: "5911.40.00" }],
  rawMaterialConversions: [],
  rawMaterialUsage: [{ rawMaterialId: "r1", penggunaan: "100", dataStock: "0", rencanaKebutuhanDalamNegeri: "0", rencanaKebutuhanLuarNegeri: "150000", satuan: "Meter" }],
  sales: [{ productId: "pr1", dalamNegeri: "0", luarNegeri: "2.343", negaraTujuan: "Korea Selatan, Amerika Serikat", satuan: "TNE" }],
  vkiSupportDocs: [{ key: "alur-proses", documentPath: "uploads/x/05.ALUR PRODUKSI.pdf" }],
  electricityMonths: [{ id: "e1", bulan: "2026-04", kwh: "4196298", nominal: "4923390554", documentPath: "uploads/x/listrik-apr.pdf" }],
  tenagaKerjaEntries: [{ id: "t1", kategori: "Produksi", jumlah: "120" }, { id: "t2", kategori: "Admin", jumlah: "14" }],
} as unknown as ApplicationWizardValues;

describe("Formulir Permohonan VKI", () => {
  const form = buildVkiForm({ payload, applicationNumber: "APP-VKI-1", submissionDate: "2026-07-16T00:00:00.000Z", lhvki: [{ number: "595/LHVKI", issuedAt: "2026-04-24", issuer: "PT Tribhakti Inspektama" }] });

  it("fills A. Data Pemohon from the payload", () => {
    const a = form.blocks.find((b) => b.kind === "fields");
    assert.ok(a && a.kind === "fields");
    const map = Object.fromEntries(a.rows);
    assert.equal(map["1. Nama Perusahaan"], "PT Contoh Industri");
    assert.equal(map["14. Jumlah Tenaga Kerja (semester tahun berjalan)"], "134 orang");
    assert.equal(map["7. Fasilitas Kepabeanan"], "—");
    assert.match(map["15. Rekam jejak LHVKI sebelumnya"], /^☒ Pernah/);
  });

  it("has every section A–G and the lampiran", () => {
    const headings = form.blocks.filter((b) => b.kind === "heading").map((b) => (b.kind === "heading" ? b.text.slice(0, 2) : ""));
    assert.deepEqual(headings, ["A.", "B.", "C.", "D.", "E.", "F.", "G.", "LA"]);
  });

  it("machine capacity per day is for one machine", () => {
    const t = form.blocks.find((b) => b.kind === "table" && b.headers[1] === "Jenis Mesin");
    assert.ok(t && t.kind === "table");
    assert.equal(t.rows[0][5], fmtNum(String(137.6 * 24)));
    assert.equal(t.rows[0][7], "Aktif");
  });

  it("merges declared LHVKI (with document) and issued ones", () => {
    const merged = mergeLhvki([{ number: "595/LHVKI", issuedAt: "2026-04-24", issuer: "PT Tribhakti Inspektama" }, { number: "700/LHVKI", issuedAt: "2026-05-01", issuer: "PT Tribhakti Inspektama" }], {
      ...payload,
      hasPreviousLhvki: true,
      lhvkiHistory: [{ id: "l1", nomor: "595/lhvki", tanggalTerbit: "2026-04-24", masaBerlaku: "2027-04-24", lembagaPenerbit: "PT Surveyor Indonesia", documentPath: "temporary/c5572408-459e-459b-832b-33710ba31315-LHVKI.pdf" }],
    } as ApplicationWizardValues);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].issuer, "PT Surveyor Indonesia");
    assert.equal(merged[0].validUntil, "2027-04-24");
    assert.equal(mergeLhvki([], { ...payload, hasPreviousLhvki: false, lhvkiHistory: [{ id: "x", nomor: "1" }] } as ApplicationWizardValues).length, 0);
  });

  it("gudang rows follow the Surat Pernyataan Memiliki/Menguasai Gudang declaration", () => {
    const rowsOf = (p: ApplicationWizardValues) => {
      const f = buildVkiForm({ payload: p, applicationNumber: "APP-VKI-2", submissionDate: "2026-07-16T00:00:00.000Z", lhvki: [] });
      const b = f.blocks.filter((x) => x.kind === "fields")[1];
      assert.ok(b && b.kind === "fields");
      const map = Object.fromEntries(b.rows.map(([k, v]) => [k.replace(/^\d+\. /, ""), v]));
      return [map["Gudang Bahan Baku"], map["Gudang Barang Jadi / Hasil Produksi"]];
    };
    const noGudangLocation = { ...payload, locations: payload.locations.filter((l) => l.locationType !== "GUDANG") } as ApplicationWizardValues;
    const declared = {
      ...noGudangLocation,
      vkiSupportDocs: [{ key: "memiliki-menguasai", gudangBahanBaku: true, gudangHasilProduksi: false }],
    } as ApplicationWizardValues;
    assert.deepEqual(rowsOf(declared).map((v) => v.startsWith("\u2612")), [true, false]);
    assert.deepEqual(rowsOf(noGudangLocation).map((v) => v.startsWith("\u2612")), [false, false]);
    assert.deepEqual(rowsOf(payload).map((v) => v.startsWith("\u2612")), [true, true]);
  });

  it("helpers", () => {
    assert.equal(tanggalId("2026-07-16T00:00:00.000Z"), "16 Juli 2026");
    assert.equal(fileNameOf("uploads/a/1712345678901-07 TERDAFTAR PAJAK.pdf"), "07 TERDAFTAR PAJAK.pdf");
    assert.equal(fileNameOf("temporary/c5572408-459e-459b-832b-33710ba31315-SURAT_PERNYATAAN_VKI.pdf"), "SURAT_PERNYATAAN_VKI.pdf");
  });

  it("writes a valid .docx zip with escaped text", () => {
    const buf = vkiFormToDocx(form);
    assert.equal(buf.readUInt32LE(0), 0x04034b50);
    // Find word/document.xml and inflate it.
    let off = 0;
    let xml = "";
    while (buf.readUInt32LE(off) === 0x04034b50) {
      const size = buf.readUInt32LE(off + 18);
      const nameLen = buf.readUInt16LE(off + 26);
      const name = buf.subarray(off + 30, off + 30 + nameLen).toString();
      const data = buf.subarray(off + 30 + nameLen, off + 30 + nameLen + size);
      if (name === "word/document.xml") xml = inflateRawSync(data).toString("utf8");
      off += 30 + nameLen + size;
    }
    assert.ok(xml.includes("FORMULIR PERMOHONAN VERIFIKASI KEMAMPUAN INDUSTRI (VKI)"));
    assert.ok(xml.includes("Reaction kettle &lt;A&amp;B&gt;"));
    if (process.env.VKI_DOCX_OUT) writeFileSync(process.env.VKI_DOCX_OUT, buf);
  });
});
