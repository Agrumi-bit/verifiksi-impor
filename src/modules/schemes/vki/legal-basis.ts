import { internalLvi, pasal, terkait } from "../shared/legal";

/** Permenperin 27/2025 references for VKI. Confirmed against the regulation text (Ps 25, 30–32). */
export const VKI_LEGAL_BASIS = {
  subject: pasal("Pasal 25", "VKI dilakukan terhadap Perusahaan API-P atau Perusahaan Industri yang memiliki kontrak kerja sama dan/atau kontrak jual beli bahan baku dan/atau bahan penolong dengan Perusahaan API-U"),
  requirement: pasal("Pasal 30 ayat (2)"),
  dataProduksi: pasal("Pasal 30 ayat (2) huruf a angka 1 sampai dengan angka 6"),
  npwp: pasal("Pasal 30 ayat (2) huruf b angka 1"),
  perizinanBerusaha: pasal("Pasal 30 ayat (2) huruf b angka 2"),
  kbli: pasal("Pasal 30 ayat (2) huruf b angka 2", "KBLI dan bidang usaha dimuat dalam LHVKI — Pasal 32 ayat (3) huruf b"),
  tenagaKerja: pasal("Pasal 30 ayat (2) huruf b angka 3"),
  mesin: pasal("Pasal 30 ayat (2) huruf b angka 4"),
  alurProses: pasal("Pasal 30 ayat (2) huruf b angka 5"),
  spGudangLimbah: pasal("Pasal 30 ayat (2) huruf b angka 6 jo. ayat (3)", "Format Lampiran II huruf G"),
  pajak: pasal("Pasal 30 ayat (2) huruf b angka 7", "Bukti pembayaran pajak 3 (tiga) tahun terakhir, atau SKT bagi Perusahaan Industri dengan Perizinan Berusaha kurang dari 3 (tiga) tahun"),
  listrik: pasal("Pasal 30 ayat (2) huruf b angka 8", "Bukti pembayaran listrik 3 (tiga) bulan sebelumnya"),
  spTidakDiperjualbelikan: terkait("Pasal 8 ayat (2) huruf a angka 2 huruf c)", "Persyaratan permohonan Pertimbangan Teknis bagi Perusahaan API-P (format Lampiran II huruf A); dikumpulkan sebagai pendukung VKI"),
  spKebenaranData: terkait("Pasal 8 ayat (2) huruf a angka 2 huruf d)", "Persyaratan permohonan Pertimbangan Teknis (format Lampiran II huruf D); dikumpulkan sebagai pendukung VKI"),
  akta: internalLvi("Tidak dipersyaratkan Pasal 30 ayat (2); diperiksa sebagai pendukung identitas perusahaan yang dimuat LHVKI (Pasal 32 ayat (3) huruf b)"),
  lapangan: pasal("Pasal 31 ayat (2) huruf a", "Penilaian kesesuaian data dan dokumen dengan kondisi di lapangan"),
  verification: pasal("Pasal 31"),
  reportContent: pasal("Pasal 32 ayat (3)"),
  validity: pasal("Pasal 32 ayat (4)"),
} as const;
