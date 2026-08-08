/**
 * Legal reference copy for the four "Pemeriksaan Administratif" compliance
 * sections in Documents Verification — transcribed from the approved Claude
 * Design mock (Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 references).
 * Keyed by the same `key` values `buildDocumentChecklist` already produces —
 * only keys with a real backing payload field get an entry here, so a doc
 * type from the design with no real field simply never renders.
 */
export type DocumentComplianceDef = {
  persyaratan: "Wajib" | "Wajib (Alternatif)" | "Pendukung" | "Pendukung (Jika Tersedia)";
  referensi: string;
  keterangan: string;
};

export const DOCUMENT_COMPLIANCE_DEFS: Record<string, DocumentComplianceDef> = {
  nib: {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 2 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Diverifikasi untuk memastikan legalitas Perizinan Berusaha, identitas perusahaan, alamat pabrik, dan kesesuaian kegiatan usaha.",
  },
  "kbli-utama": {
    persyaratan: "Wajib",
    referensi: "Pasal 32 ayat (3) huruf b Permenperin Nomor 27 Tahun 2025",
    keterangan: "Diverifikasi untuk memastikan kesesuaian bidang usaha utama dengan aktivitas industri yang dijalankan.",
  },
  "kbli-pendukung": {
    persyaratan: "Pendukung",
    referensi: "Pasal 32 ayat (3) huruf b Permenperin Nomor 27 Tahun 2025",
    keterangan: "Diverifikasi untuk memastikan kesesuaian bidang usaha pendukung dengan aktivitas industri yang dijalankan, apabila tersedia.",
  },
  sk: {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (1) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan sebagai bukti pendukung untuk memverifikasi keabsahan identitas badan usaha dan kesesuaian data pada NIB.",
  },
  notarial: {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (1) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Diverifikasi untuk memastikan dasar pendirian perusahaan serta konsistensi identitas perusahaan dengan NIB dan SK Kementerian Hukum dan HAM.",
  },
  "notarial-amendment": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (1) huruf a dan Pasal 33 ayat (4) huruf b dan huruf c Permenperin Nomor 27 Tahun 2025",
    keterangan: "Diverifikasi untuk memastikan setiap perubahan perusahaan telah dituangkan dalam akta dan konsisten dengan dokumen legal perusahaan lainnya.",
  },
  npwp: {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 1 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Diverifikasi untuk memastikan perusahaan memiliki identitas perpajakan yang sah dan masih aktif.",
  },
  "tax-proof-summary": {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 7 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Berlaku bagi perusahaan yang memiliki Perizinan Berusaha 3 (tiga) tahun atau lebih.",
  },
  skt: {
    persyaratan: "Wajib (Alternatif)",
    referensi: "Pasal 30 ayat (2) huruf b angka 7 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan sebagai pengganti bukti pembayaran pajak 3 (tiga) tahun terakhir bagi perusahaan yang memiliki Perizinan Berusaha kurang dari 3 (tiga) tahun.",
  },
  "tax-support:spt-tahunan": {
    persyaratan: "Pendukung",
    referensi: "Verifikasi kesesuaian data dan dokumen (Pasal 31 ayat (1) huruf a)",
    keterangan: "Digunakan untuk memverifikasi kepatuhan pelaporan pajak perusahaan.",
  },
  "tax-support:bpe": {
    persyaratan: "Pendukung",
    referensi: "Verifikasi kesesuaian data dan dokumen (Pasal 31 ayat (1) huruf a)",
    keterangan: "Membuktikan bahwa SPT Tahunan telah diterima oleh Direktorat Jenderal Pajak.",
  },
  "tax-support:skf": {
    persyaratan: "Pendukung (Jika Tersedia)",
    referensi: "Verifikasi kesesuaian data dan dokumen (Pasal 31 ayat (1) huruf a)",
    keterangan: "Digunakan sebagai bukti status kepatuhan perpajakan perusahaan apabila tersedia.",
  },
  "tax-support:ssp": {
    persyaratan: "Pendukung",
    referensi: "Verifikasi kesesuaian data dan dokumen (Pasal 31 ayat (1) huruf a)",
    keterangan: "Diverifikasi sebagai bukti penyetoran kewajiban perpajakan.",
  },
  "tax-support:pph-badan": {
    persyaratan: "Pendukung",
    referensi: "Verifikasi kesesuaian data dan dokumen (Pasal 31 ayat (1) huruf a)",
    keterangan: "Digunakan untuk memverifikasi pemenuhan kewajiban pembayaran Pajak Penghasilan Badan.",
  },
  "tax-support:ppn": {
    persyaratan: "Pendukung",
    referensi: "Verifikasi kesesuaian data dan dokumen (Pasal 31 ayat (1) huruf a)",
    keterangan: "Diverifikasi untuk memastikan kepatuhan pembayaran PPN sesuai kegiatan usaha perusahaan.",
  },
  "tax-support:e-billing": {
    persyaratan: "Pendukung",
    referensi: "Verifikasi kesesuaian data dan dokumen (Pasal 31 ayat (1) huruf a)",
    keterangan: "Digunakan sebagai bukti pembayaran pajak secara elektronik melalui sistem DJP.",
  },
  "vki-support:tenaga-kerja": {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 3 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Memuat jumlah tenaga kerja yang mendukung kegiatan industri.",
  },
  "vki-support:tidak-diperjualbelikan": {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 6 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Pernyataan bahwa mesin/peralatan produksi tidak akan diperjualbelikan atau dipindahtangankan.",
  },
  "vki-support:memiliki-menguasai": {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 6 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Pernyataan kepemilikan atau penguasaan atas mesin/peralatan produksi.",
  },
  "vki-support:kebenaran-data": {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 6 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Pernyataan bahwa seluruh data dan dokumen yang disampaikan benar dan dapat dipertanggungjawabkan.",
  },
  "vki-support:alur-proses": {
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf b angka 6 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Pernyataan mengenai alur proses produksi yang dijalankan.",
  },
  /**
   * "Dokumen Lokasi" — real checklist keys are dynamic per location instance
   * (`location:{id}:ownership:{type}` / `location:{id}:lease:{type}`), so
   * these are looked up by kind+type suffix via `getComplianceDef()` below
   * rather than by exact key.
   */
  "location:ownership:SHM": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan apabila fasilitas produksi atau gudang merupakan milik perusahaan.",
  },
  "location:ownership:HGB": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan apabila bangunan berdiri di atas tanah dengan status HGB.",
  },
  "location:ownership:AJB": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan sebagai bukti kepemilikan bangunan apabila relevan.",
  },
  "location:ownership:LAINNYA": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Dokumen lain yang sah yang dapat menunjukkan hak penguasaan atas fasilitas produksi dan/atau gudang.",
  },
  "location:lease:SEWA_MENYEWA": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan apabila fasilitas produksi atau gudang disewa dari pihak lain.",
  },
  "location:lease:PINJAM_PAKAI": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan apabila fasilitas digunakan berdasarkan perjanjian pinjam pakai.",
  },
  "location:lease:KERJA_SAMA": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Digunakan apabila fasilitas digunakan berdasarkan kerja sama dengan pihak lain.",
  },
  "location:lease:LAINNYA": {
    persyaratan: "Pendukung",
    referensi: "Pasal 31 ayat (2) huruf a Permenperin Nomor 27 Tahun 2025",
    keterangan: "Dokumen lain yang sah yang dapat menunjukkan hak penguasaan atas fasilitas produksi dan/atau gudang.",
  },
};

