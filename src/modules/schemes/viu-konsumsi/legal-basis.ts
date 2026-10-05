import { internalLvi, pasal } from "../shared/legal";
import { viuLegalBasis } from "../shared/viu-legal";

const base = viuLegalBasis({ huruf: "c", reportAyat: "(5)", warehouseLeaseMinimum: "1 (satu) tahun" });

/** Permenperin 27/2025 references for VIU Barang Konsumsi (Ps 26 c, 37 (2) c & (3)–(9), 38, 39 (5)). */
export const VIU_KONSUMSI_LEGAL_BASIS = {
  ...base,
  merek: pasal(base.doc("f"), "Sertifikat merek sesuai kelas merek; tanda pendaftaran merek / merek internasional dapat menggantikan selama 9 (sembilan) bulan — Pasal 37 ayat (6) dan ayat (7)"),
  ujiMutu: pasal(base.doc("g"), "Untuk setiap merek per komoditas atau subkomoditas, diajukan paling lama 6 (enam) bulan sejak tanggal diterbitkan"),
  label: pasal(`${base.doc("h")} jo. Pasal 37 ayat (9)`, "Format Lampiran II huruf H, disertai dokumentasi label produk"),
  labelDokumentasi: pasal(base.doc("h"), "Dokumentasi label produk berbahasa Indonesia"),
  modalKerja: pasal(`${base.doc("i")} jo. Pasal 37 ayat (9)`, "Format Lampiran II huruf I"),
  buktiFinansialPendukung: internalLvi("Dokumen pendukung Surat Pernyataan Kepemilikan Modal Kerja"),
  penunjukanPerwakilanResmi: pasal("Pasal 37 ayat (3) huruf a atau ayat (5) huruf c", "Akta otentik penunjukan sebagai Perwakilan Resmi yang dibuat di hadapan notaris di wilayah NKRI"),
  perjanjianLisensi: pasal("Pasal 37 ayat (3) huruf b atau ayat (5) huruf d", "Dikecualikan apabila menggunakan tanda pendaftaran merek — Pasal 37 ayat (8)"),
  pencatatanLisensi: pasal("Pasal 37 ayat (3) huruf c atau ayat (5) huruf e", "Dikecualikan apabila menggunakan tanda pendaftaran merek — Pasal 37 ayat (8)"),
  aktaPerwakilanResmi: pasal("Pasal 37 ayat (5) huruf a"),
  perizinanPerwakilanResmi: pasal("Pasal 37 ayat (5) huruf b"),
  penunjukanImportir: pasal("Pasal 37 ayat (4)", "Surat penunjukan untuk melakukan Impor dari pemilik merek (berkedudukan di NKRI) atau Perwakilan Resmi"),
  penunjukanImportirPemilikMerek: pasal("Pasal 37 ayat (4) huruf a"),
} as const;
