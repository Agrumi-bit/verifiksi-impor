import { internalLvi, pasal } from "../shared/legal";
import { viuLegalBasis } from "../shared/viu-legal";

const base = viuLegalBasis({ huruf: "b", reportAyat: "(4)", warehouseLeaseMinimum: "1 (satu) tahun" });

/** Permenperin 27/2025 references for VIU Bahan Baku Non Industri (Ps 26 b, 37 (2) b, 38, 39 (4)). */
export const VIU_NON_INDUSTRI_LEGAL_BASIS = {
  ...base,
  kontrakNonIndustri: pasal(base.doc("f"), "Kontrak kerja sama dan/atau kontrak jual beli bahan baku dan/atau bahan penolong dengan Perusahaan Non Industri, masa perjanjian paling singkat 1 (satu) tahun"),
  identitasMitra: pasal("Pasal 39 ayat (4) huruf c", "Identitas Perusahaan Non Industri mitra (nama, alamat, NIB, KBLI) dimuat dalam LHVIU"),
  modalKerja: internalLvi("Tidak dipersyaratkan Pasal 37 ayat (2) huruf b; ditetapkan sebagai persyaratan internal Lembaga Pelaksana Verifikasi"),
  buktiFinansial: internalLvi("Bukti kemampuan finansial pendukung Surat Pernyataan Kepemilikan Modal Kerja — cukup salah satu"),
} as const;
