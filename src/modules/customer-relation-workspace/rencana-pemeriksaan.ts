/**
 * Lampiran "Rencana Pemeriksaan dan Verifikasi VKI" — what the company prepares (documents) and makes available
 * on site (to be shown/photographed) per aspect of Pasal 30 ayat (2) Permenperin 27/2025, plus the photo list.
 * Printed with the Form Pemeriksaan Kelengkapan Data dan Dokumen VKI so the applicant can prepare ahead.
 */
export type RencanaLokasi = "KANTOR" | "PABRIK";
export type RencanaAspek = { lokasi: RencanaLokasi; aspek: string; diverifikasi: string[]; metode: string[]; dokumen: string[]; lapangan: string[]; referensi: string[] };

const ASLI = ["Dokumen asli untuk dicocokkan"];

export const RENCANA_ASPEK: RencanaAspek[] = [
  {
    lokasi: "KANTOR",
    aspek: "Legalitas (NIB & KBLI)",
    diverifikasi: ["Nomor dan tanggal terbit NIB", "Kode dan uraian KBLI utama/pendukung", "Nama, bentuk usaha, dan alamat perusahaan"],
    metode: ["Verifikasi dokumen"],
    dokumen: ["Akta pendirian", "Akta perubahan terakhir (jika ada)", "SK Kemenkumham pengesahan badan hukum"],
    lapangan: ASLI,
    referensi: ["Pasal 30 ayat (2) huruf b angka 2", "Pasal 31 ayat (1) huruf a"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Dasar Kewajiban VKI dan Rekam Jejak LHVKI",
    diverifikasi: ["Subjek VKI: Perusahaan API-P atau Perusahaan Industri berkontrak dengan API-U", "LHVKI yang sudah dimiliki sebelumnya"],
    metode: ["Verifikasi dokumen"],
    dokumen: ["Kontrak dengan Perusahaan API-U (jika berkontrak)", "LHVKI sebelumnya beserta masa berlakunya (jika ada)"],
    lapangan: ASLI,
    referensi: ["Pasal 25 huruf a dan b", "Pasal 30 ayat (1)"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Perpajakan (NPWP)",
    diverifikasi: ["Nomor NPWP sesuai identitas perusahaan", "Bukti pajak 3 tahun terakhir, atau SKT bila Perizinan Berusaha < 3 tahun"],
    metode: ["Verifikasi dokumen"],
    dokumen: ["Surat Pengukuhan / Surat Keterangan Terdaftar (SKT) pajak", "Bukti pembayaran pajak (SPT/SSP/e-Billing) 3 tahun terakhir"],
    lapangan: ASLI,
    referensi: ["Pasal 30 ayat (2) huruf b angka 1 dan angka 7"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Lokasi Kantor",
    diverifikasi: ["Alamat kantor sesuai NIB dan permohonan", "Status penguasaan kantor"],
    metode: ["Verifikasi dokumen", "Survey lapangan"],
    dokumen: ["Sewa: surat perjanjian sewa kantor", "Milik sendiri: Sertifikat Hak Milik (SHM) atau bukti kepemilikan lain yang sah"],
    lapangan: ["Dokumen asli SHM / perjanjian sewa untuk dicocokkan", "Tampak depan kantor dan papan nama dapat difoto", "Titik koordinat kantor"],
    referensi: ["Pasal 31 ayat (2) huruf a"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Kapasitas Perizinan",
    diverifikasi: ["Jenis produk dan KBLI", "Kapasitas produksi per tahun sesuai izin", "Kapasitas terpasang"],
    metode: ["Verifikasi dokumen"],
    dokumen: ["Izin Usaha Industri (IUI) / Perizinan Berusaha sektor industri atau dokumen sejenis yang mencantumkan kapasitas"],
    lapangan: ASLI,
    referensi: ["Pasal 30 ayat (2) huruf b angka 2"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Tenaga Kerja",
    diverifikasi: ["Jumlah tenaga kerja per kategori (semester berjalan)"],
    metode: ["Verifikasi dokumen"],
    dokumen: ["Surat pernyataan tenaga kerja", "Daftar karyawan per kategori/bagian", "Bukti kepesertaan BPJS Ketenagakerjaan"],
    lapangan: ["Dokumen asli untuk dicocokkan"],
    referensi: ["Pasal 30 ayat (2) huruf b angka 3"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Data Produksi dan Pemakaian Bahan Baku 1 Tahun Sebelumnya",
    diverifikasi: ["Jumlah produksi per jenis dan HS", "Pemakaian bahan baku/penolong per jenis dan HS"],
    metode: ["Verifikasi dokumen"],
    dokumen: ["Laporan Industri pada SIINas periode 1 tahun sebelumnya", "Catatan produksi dan pemakaian bahan baku internal (apabila ada)"],
    lapangan: ASLI,
    referensi: ["Pasal 30 ayat (2) huruf a angka 2"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Rencana Produksi dan Kebutuhan Bahan Baku 1 Tahun ke Depan",
    diverifikasi: ["Rencana produksi per jenis dan HS", "Kebutuhan bahan baku/penolong dalam negeri dan impor, serta negara asal"],
    metode: ["Verifikasi dokumen", "Klarifikasi"],
    dokumen: ["Rencana produksi / anggaran produksi tahunan", "Kontrak atau PO pembelian bahan baku", "Daftar pemasok dan negara asal bahan baku impor"],
    lapangan: ["Penjelasan dari petugas perencanaan produksi atau pembelian"],
    referensi: ["Pasal 30 ayat (2) huruf a angka 4"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Penjualan Dalam Negeri dan Ekspor 1 Tahun Sebelumnya",
    diverifikasi: ["Jumlah penjualan per jenis dan HS", "Negara tujuan ekspor"],
    metode: ["Verifikasi dokumen"],
    dokumen: ["Rekap penjualan 1 tahun sebelumnya", "Faktur pajak penjualan", "Pemberitahuan Ekspor Barang (PEB) untuk ekspor"],
    lapangan: ASLI,
    referensi: ["Pasal 30 ayat (2) huruf a angka 5"],
  },
  {
    lokasi: "KANTOR",
    aspek: "Surat Pernyataan (Lampiran II huruf G)",
    diverifikasi: ["Pernyataan memiliki/menguasai gudang", "Pernyataan unit pengolahan limbah atau kerja sama pengolahan limbah", "Pernyataan tidak diperjualbelikan dan kebenaran data"],
    metode: ["Verifikasi dokumen"],
    dokumen: [
      "Surat pernyataan memiliki/menguasai gudang bahan baku dan/atau hasil produksi",
      "Surat pernyataan memiliki unit pengolahan limbah, atau kontrak kerja sama dengan pengolah limbah",
      "Surat pernyataan tidak akan diperjualbelikan atau dipindahtangankan",
      "Surat pernyataan kebenaran data",
      "Seluruhnya bermeterai dan ditandatangani pimpinan setingkat direktur",
    ],
    lapangan: ["Dokumen asli untuk dicocokkan"],
    referensi: ["Pasal 30 ayat (2) huruf b angka 6", "Lampiran II huruf G"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Lokasi Pabrik dan Gudang",
    diverifikasi: ["Alamat pabrik dan gudang sesuai NIB dan permohonan", "Status penguasaan pabrik dan gudang", "Keberadaan dan legalitas gudang bahan baku/hasil produksi"],
    metode: ["Verifikasi dokumen", "Survey lapangan"],
    dokumen: ["Sewa: surat perjanjian sewa pabrik/gudang", "Milik sendiri: Sertifikat Hak Milik (SHM) atau bukti kepemilikan lain yang sah", "Tanda daftar gudang", "Layout gudang"],
    lapangan: ["Dokumen asli SHM / perjanjian sewa untuk dicocokkan", "Akses ke pabrik dan gudang untuk difoto", "Titik koordinat pabrik dan gudang"],
    referensi: ["Pasal 30 ayat (2) huruf b angka 6", "Pasal 31 ayat (2) huruf a"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Mesin dan Peralatan Produksi",
    diverifikasi: ["Jenis, merek/model, jumlah unit", "Kapasitas per hari", "Kondisi dan tahun pembuatan"],
    metode: ["Survey lapangan", "Dokumentasi foto"],
    dokumen: ["Daftar mesin dan peralatan produksi (sesuai permohonan)", "Dokumen pembelian / spesifikasi mesin (apabila ada)"],
    lapangan: ["Mesin dapat diperiksa (sebaiknya sedang beroperasi)", "Nameplate mesin dapat difoto (apabila ada)", "Petugas yang memahami mesin untuk mendampingi"],
    referensi: ["Pasal 30 ayat (2) huruf a angka 1", "Pasal 30 ayat (2) huruf b angka 4"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Alur Proses Produksi",
    diverifikasi: ["Tahapan proses dari bahan baku sampai produk jadi", "Kesesuaian alur dengan mesin dan produk"],
    metode: ["Verifikasi dokumen", "Survey lapangan"],
    dokumen: ["Gambar alur proses produksi", "Surat pernyataan alur proses produksi"],
    lapangan: ["Penelusuran alur proses di area produksi bersama petugas produksi"],
    referensi: ["Pasal 30 ayat (2) huruf b angka 5"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Produk",
    diverifikasi: ["Jenis produk dan pos tarif/HS", "Kesesuaian produk dengan KBLI dan proses produksi"],
    metode: ["Survey lapangan", "Dokumentasi foto"],
    dokumen: ["Daftar produk beserta pos tarif/HS (sesuai permohonan)"],
    lapangan: ["Sampel produk jadi untuk difoto", "Label/kemasan produk (apabila ada)"],
    referensi: ["Pasal 30 ayat (2) huruf a angka 2"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Rasio Konversi Bahan Baku",
    diverifikasi: ["Rasio konversi bahan baku/penolong terhadap produk", "Kewajaran terhadap kapasitas mesin dan proses"],
    metode: ["Perhitungan", "Survey lapangan", "Dokumentasi foto"],
    dokumen: ["Dokumen spesifikasi produk dan bahan baku", "Lembar perhitungan rasio konversi"],
    lapangan: ["Bahan baku dan bahan penolong untuk difoto", "Akses ke tahapan proses produksi", "Penjelasan perhitungan konversi oleh petugas produksi"],
    referensi: ["Pasal 30 ayat (2) huruf a angka 3"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Stok Bahan Baku Terkini",
    diverifikasi: ["Jumlah stok per jenis dan HS"],
    metode: ["Verifikasi dokumen", "Survey lapangan", "Dokumentasi foto"],
    dokumen: ["Kartu stok atau laporan stock opname terakhir"],
    lapangan: ["Akses ke gudang bahan baku", "Stok bahan baku dapat difoto dan dicocokkan dengan kartu stok"],
    referensi: ["Pasal 30 ayat (2) huruf a angka 6"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Unit Pengolahan Limbah",
    diverifikasi: ["Keberadaan unit pengolahan limbah milik sendiri, atau kerja sama dengan pihak lain"],
    metode: ["Survey lapangan", "Dokumentasi foto"],
    dokumen: ["Kontrak kerja sama dengan pengolah limbah (jika tidak memiliki unit sendiri)"],
    lapangan: ["Akses ke unit pengolahan limbah (IPAL / TPS limbah) untuk difoto, apabila ada"],
    referensi: ["Pasal 30 ayat (2) huruf b angka 6"],
  },
  {
    lokasi: "PABRIK",
    aspek: "Bukti Pembayaran Listrik 3 Bulan Terakhir",
    diverifikasi: ["Nominal pembayaran dan pemakaian (kWh) 3 bulan sebelumnya", "Kewajaran pemakaian terhadap kegiatan produksi"],
    metode: ["Verifikasi dokumen", "Survey lapangan"],
    dokumen: ["Rekening/tagihan listrik pabrik 3 bulan terakhir", "Bukti pembayaran listrik"],
    lapangan: ["Akses ke meteran / panel listrik pabrik untuk difoto", "Aktivitas tenaga kerja di area produksi dapat difoto"],
    referensi: ["Pasal 30 ayat (2) huruf b angka 8"],
  },
];

/** Number of an aspect within its location ("K1", "P3"). */
export function rencanaNo(a: RencanaAspek): string {
  const list = RENCANA_ASPEK.filter((x) => x.lokasi === a.lokasi);
  return `${a.lokasi === "KANTOR" ? "K" : "P"}${list.indexOf(a) + 1}`;
}

export const RENCANA_PERSIAPAN: string[] = [
  "Menunjuk pimpinan perusahaan atau penanggung jawab (PIC) yang mendampingi tim verifikasi selama kegiatan.",
  "Menyiapkan dokumen asli (atau salinan yang dilegalisir) dari seluruh dokumen pada kolom “Dokumen yang Perlu Disiapkan Perusahaan”.",
  "Memastikan akses ke seluruh lokasi yang didaftarkan (kantor, pabrik, gudang), termasuk area produksi.",
  "Mengupayakan mesin produksi dalam kondisi beroperasi atau siap diperiksa pada saat survey.",
  "Menyiapkan petugas produksi yang dapat menjelaskan proses produksi dan perhitungan rasio konversi.",
  "Menyiapkan kartu stok terkini dan memastikan gudang bahan baku dapat diperiksa.",
];

/** [lokasi, objek, ketentuan, butir terkait] */
export const RENCANA_FOTO: [RencanaLokasi, string, string, string][] = [
  ["KANTOR", "Tampak depan kantor beserta papan nama perusahaan", "Papan nama dan nomor bangunan terbaca", "K4"],
  ["KANTOR", "Titik koordinat kantor", "Tangkapan layar peta atau foto ber-geotag", "K4"],
  ["KANTOR", "Dokumen asli kepemilikan/sewa kantor", "SHM atau perjanjian sewa, halaman identitas dan tanda tangan", "K4"],
  ["KANTOR", "Opening meeting bersama pimpinan/PIC perusahaan", "Tim verifikasi dan perwakilan perusahaan (di kantor atau pabrik, tempat kegiatan dimulai)", "Pelaksanaan"],
  ["KANTOR", "Closing meeting dan penandatanganan berita acara", "Penandatanganan Berita Acara Pelaksanaan/Klarifikasi", "Pelaksanaan"],
  ["PABRIK", "Tampak depan pabrik beserta papan nama", "Papan nama dan akses masuk terlihat", "P1"],
  ["PABRIK", "Titik koordinat pabrik dan gudang", "Tangkapan layar peta atau foto ber-geotag di tiap lokasi", "P1"],
  ["PABRIK", "Gudang bahan baku (luar dan dalam)", "Luas area dan penataan bahan baku terlihat", "P1, K10"],
  ["PABRIK", "Gudang hasil produksi (luar dan dalam)", "Penataan produk jadi terlihat", "P1, K10"],
  ["PABRIK", "Dokumen asli kepemilikan/sewa pabrik dan tanda daftar gudang", "Halaman identitas dan tanda tangan terbaca", "P1"],
  ["PABRIK", "Setiap jenis mesin secara utuh", "Satu foto per jenis mesin, sesuai daftar mesin pada permohonan", "P2"],
  ["PABRIK", "Nameplate mesin", "Merek, model, nomor seri, tahun, dan kapasitas terbaca (apabila ada)", "P2"],
  ["PABRIK", "Mesin dalam kondisi beroperasi", "Foto atau video singkat mesin yang sedang berjalan", "P2"],
  ["PABRIK", "Tahapan proses produksi", "Setiap tahapan sesuai gambar alur proses, dari bahan baku sampai produk jadi", "P3"],
  ["PABRIK", "Produk jadi", "Wujud produk serta label/kemasan (apabila ada)", "P4"],
  ["PABRIK", "Bahan baku dan bahan penolong", "Wujud fisik, label, atau keterangan jenis/HS", "P5, P6"],
  ["PABRIK", "Penimbangan/pengukuran sampel konversi", "Apabila dilakukan pengukuran rasio konversi di lokasi", "P5"],
  ["PABRIK", "Stok bahan baku di gudang", "Stok fisik beserta kartu stok terkini", "P6"],
  ["PABRIK", "Unit pengolahan limbah (IPAL/TPS limbah)", "Apabila dimiliki sendiri", "P7"],
  ["PABRIK", "Meteran / panel listrik", "Nomor ID pelanggan dan angka meter terbaca", "P8"],
  ["PABRIK", "Aktivitas tenaga kerja di area produksi", "Tanpa menampilkan data pribadi pekerja", "K6"],
];
