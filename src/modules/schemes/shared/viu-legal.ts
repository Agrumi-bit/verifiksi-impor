import { internalLvi, pasal } from "./legal";
import type { LegalBasis } from "../types";

/**
 * Builds the Permenperin 27/2025 references shared in SHAPE by the three VIU schemes. Each
 * scheme passes its own huruf of Pasal 26 / Pasal 37 ayat (2) and its own Pasal 39 ayat, so the
 * resulting citations are always scheme-specific (never a VKI article, never another VIU huruf).
 *
 *   Bahan Baku Industri     → Ps 26 huruf a, Ps 37 (2) huruf a, Ps 39 (3)
 *   Bahan Baku Non Industri → Ps 26 huruf b, Ps 37 (2) huruf b, Ps 39 (4)
 *   Barang Konsumsi         → Ps 26 huruf c, Ps 37 (2) huruf c, Ps 39 (5)
 */
export function viuLegalBasis(opts: {
  huruf: "a" | "b" | "c";
  reportAyat: "(3)" | "(4)" | "(5)";
  warehouseLeaseMinimum: string;
}) {
  const doc = (h: string) => `Pasal 37 ayat (2) huruf ${opts.huruf} angka 2 huruf ${h})`;
  const identity = `Pasal 39 ayat ${opts.reportAyat} huruf b`;
  return {
    subject: pasal(`Pasal 26 huruf ${opts.huruf}`),
    requirement: pasal(`Pasal 37 ayat (2) huruf ${opts.huruf}`),
    data: pasal(`Pasal 37 ayat (2) huruf ${opts.huruf} angka 1`),
    doc,
    npwp: pasal(doc("a")),
    perizinanBerusaha: pasal(doc("b"), "Perizinan Berusaha di bidang perdagangan besar dengan KBLI yang ditetapkan"),
    kbli: pasal(`${doc("b")} jo. Pasal 38 ayat (2) huruf b`, "Kesesuaian KBLI Perusahaan API-U dengan pos tarif/HS yang akan diimpor"),
    kantor: pasal(doc("c"), "Bukti kepemilikan atau perjanjian sewa kantor fisik dengan sisa waktu sewa paling singkat 1 (satu) tahun"),
    gudang: pasal(doc("d"), `Bukti kepemilikan atau perjanjian sewa gudang dengan jangka waktu sewa paling singkat ${opts.warehouseLeaseMinimum}`),
    tandaDaftarGudang: pasal(doc("e"), "Tanda daftar gudang atau SK penetapan gudang berikat / tempat penimbunan sementara"),
    layoutGudang: internalLvi("Tidak dipersyaratkan Pasal 37 ayat (2); digunakan untuk penilaian kesesuaian gudang dengan kondisi di lapangan (Pasal 38 ayat (3))"),
    akta: internalLvi(`Tidak dipersyaratkan Pasal 37 ayat (2); diperiksa sebagai pendukung identitas Perusahaan API-U yang dimuat LHVIU (${identity})`),
    pajak: internalLvi("Pasal 37 ayat (2) hanya mensyaratkan NPWP; bukti pembayaran pajak / SKT diperiksa sebagai dokumen pendukung"),
    verification: pasal("Pasal 38"),
    reportContent: pasal(`Pasal 39 ayat ${opts.reportAyat}`),
    validity: pasal("Pasal 39 ayat (6)"),
  } satisfies Record<string, LegalBasis | ((h: string) => string)>;
}

export type ViuLegalBasis = ReturnType<typeof viuLegalBasis>;