/**
 * Resolves a checklist `key` to its compliance def — exact match first (fixed
 * keys like `nib`/`npwp`), falling back to a kind+type suffix match for
 * dynamic per-location keys (`location:{locationId}:ownership:SHM` →
 * `location:ownership:SHM`).
 */
export function getComplianceDef(key: string): DocumentComplianceDef | undefined {
  if (DOCUMENT_COMPLIANCE_DEFS[key]) return DOCUMENT_COMPLIANCE_DEFS[key];
  const locationMatch = key.match(/^location:[^:]+:(ownership|lease):([A-Z_]+)$/);
  return locationMatch ? DOCUMENT_COMPLIANCE_DEFS[`location:${locationMatch[1]}:${locationMatch[2]}`] : undefined;
}

export const COMPLIANCE_SECTION_DEFS = [
  {
    category: "Legalitas Perusahaan",
    title: "Pemeriksaan Administratif Kelengkapan Dokumen Perizinan Berusaha",
    desc: "Dasar hukum dan klasifikasi dokumen perizinan berusaha yang diperiksa",
    intro: [
      "Pemeriksaan administratif perizinan berusaha dilaksanakan untuk memastikan bahwa perusahaan telah memiliki legalitas usaha yang sah serta memenuhi persyaratan administrasi dalam pelaksanaan Verifikasi Kemampuan Industri (VKI) sesuai dengan ketentuan Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
      "Pemeriksaan dilakukan melalui verifikasi terhadap dokumen persyaratan wajib yang menjadi dasar dalam pengajuan Verifikasi Kemampuan Industri sebagaimana diatur dalam Pasal 30 ayat (2), serta dokumen pendukung verifikasi yang digunakan untuk memastikan keabsahan, konsistensi, dan kesesuaian identitas badan usaha berdasarkan hasil pemeriksaan dokumen sebagaimana dimaksud dalam Pasal 31 ayat (1) huruf a.",
    ],
    vkiOnly: false,
  },
  {
    category: "Perpajakan",
    title: "Pemeriksaan Administratif Perpajakan",
    desc: "Dasar hukum dan klasifikasi dokumen perpajakan yang diperiksa",
    intro: [
      "Pemeriksaan administratif perpajakan dilaksanakan untuk memastikan bahwa perusahaan telah memenuhi persyaratan administrasi perpajakan sebagai bagian dari pelaksanaan Verifikasi Kemampuan Industri (VKI) sesuai dengan ketentuan Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
      "Pemeriksaan dilakukan melalui verifikasi terhadap dokumen persyaratan wajib yang dipersyaratkan dalam permohonan Verifikasi Kemampuan Industri sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 1, meliputi Nomor Pokok Wajib Pajak (NPWP) perusahaan.",
    ],
    vkiOnly: false,
  },
  {
    category: "Tenaga Kerja",
    title: "Pemeriksaan Administratif Tenaga Kerja",
    desc: "Dasar hukum dan klasifikasi dokumen tenaga kerja yang diperiksa",
    intro: [
      "Pemeriksaan administratif tenaga kerja dilakukan untuk memastikan bahwa perusahaan telah memenuhi persyaratan administratif terkait ketersediaan tenaga kerja dalam mendukung pelaksanaan kegiatan industri sebagaimana diatur dalam Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    vkiOnly: true,
  },
  {
    category: "Surat Pernyataan",
    title: "Pemeriksaan Administratif Surat Pernyataan",
    desc: "Kelengkapan surat pernyataan sebagai persyaratan VKI",
    intro: [
      "Pemeriksaan administratif surat pernyataan dilakukan untuk memastikan bahwa perusahaan telah memenuhi persyaratan administratif terkait surat pernyataan dalam mendukung pelaksanaan kegiatan industri sebagaimana diatur dalam Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    vkiOnly: true,
  },
  {
    category: "Dokumen Lokasi",
    title: "Pemeriksaan Administratif Kepemilikan Bangunan",
    desc: "Dasar hukum dan klasifikasi dokumen kepemilikan/penguasaan fasilitas bangunan yang diperiksa",
    intro: [
      "Pemeriksaan administratif kepemilikan/penguasaan bangunan dilakukan untuk memastikan bahwa perusahaan memiliki atau menguasai fasilitas bangunan yang digunakan dalam pelaksanaan kegiatan industri, meliputi area produksi, gudang bahan baku, gudang bahan penolong, dan/atau gudang hasil produksi. Pemeriksaan ini bertujuan untuk memberikan keyakinan bahwa kegiatan produksi dilaksanakan pada fasilitas yang berada dalam penguasaan perusahaan dan mendukung operasional industri sesuai dengan ruang lingkup usaha yang diajukan dalam permohonan Verifikasi Kemampuan Industri (VKI).",
      "Pemeriksaan dilakukan melalui penelaahan terhadap Surat Pernyataan memiliki/menguasai gudang bahan baku dan/atau bahan penolong dan/atau gudang hasil produksi sebagai persyaratan administratif sesuai Pasal 30 ayat (2) huruf b angka 6 Permenperin Nomor 27 Tahun 2025. Selain itu, apabila tersedia, dilakukan pemeriksaan terhadap dokumen pendukung yang menunjukkan status kepemilikan atau penguasaan fasilitas bangunan, seperti Sertifikat Hak Milik (SHM), Sertifikat Hak Guna Bangunan (HGB), Akta Jual Beli (AJB), Perjanjian Sewa Menyewa, Perjanjian Pinjam Pakai, Perjanjian Kerja Sama, atau dokumen lain yang sah.",
      "Selanjutnya, kesesuaian antara dokumen administratif dengan kondisi aktual di lapangan diverifikasi melalui observasi lokasi industri sesuai ketentuan Pasal 31 Permenperin Nomor 27 Tahun 2025, untuk memastikan bahwa fasilitas bangunan yang digunakan perusahaan benar-benar tersedia, digunakan untuk kegiatan produksi, dan sesuai dengan informasi yang tercantum dalam dokumen permohonan VKI.",
    ],
    vkiOnly: false,
  },
] as const;

/**
 * "Kemampuan Produksi" chapter's compliance table — unlike
 * `DOCUMENT_COMPLIANCE_DEFS`, these 8 rows aren't tied to a single uploaded
 * document/checklist key (they're data reports, several spanning multiple
 * real data sources), so they're kept as a standalone static table rather
 * than routed through `getComplianceDef()`. Text supplied verbatim.
 */
export const PRODUCTION_CAPABILITY_COMPLIANCE_ROWS = [
  {
    no: 1,
    jenisDokumen: "Data Kapasitas Produksi Perusahaan",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 1 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Kapasitas produksi perusahaan tercantum dalam dokumen perizinan berusaha yang masih berlaku.",
  },
  {
    no: 2,
    jenisDokumen: "Data kemampuan produksi setiap mesin per hari",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 1 Permenperin Nomor 27 Tahun 2025",
    keterangan:
      "Perusahaan menyampaikan data kemampuan produksi masing-masing mesin per hari sebagai dasar perhitungan kapasitas produksi terhadap kondisi fasilitas produksi.",
  },
  {
    no: 3,
    jenisDokumen: "Data jumlah produksi untuk setiap jenis dan pos tarif/Harmonized System 1 (satu) tahun sebelumnya",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 2 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Perusahaan menyampaikan data realisasi produksi dan penggunaan bahan baku berdasarkan jenis dan kode HS selama 1 (satu) tahun sebelumnya.",
  },
  {
    no: 4,
    jenisDokumen:
      "Data penggunaan Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong untuk setiap jenis dan pos tarif/Harmonized System 1 (satu) tahun sebelumnya",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 2 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Perusahaan menyampaikan data realisasi produksi dan penggunaan bahan baku berdasarkan jenis dan kode HS selama 1 (satu) tahun sebelumnya.",
  },
  {
    no: 5,
    jenisDokumen: "Konversi penggunaan bahan baku dan/atau bahan penolong Tekstil dan/atau Produk Tekstil per jenis produk",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 3 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Perusahaan menyampaikan data konversi penggunaan bahan baku untuk setiap jenis produk sebagai dasar perhitungan kebutuhan bahan baku.",
  },
  {
    no: 6,
    jenisDokumen:
      "Jumlah rencana produksi dan kebutuhan Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong untuk setiap jenis dan pos tarif/Harmonized System 1 (satu) tahun ke depan",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 4 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Perusahaan menyampaikan rencana produksi dan estimasi kebutuhan bahan baku untuk periode 1 (satu) tahun ke depan berdasarkan jenis produk dan kode HS.",
  },
  {
    no: 7,
    jenisDokumen: "Jumlah penjualan di dalam negeri dan tujuan ekspor untuk setiap jenis dan pos tarif/Harmonized System 1 (satu) tahun sebelumnya",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 5 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Perusahaan menyampaikan data penjualan domestik dan ekspor berdasarkan jenis produk dan kode HS selama 1 (satu) tahun sebelumnya.",
  },
  {
    no: 8,
    jenisDokumen: "Jumlah stok terkini Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong untuk setiap jenis dan pos tarif/Harmonized System",
    persyaratan: "Wajib",
    referensi: "Pasal 30 ayat (2) huruf a angka 6 Permenperin Nomor 27 Tahun 2025",
    keterangan: "Perusahaan menyampaikan data stok bahan baku dan/atau bahan penolong terkini berdasarkan jenis material dan kode HS.",
  },
] as const;
