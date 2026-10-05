import { internalLvi, pasal } from "../shared/legal";
import { viuLegalBasis } from "../shared/viu-legal";

const base = viuLegalBasis({ huruf: "a", reportAyat: "(3)", warehouseLeaseMinimum: "2 (dua) tahun" });

/** Permenperin 27/2025 references for VIU Bahan Baku Industri (Ps 26 a, 37 (2) a, 38, 39 (3)). */
export const VIU_INDUSTRI_LEGAL_BASIS = {
  ...base,
  kontrakIndustri: pasal(base.doc("f"), "Kontrak kerja sama dan/atau kontrak jual beli bahan baku dan/atau bahan penolong dengan Perusahaan Industri, masa perjanjian paling singkat 1 (satu) tahun"),
  lhvkiMitra: pasal(base.doc("g"), "LHVKI Perusahaan Industri yang melakukan kontrak kerja sama dan/atau kontrak jual beli"),
  identitasMitra: pasal("Pasal 39 ayat (3) huruf c", "Identitas Perusahaan Industri mitra (nama, alamat kantor, alamat pabrik, NIB, KBLI, nomor LHVKI) dimuat dalam LHVIU"),
  dokumenMitraPendukung: internalLvi("Tidak dipersyaratkan Pasal 37 ayat (2) huruf a; diperiksa sebagai pendukung identitas Perusahaan Industri mitra"),
  modalKerja: internalLvi("Tidak dipersyaratkan Pasal 37 ayat (2) huruf a; ditetapkan sebagai persyaratan internal Lembaga Pelaksana Verifikasi"),
  buktiFinansial: internalLvi("Bukti kemampuan finansial pendukung Surat Pernyataan Kepemilikan Modal Kerja — cukup salah satu"),
} as const;
