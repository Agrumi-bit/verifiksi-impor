import { COMMON_DOCUMENTS as C, common } from "../shared/common-documents";
import type { SchemeDocumentDef } from "../types";
import { VKI_LEGAL_BASIS as L } from "./legal-basis";

/** VKI — Permenperin 27/2025 Pasal 30 ayat (2). */
export const VKI_DOCUMENTS: readonly SchemeDocumentDef[] = [
  // Legalitas
  common(C.nib, "WAJIB", L.perizinanBerusaha),
  common(C.kbliUtama, "WAJIB", L.kbli),
  common(C.kbliPendukung, "PENDUKUNG", L.kbli),
  common(C.aktaPendirian, "PENDUKUNG", L.akta),
  common(C.aktaPerubahan, "PENDUKUNG_JIKA_ADA", L.akta),
  common(C.skKemenkumham, "PENDUKUNG", L.akta),
  // Perpajakan
  common(C.npwp, "WAJIB", L.npwp),
  common(C.buktiPajak3Tahun, "WAJIB_ALTERNATIF", L.pajak, { group: "pajak" }),
  common(C.skt, "WAJIB_ALTERNATIF", L.pajak, { group: "pajak" }),
  common(C.rincianBuktiPajak, "PENDUKUNG", L.pajak),
  common(C.suratKeteranganFiskal, "PENDUKUNG_JIKA_ADA", L.pajak),
  // Lokasi — VKI requires Kantor + Pabrik; Gudang only when the company has one
  common(C.tenureKantor, "PENDUKUNG", L.lapangan),
  common(C.tenurePabrik, "PENDUKUNG", L.lapangan),
  common(C.tenureGudang, "PENDUKUNG_JIKA_ADA", L.lapangan),
  common(C.tandaDaftarGudang, "PENDUKUNG_JIKA_ADA", L.lapangan),
  common(C.layoutGudang, "PENDUKUNG_JIKA_ADA", L.lapangan),
  {
    id: "sp-memiliki-menguasai",
    keyPatterns: ["vki-support:memiliki-menguasai"],
    label: "Surat Pernyataan Memiliki/Menguasai Gudang dan/atau Unit Pengolahan Limbah",
    section: "lokasi",
    sifat: "WAJIB",
    legalBasis: L.spGudangLimbah,
  },
  {
    id: "sp-unit-limbah",
    keyPatterns: ["vki-support:unit-limbah"],
    label: "Surat Pernyataan Memiliki Unit Pengolahan Limbah atau Bekerja Sama dengan Pihak Lain",
    section: "lokasi",
    sifat: "WAJIB",
    legalBasis: L.spGudangLimbah,
  },
  {
    id: "kontrak-limbah",
    keyPatterns: ["vki-support:unit-limbah:kontrak"],
    label: "Kontrak Kerja Sama Pengolahan Limbah",
    section: "lokasi",
    sifat: "PENDUKUNG_JIKA_ADA",
    legalBasis: L.spGudangLimbah,
  },
  // Kemampuan produksi
  {
    id: "gambar-alur-proses",
    keyPatterns: ["vki-support:gambar-alur-proses"],
    label: "Gambar Alur Proses Produksi",
    section: "kemampuan-produksi",
    sifat: "WAJIB",
    legalBasis: L.alurProses,
  },
  {
    id: "alur-proses",
    keyPatterns: ["vki-support:alur-proses"],
    label: "Surat Pernyataan Alur Proses Produksi",
    section: "kemampuan-produksi",
    sifat: "PENDUKUNG",
    legalBasis: L.alurProses,
  },
  {
    id: "skep-fasilitas",
    keyPatterns: ["vki-fasilitas:skep"],
    label: "SKEP Fasilitas Kawasan Berikat / KITE",
    section: "kemampuan-produksi",
    sifat: "PENDUKUNG_JIKA_ADA",
    legalBasis: L.fasilitas,
  },
  {
    id: "lhvki-sebelumnya",
    keyPatterns: ["vki-lhvki:{lhvkiId}"],
    label: "LHVKI yang Dimiliki Sebelumnya",
    section: "legalitas",
    sifat: "PENDUKUNG_JIKA_ADA",
    legalBasis: L.lhvkiSebelumnya,
  },
  {
    id: "listrik",
    keyPatterns: ["vki-support:listrik", "vki-support:listrik:{month}"],
    label: "Bukti Pembayaran Listrik 3 (Tiga) Bulan Sebelumnya",
    section: "kemampuan-produksi",
    sifat: "WAJIB",
    legalBasis: L.listrik,
  },
  // Tenaga kerja
  {
    id: "tenaga-kerja",
    keyPatterns: ["vki-support:tenaga-kerja"],
    label: "Data / Surat Pernyataan Tenaga Kerja",
    section: "tenaga-kerja",
    sifat: "WAJIB",
    legalBasis: L.tenagaKerja,
  },
  // Surat pernyataan pendukung (persyaratan Pertimbangan Teknis, bukan Pasal 30)
  {
    id: "sp-tidak-diperjualbelikan",
    keyPatterns: ["vki-support:tidak-diperjualbelikan"],
    label: "Surat Pernyataan Tidak Akan Diperjualbelikan atau Dipindahtangankan",
    section: "surat-pernyataan",
    sifat: "PENDUKUNG",
    legalBasis: L.spTidakDiperjualbelikan,
  },
  {
    id: "sp-kebenaran-data",
    keyPatterns: ["vki-support:kebenaran-data"],
    label: "Surat Pernyataan Kebenaran Data dan Dokumen",
    section: "surat-pernyataan",
    sifat: "PENDUKUNG",
    legalBasis: L.spKebenaranData,
  },
];
