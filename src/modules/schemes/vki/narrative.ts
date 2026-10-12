import { baseTitle, cite, PERMENPERIN, statusHtml, titleContext } from "../shared/narrative-helpers";
import type { DocTextParams, DocumentNarrative, LegalBasis, SchemeNarrative } from "../types";
import { VKI_LEGAL_BASIS as L } from "./legal-basis";

/**
 * Report narrative for VKI ONLY — Permenperin 27/2025 Pasal 25, 30–33. The wording is the VKI text
 * the Laporan Verifikasi Dokumen printed before the per-scheme refactor (report-narrative.ts /
 * document-compliance-defs.ts), moved here unchanged so a change to a VIU scheme can never alter a
 * VKI report and vice versa. Never copy another scheme's text here (see terms.forbiddenTerms).
 */
const VKI = "Verifikasi Kemampuan Industri (VKI)";

/** Data values print KBLI as "code — desc"; the legacy prose uses an en dash. */
const enDash = (value: string) => value.replace(/ — /g, " – ");

const status = (p: DocTextParams) => statusHtml(p);

// ---------------------------------------------------------------------------------------------
// Legalitas Perusahaan
// ---------------------------------------------------------------------------------------------

const nib: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan legalitas Perizinan Berusaha, identitas perusahaan, alamat pabrik, dan kesesuaian kegiatan usaha.",
  intro: () => [
    `Verifikasi terhadap Nomor Induk Berusaha (NIB) dilakukan melalui pemeriksaan dokumen Perizinan Berusaha yang diterbitkan melalui sistem Online Single Submission (OSS). Pemeriksaan dilakukan untuk memastikan keabsahan identitas perusahaan, kesesuaian data perusahaan, serta keberlakuan Perizinan Berusaha sebagai salah satu persyaratan administrasi dalam pengajuan ${VKI}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Nomor Induk Berusaha (NIB) ${p.field("Nomor Induk Berusaha (NIB)")}. NIB tersebut merupakan identitas resmi perusahaan dalam pelaksanaan kegiatan berusaha dan digunakan sebagai dasar legalitas perusahaan dalam menjalankan kegiatan industri sesuai dengan ketentuan peraturan perundang-undangan.`,
    `Hasil verifikasi menunjukkan bahwa data yang tercantum pada NIB meliputi nama perusahaan, alamat perusahaan, serta informasi kegiatan usaha telah sesuai dengan dokumen legal perusahaan yang diperiksa pada saat verifikasi. Selain itu, NIB tersebut masih berlaku dan digunakan sebagai Perizinan Berusaha perusahaan. Kepemilikan NIB tersebut telah memenuhi persyaratan administrasi sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf b angka 2 ${PERMENPERIN}, yang mewajibkan Perusahaan Industri memiliki Perizinan Berusaha sebagai salah satu dokumen dalam pengajuan ${VKI}.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen dan observasi lapangan, ${p.company} memiliki Nomor Induk Berusaha (NIB) ${p.field("Nomor Induk Berusaha (NIB)")} yang masih berlaku dan sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 2 ${PERMENPERIN}. Dengan demikian, aspek kelengkapan dan keabsahan NIB dinyatakan ${status(p)}.`,
};

/** KBLI rows of the data block ("KBLI Utama", "KBLI Utama 2", …), joined like the legacy prose. */
function kbliList(p: DocTextParams, prefix: string): string {
  const values = p.fields.filter((f) => f.label.startsWith(prefix) && f.value && f.value !== "—" && !/tidak ada/i.test(f.value)).map((f) => enDash(f.value));
  return values.length ? values.join(" dan ") : "—";
}

const kbliUtama: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan kesesuaian bidang usaha utama dengan aktivitas industri yang dijalankan.",
  intro: () => [
    `Verifikasi terhadap Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) Utama dilakukan melalui pemeriksaan Lampiran Nomor Induk Berusaha (NIB) yang diterbitkan melalui sistem Online Single Submission (OSS). Pemeriksaan bertujuan untuk memastikan bahwa klasifikasi kegiatan usaha yang dimiliki perusahaan sesuai dengan kegiatan industri yang dijalankan dan menjadi objek ${VKI}.`,
  ],
  findings: (p) => [
    "KBLI tersebut merupakan klasifikasi kegiatan usaha industri yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB) dan menjadi dasar legalitas perusahaan dalam melaksanakan kegiatan produksi sesuai dengan ruang lingkup usaha yang dimiliki.",
    `Berdasarkan hasil pemeriksaan dokumen dan observasi lapangan, perusahaan melaksanakan kegiatan produksi sesuai dengan ruang lingkup KBLI ${kbliList(p, "KBLI Utama")}. Aktivitas industri yang dijalankan terbukti sejalan dengan klasifikasi usaha yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB), sehingga baik secara administratif maupun operasional tidak ditemukan ketidaksesuaian antara KBLI yang dimiliki dengan kegiatan usaha perusahaan.`,
    `Kesesuaian KBLI dengan aktivitas industri menunjukkan bahwa kegiatan usaha perusahaan telah sesuai dengan klasifikasi usaha yang tercantum dalam Perizinan Berusaha. Informasi mengenai KBLI dan bidang usaha merupakan bagian dari identitas perusahaan yang wajib dimuat dalam Laporan Hasil Verifikasi Kemampuan Industri (LHVKI) sesuai dengan ketentuan Pasal 32 ayat (3) ${PERMENPERIN}.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen dan observasi lapangan, ${p.company} memiliki KBLI Utama ${kbliList(p, "KBLI Utama")} yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB). Kegiatan usaha dan aktivitas produksi yang dilaksanakan perusahaan telah sesuai dengan klasifikasi usaha yang dimiliki. Dengan demikian, aspek kesesuaian KBLI Utama dinyatakan ${status(p)} dan sesuai dengan ketentuan Pasal 32 ayat (3) ${PERMENPERIN}.`,
};

/** The data block reads "Tidak ada KBLI pendukung" when the company has none. */
const hasNoKbliPendukung = (p: DocTextParams) => kbliList(p, "KBLI Pendukung") === "—";

const kbliPendukung: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan kesesuaian bidang usaha pendukung dengan aktivitas industri yang dijalankan, apabila tersedia.",
  intro: () => [
    "Verifikasi terhadap Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) Pendukung dilakukan melalui pemeriksaan Lampiran Nomor Induk Berusaha (NIB) yang diterbitkan melalui sistem Online Single Submission (OSS). Pemeriksaan bertujuan untuk memastikan bahwa kegiatan usaha pendukung yang dimiliki perusahaan telah tercantum dalam Perizinan Berusaha serta memiliki keterkaitan dengan kegiatan operasional perusahaan.",
  ],
  findings: (p) =>
    hasNoKbliPendukung(p)
      ? ["Berdasarkan hasil pemeriksaan dokumen, perusahaan tidak memiliki KBLI pendukung selain KBLI Utama yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB)."]
      : [
          `Hasil pemeriksaan menunjukkan bahwa KBLI pendukung ${kbliList(p, "KBLI Pendukung")} tercantum dalam Lampiran Nomor Induk Berusaha (NIB) dan menjadi bagian dari ruang lingkup kegiatan usaha yang dimiliki perusahaan.`,
          "Berdasarkan hasil pemeriksaan dokumen dan observasi lapangan, kegiatan usaha pendukung yang dimiliki perusahaan memiliki keterkaitan dengan aktivitas operasional perusahaan dan tidak bertentangan dengan kegiatan industri utama yang dijalankan.",
          `Informasi mengenai KBLI dan bidang usaha merupakan bagian dari identitas perusahaan yang wajib dimuat dalam Laporan Hasil Verifikasi Kemampuan Industri (LHVKI) sesuai dengan ketentuan Pasal 32 ayat (3) ${PERMENPERIN}.`,
        ],
  conclusion: (p) =>
    hasNoKbliPendukung(p)
      ? `${p.company} tidak memiliki KBLI pendukung tambahan di luar KBLI Utama. Aspek ini dinyatakan <strong>Tidak Berlaku</strong>.`
      : `Berdasarkan hasil verifikasi dokumen dan observasi lapangan, ${p.company} memiliki KBLI Pendukung ${kbliList(p, "KBLI Pendukung")} yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB). Dengan demikian, aspek kesesuaian KBLI Pendukung dinyatakan ${status(p)} sesuai dengan ketentuan Pasal 32 ayat (3) ${PERMENPERIN}.`,
};

const sk: DocumentNarrative = {
  keterangan: "Digunakan sebagai bukti pendukung untuk memverifikasi keabsahan identitas badan usaha dan kesesuaian data pada NIB.",
  intro: () => [
    `Verifikasi terhadap Surat Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia dilakukan sebagai dokumen pendukung untuk memastikan keabsahan dan konsistensi identitas badan usaha yang tercantum dalam Perizinan Berusaha (Nomor Induk Berusaha/NIB). Pemeriksaan dilakukan sebagai bagian dari verifikasi kesesuaian data dan dokumen yang diajukan dalam proses ${VKI} sesuai dengan ketentuan Pasal 31 ayat (1) huruf a ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Surat Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia Nomor ${p.field("Nomor SK Kemenkumham")} tentang Pengesahan Pendirian ${p.company}.`,
    "Hasil verifikasi menunjukkan bahwa identitas badan usaha yang tercantum dalam Surat Keputusan Kementerian Hukum dan HAM telah sesuai dengan data pada Perizinan Berusaha (NIB), meliputi nama perusahaan serta status pendirian perusahaan. Pemeriksaan juga menunjukkan tidak terdapat perbedaan identitas antara Surat Keputusan Kementerian Hukum dan HAM dengan dokumen legal perusahaan lainnya yang digunakan dalam proses verifikasi.",
    "Meskipun Surat Keputusan Kementerian Hukum dan HAM tidak termasuk dokumen yang secara eksplisit dipersyaratkan dalam Pasal 30 ayat (2), dokumen ini digunakan sebagai bukti pendukung untuk memverifikasi keabsahan identitas badan usaha yang menjadi dasar penerbitan Perizinan Berusaha (NIB), yang merupakan salah satu persyaratan dokumen dalam pengajuan VKI.",
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki Surat Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia Nomor ${p.field("Nomor SK Kemenkumham")} yang menunjukkan pengesahan pendirian perusahaan. Data yang tercantum konsisten dengan Perizinan Berusaha (NIB) dan dokumen legal perusahaan lainnya. Dengan demikian, dokumen ini dinyatakan ${status(p)} sebagai bukti pendukung legalitas perusahaan.`,
};

const notarial: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan dasar pendirian perusahaan serta konsistensi identitas perusahaan dengan NIB dan SK Kementerian Hukum dan HAM.",
  intro: () => [
    `Verifikasi terhadap Akta Pendirian perusahaan dilakukan sebagai dokumen pendukung untuk memastikan keabsahan identitas badan usaha yang tercantum dalam Perizinan Berusaha (Nomor Induk Berusaha/NIB). Pemeriksaan dilakukan sebagai bagian dari verifikasi kesesuaian data dan dokumen yang diajukan dalam proses ${VKI} sesuai dengan ketentuan Pasal 31 ayat (1) huruf a ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Akta Pendirian Nomor ${p.field("Nomor Akta Pendirian")}, yang dibuat oleh ${p.field("Nama Notaris")}, Notaris, pada tanggal ${p.field("Tanggal Akta Pendirian")}.`,
    "Hasil verifikasi menunjukkan bahwa informasi yang tercantum dalam Akta Pendirian, meliputi nama perusahaan, bentuk badan usaha, tanggal pendirian, serta identitas pendiri, telah sesuai dengan data yang tercantum pada Surat Keputusan Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia, Perizinan Berusaha (NIB), serta dokumen legal perusahaan lainnya.",
    `Meskipun Akta Pendirian tidak termasuk dokumen yang secara eksplisit dipersyaratkan dalam Pasal 30 ayat (2) ${PERMENPERIN}, dokumen ini digunakan sebagai bukti pendukung untuk memverifikasi keabsahan identitas perusahaan serta memastikan konsistensi data pada Perizinan Berusaha (NIB), yang merupakan salah satu persyaratan dalam pengajuan ${VKI}.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki Akta Pendirian Nomor ${p.field("Nomor Akta Pendirian")} yang dibuat oleh ${p.field("Nama Notaris")}, Notaris, pada ${p.field("Tanggal Akta Pendirian")}. Data yang tercantum konsisten dengan Surat Keputusan Kementerian Hukum dan HAM dan dokumen legal perusahaan lainnya. Dengan demikian, dokumen ini dinyatakan ${status(p)}.`,
};

const notarialAmendment: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan setiap perubahan perusahaan telah dituangkan dalam akta dan konsisten dengan dokumen legal perusahaan lainnya.",
  intro: () => [
    `Verifikasi terhadap Akta Perubahan dilakukan sebagai dokumen pendukung untuk memastikan bahwa perubahan data perusahaan telah dituangkan dalam akta notaris dan selaras dengan dokumen legal perusahaan lainnya. Pemeriksaan dilakukan sebagai bagian dari verifikasi kesesuaian data dan dokumen yang diajukan dalam proses ${VKI} sesuai dengan ketentuan Pasal 31 ayat (1) huruf a ${PERMENPERIN}.`,
  ],
  findings: (p) =>
    !p.hasDocument
      ? [`Berdasarkan hasil pemeriksaan, ${p.company} belum pernah melakukan perubahan akta pendirian, sehingga tidak terdapat Akta Perubahan yang perlu diverifikasi pada permohonan ini.`]
      : [
          `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Akta Perubahan Nomor ${p.field("Nomor Akta Perubahan")}, yang dibuat oleh ${p.field("Nama Notaris")}, Notaris, pada tanggal ${p.field("Tanggal Akta Perubahan")}.`,
          `Hasil verifikasi menunjukkan bahwa perubahan yang tercantum dalam Akta Perubahan telah terdokumentasi secara resmi dan konsisten dengan dokumen legal perusahaan lainnya, termasuk Surat Keputusan Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia serta Perizinan Berusaha (NIB) yang digunakan dalam proses ${VKI}.`,
          `Sesuai dengan ketentuan Pasal 33 ayat (4) ${PERMENPERIN}, dalam hal terjadi perubahan identitas perusahaan, perusahaan wajib menyampaikan akta perubahan beserta dokumen persetujuan yang diterbitkan oleh kementerian yang menyelenggarakan urusan pemerintahan di bidang hukum sebagai bagian dari perubahan LHVKI.`,
        ],
  conclusion: (p) =>
    !p.hasDocument
      ? `${p.company} tidak memiliki perubahan akta, sehingga aspek ini dinyatakan <strong>Tidak Berlaku</strong>.`
      : `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki Akta Perubahan Nomor ${p.field("Nomor Akta Perubahan")} tanggal ${p.field("Tanggal Akta Perubahan")}, yang dibuat oleh ${p.field("Nama Notaris")}, Notaris. Dengan demikian, aspek verifikasi Akta Perubahan dinyatakan ${status(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Perpajakan
// ---------------------------------------------------------------------------------------------

const npwp: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan perusahaan memiliki identitas perpajakan yang sah dan masih aktif.",
  intro: () => [
    `Verifikasi terhadap Nomor Pokok Wajib Pajak (NPWP) dilakukan melalui pemeriksaan dokumen identitas perpajakan yang diterbitkan oleh Direktorat Jenderal Pajak. Pemeriksaan bertujuan untuk memastikan bahwa perusahaan telah terdaftar sebagai wajib pajak dan memiliki identitas perpajakan yang sah sebagai salah satu persyaratan wajib dalam pengajuan ${VKI} sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 1 ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Nomor Pokok Wajib Pajak (NPWP) ${p.field("Nomor NPWP")} yang terdaftar atas nama perusahaan.`,
    "Hasil verifikasi menunjukkan bahwa nama wajib pajak dan alamat yang tercantum pada NPWP telah sesuai dengan data perusahaan pada dokumen legalitas lainnya, serta NPWP masih berstatus aktif dan dapat digunakan dalam memenuhi kewajiban perpajakan perusahaan.",
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki NPWP ${p.field("Nomor NPWP")} yang sah dan aktif. Dengan demikian, aspek kelengkapan identitas perpajakan dinyatakan ${status(p)} sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 1 ${PERMENPERIN}.`,
};

const taxProofSummary: DocumentNarrative = {
  keterangan: "Berlaku bagi perusahaan yang memiliki Perizinan Berusaha 3 (tiga) tahun atau lebih.",
  intro: () => [
    `Verifikasi terhadap Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir dilakukan untuk memastikan bahwa perusahaan telah memenuhi kewajiban perpajakan secara berkelanjutan selama 3 (tiga) tahun terakhir, sebagai salah satu persyaratan wajib bagi perusahaan yang telah memiliki Perizinan Berusaha 3 (tiga) tahun atau lebih sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 7 ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} telah menyampaikan bukti pembayaran pajak untuk 3 (tiga) tahun terakhir sebagai bagian dari pemenuhan kewajiban perpajakan perusahaan dalam pengajuan ${VKI}.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} bukti pembayaran pajak 3 (tiga) tahun terakhir. Dengan demikian, aspek ini dinyatakan ${status(p)} sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 7 ${PERMENPERIN}.`,
};

const skt: DocumentNarrative = {
  keterangan: "Digunakan sebagai pengganti bukti pembayaran pajak 3 (tiga) tahun terakhir bagi perusahaan yang memiliki Perizinan Berusaha kurang dari 3 (tiga) tahun.",
  intro: () => [
    `Verifikasi terhadap Surat Keterangan Terdaftar (SKT) Pajak dilakukan sebagai pengganti Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir bagi perusahaan dengan Perizinan Berusaha kurang dari 3 (tiga) tahun, sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 7 ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Surat Keterangan Terdaftar Nomor ${p.field("Nomor Surat Keterangan Terdaftar (SKT)")} yang diterbitkan oleh ${p.field("KPP Terdaftar")} pada tanggal ${p.field("Tanggal Terdaftar")}.`,
    "Hasil verifikasi menunjukkan bahwa data wajib pajak yang tercantum dalam SKT, meliputi NPWP, nama wajib pajak, dan alamat wajib pajak, telah sesuai dengan data perusahaan pada dokumen legalitas lainnya, sehingga dapat digunakan sebagai pengganti Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir sesuai ketentuan yang berlaku bagi perusahaan dengan Perizinan Berusaha kurang dari 3 (tiga) tahun.",
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki SKT Nomor ${p.field("Nomor Surat Keterangan Terdaftar (SKT)")} yang diterbitkan oleh ${p.field("KPP Terdaftar")}. Dengan demikian, aspek ini dinyatakan ${status(p)} sebagai pengganti Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir sesuai Pasal 30 ayat (2) huruf b angka 7 ${PERMENPERIN}.`,
};

const PASAL_31_1_A = `Pasal 31 ayat (1) huruf a ${PERMENPERIN}`;

type TaxSupportText = { keterangan: string; intro: string; finding: (company: string) => string; short: string };

/** Rincian bukti pajak — one checklist row per type (`tax-support:{type}`), told apart by title. */
const TAX_SUPPORT_TEXTS: Record<string, TaxSupportText> = {
  "Surat Pemberitahuan (SPT) Tahunan Badan": {
    keterangan: "Digunakan untuk memverifikasi kepatuhan pelaporan pajak perusahaan.",
    intro: `Verifikasi terhadap Surat Pemberitahuan (SPT) Tahunan Badan dilakukan sebagai dokumen pendukung untuk memastikan kepatuhan pelaporan pajak tahunan perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
    finding: (c) => `Berdasarkan hasil pemeriksaan dokumen, ${c} telah menyampaikan Surat Pemberitahuan (SPT) Tahunan Badan sebagai bukti kepatuhan pelaporan pajak tahunan perusahaan.`,
    short: "SPT Tahunan Badan",
  },
  "Bukti Penerimaan Elektronik (BPE) SPT Tahunan": {
    keterangan: "Membuktikan bahwa SPT Tahunan telah diterima oleh Direktorat Jenderal Pajak.",
    intro: `Verifikasi terhadap Bukti Penerimaan Elektronik (BPE) dilakukan untuk memastikan bahwa Surat Pemberitahuan (SPT) Tahunan telah diterima secara resmi oleh Direktorat Jenderal Pajak, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
    finding: (c) => `Berdasarkan hasil pemeriksaan dokumen, ${c} telah menyampaikan Bukti Penerimaan Elektronik (BPE) yang membuktikan SPT Tahunan telah diterima oleh Direktorat Jenderal Pajak.`,
    short: "BPE SPT Tahunan",
  },
  "Surat Setoran Pajak (SSP)": {
    keterangan: "Diverifikasi sebagai bukti penyetoran kewajiban perpajakan.",
    intro: `Verifikasi terhadap Surat Setoran Pajak (SSP) dilakukan sebagai bukti penyetoran kewajiban perpajakan perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
    finding: (c) => `Berdasarkan hasil pemeriksaan dokumen, ${c} telah menyampaikan Surat Setoran Pajak (SSP) sebagai bukti penyetoran kewajiban perpajakan perusahaan.`,
    short: "SSP",
  },
  "Bukti Pembayaran Pajak Penghasilan (PPh) Badan": {
    keterangan: "Digunakan untuk memverifikasi pemenuhan kewajiban pembayaran Pajak Penghasilan Badan.",
    intro: `Verifikasi terhadap bukti pembayaran Pajak Penghasilan (PPh) Badan dilakukan untuk memastikan pemenuhan kewajiban pembayaran PPh Badan perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
    finding: (c) => `Berdasarkan hasil pemeriksaan dokumen, ${c} telah menyampaikan bukti pembayaran Pajak Penghasilan (PPh) Badan sebagai bagian dari pemenuhan kewajiban perpajakan perusahaan.`,
    short: "bukti pembayaran PPh Badan",
  },
  "Bukti Pembayaran Pajak Pertambahan Nilai (PPN)": {
    keterangan: "Diverifikasi untuk memastikan kepatuhan pembayaran PPN sesuai kegiatan usaha perusahaan.",
    intro: `Verifikasi terhadap bukti pembayaran Pajak Pertambahan Nilai (PPN) dilakukan untuk memastikan kepatuhan pembayaran PPN sesuai dengan kegiatan usaha perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
    finding: (c) => `Berdasarkan hasil pemeriksaan dokumen, ${c} telah menyampaikan bukti pembayaran Pajak Pertambahan Nilai (PPN) sesuai dengan kegiatan usaha yang dijalankan.`,
    short: "bukti pembayaran PPN",
  },
  "Bukti Setor Pajak melalui e-Billing": {
    keterangan: "Digunakan sebagai bukti pembayaran pajak secara elektronik melalui sistem DJP.",
    intro: `Verifikasi terhadap bukti setor pajak melalui e-Billing dilakukan sebagai bukti pembayaran pajak secara elektronik melalui sistem Direktorat Jenderal Pajak (DJP), sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
    finding: (c) => `Berdasarkan hasil pemeriksaan dokumen, ${c} telah menyampaikan bukti setor pajak melalui sistem e-Billing Direktorat Jenderal Pajak.`,
    short: "bukti setor e-Billing",
  },
};

const TAX_SUPPORT_KEY_TITLE: Record<string, string> = {
  "spt-tahunan": "Surat Pemberitahuan (SPT) Tahunan Badan",
  bpe: "Bukti Penerimaan Elektronik (BPE) SPT Tahunan",
  ssp: "Surat Setoran Pajak (SSP)",
  "pph-badan": "Bukti Pembayaran Pajak Penghasilan (PPh) Badan",
  ppn: "Bukti Pembayaran Pajak Pertambahan Nilai (PPN)",
  "e-billing": "Bukti Setor Pajak melalui e-Billing",
};

function taxSupportText(p: DocTextParams): TaxSupportText {
  const title = baseTitle(p);
  return (
    TAX_SUPPORT_TEXTS[title] ?? {
      keterangan: "",
      intro: `Verifikasi terhadap ${title} dilakukan sebagai dokumen pendukung pemenuhan kewajiban perpajakan perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
      finding: (c) => `Berdasarkan hasil pemeriksaan dokumen, ${c} telah menyampaikan ${title} sebagai bagian dari pemenuhan kewajiban perpajakan perusahaan.`,
      short: title,
    }
  );
}

const taxSupport: DocumentNarrative = {
  keterangan: "Digunakan sebagai dokumen pendukung pemenuhan kewajiban perpajakan perusahaan.",
  keteranganFor: (key) => TAX_SUPPORT_TEXTS[TAX_SUPPORT_KEY_TITLE[key.split(":")[1] ?? ""] ?? ""]?.keterangan,
  intro: (p) => [taxSupportText(p).intro],
  findings: (p) => [taxSupportText(p).finding(p.company)],
  conclusion: (p) => `${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} ${taxSupportText(p).short}. Aspek ini dinyatakan ${status(p)}.`,
};

const skf: DocumentNarrative = {
  keterangan: "Digunakan sebagai bukti status kepatuhan perpajakan perusahaan apabila tersedia.",
  intro: () => [
    `Verifikasi terhadap Surat Keterangan Fiskal (SKF) dilakukan sebagai bukti status kepatuhan perpajakan perusahaan apabila tersedia, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai ${PASAL_31_1_A}.`,
  ],
  findings: (p) => [
    `Dokumen ini bersifat pendukung dan hanya diperiksa apabila tersedia pada permohonan ${p.company}; ketiadaannya tidak memengaruhi kelengkapan persyaratan wajib Perpajakan.`,
  ],
  conclusion: (p) =>
    !p.hasDocument
      ? `${p.company} tidak menyampaikan Surat Keterangan Fiskal (SKF) karena dokumen ini bersifat pendukung dan hanya diperiksa apabila tersedia. Aspek ini dinyatakan <strong>Tidak Berlaku</strong>.`
      : `${p.company} telah menyampaikan Surat Keterangan Fiskal (SKF) sebagai bukti pendukung status kepatuhan perpajakan. Aspek ini dinyatakan ${status(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Dokumen Lokasi
// ---------------------------------------------------------------------------------------------

/** Keterangan per bukti kepemilikan/penguasaan type (`location:{id}:{ownership|lease}:{type}`). */
const TENURE_KETERANGAN: Record<string, string> = {
  "ownership:SHM": "Digunakan apabila fasilitas produksi atau gudang merupakan milik perusahaan.",
  "ownership:HGB": "Digunakan apabila bangunan berdiri di atas tanah dengan status HGB.",
  "ownership:AJB": "Digunakan sebagai bukti kepemilikan bangunan apabila relevan.",
  "ownership:LAINNYA": "Dokumen lain yang sah yang dapat menunjukkan hak penguasaan atas fasilitas produksi dan/atau gudang.",
  "lease:SEWA_MENYEWA": "Digunakan apabila fasilitas produksi atau gudang disewa dari pihak lain.",
  "lease:PINJAM_PAKAI": "Digunakan apabila fasilitas digunakan berdasarkan perjanjian pinjam pakai.",
  "lease:KERJA_SAMA": "Digunakan apabila fasilitas digunakan berdasarkan kerja sama dengan pihak lain.",
  "lease:LAINNYA": "Dokumen lain yang sah yang dapat menunjukkan hak penguasaan atas fasilitas produksi dan/atau gudang.",
};

function leasePeriod(p: DocTextParams): [string, string] {
  const masa = p.field("Masa Sewa");
  if (masa === "—") return ["—", "—"];
  const [start, end] = masa.split(" s.d. ");
  return [start || "—", end || "—"];
}

const locationTenure: DocumentNarrative = {
  keterangan: TENURE_KETERANGAN["ownership:LAINNYA"],
  keteranganFor: (key) => {
    const [, , kind, type] = key.split(":");
    return TENURE_KETERANGAN[`${kind}:${type}`];
  },
  intro: (p) => [
    `Verifikasi terhadap ${baseTitle(p)} lokasi ${p.field("Jenis Lokasi").toLowerCase()} dilakukan untuk memastikan bahwa perusahaan memiliki atau menguasai fasilitas bangunan yang digunakan dalam pelaksanaan kegiatan industri, sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 6 dan Pasal 31 ayat (2) huruf a ${PERMENPERIN}.`,
  ],
  findings: (p) => {
    const typeLabel = baseTitle(p);
    const label = p.field("Jenis Lokasi");
    const isOwned = p.field("Status Bangunan") === "Milik Sendiri";
    const base = [
      `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan ${typeLabel} untuk lokasi ${label} yang beralamat di ${p.field("Alamat")}, ${p.field("Kota/Kabupaten")}, ${p.field("Provinsi")} dengan status bangunan ${isOwned ? "milik sendiri" : "sewa"}.`,
      `Hasil verifikasi menunjukkan bahwa ${typeLabel} yang diunggah perusahaan menunjukkan hak penggunaan yang sah atas lokasi tersebut dan konsisten dengan alamat lokasi yang tercantum dalam data permohonan.`,
    ];
    if (isOwned) return base;
    const [start, end] = leasePeriod(p);
    return [...base, `Perjanjian sewa dibuat dengan pemilik asli ${p.field("Pemilik Asli")} untuk masa sewa ${start} sampai dengan ${end}.`];
  },
  conclusion: (p) => {
    const isOwned = p.field("Status Bangunan") === "Milik Sendiri";
    return `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.memenuhi ? "memiliki" : "belum melengkapi"} ${baseTitle(p)} yang sah atas lokasi ${p.field("Jenis Lokasi")}${isOwned ? "" : " beserta data perjanjian sewa (pemilik asli dan masa sewa)"}. Dengan demikian, aspek ini dinyatakan ${status(p)}.`;
  },
};

const warehouseLabel = (p: DocTextParams) => titleContext(p) || "Gudang";

const warehouseRegistration: DocumentNarrative = {
  keterangan: "Tanda Daftar Gudang membuktikan bahwa fasilitas gudang telah terdaftar secara resmi.",
  intro: () => [
    "Verifikasi terhadap Tanda Daftar Gudang dilakukan untuk memastikan bahwa fasilitas gudang perusahaan telah terdaftar secara resmi sesuai dengan ketentuan peraturan perundang-undangan di bidang perdagangan dan perindustrian.",
  ],
  findings: (p) => {
    const jenis = p.field("Jenis Tanda Daftar");
    return [
      p.hasDocument
        ? `Berdasarkan hasil pemeriksaan dokumen, gudang milik ${p.company} yang beralamat di ${p.field("Alamat Gudang")} telah memiliki ${jenis === "—" ? "Tanda Daftar Gudang" : jenis} Nomor ${p.field("Nomor Tanda Daftar Gudang")} yang diterbitkan oleh ${p.field("Instansi Penerbit")} pada tanggal ${p.field("Tanggal Terbit")}.`
        : `Berdasarkan hasil pemeriksaan dokumen, gudang milik ${p.company} yang beralamat di ${p.field("Alamat Gudang")} belum dilengkapi dengan Tanda Daftar Gudang.`,
    ];
  },
  conclusion: (p) =>
    `${p.company} ${p.hasDocument ? "telah melengkapi" : "belum melengkapi"} Tanda Daftar Gudang untuk lokasi ${warehouseLabel(p)}. Aspek ini dinyatakan ${status(p)}.`,
};

const warehouseLayout: DocumentNarrative = {
  keterangan: "Layout gudang menunjukkan tata letak dan kapasitas ruang penyimpanan.",
  intro: () => [
    "Verifikasi terhadap Layout Gudang dilakukan untuk memastikan tata letak dan kapasitas ruang penyimpanan gudang sesuai dengan skala kegiatan usaha perusahaan yang dimohonkan.",
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} layout gudang untuk lokasi ${warehouseLabel(p)} yang menggambarkan tata letak ruang penyimpanan.`,
  ],
  conclusion: (p) =>
    `${p.company} ${p.hasDocument ? "telah melengkapi" : "belum melengkapi"} Layout Gudang untuk lokasi ${warehouseLabel(p)}. Aspek ini dinyatakan ${status(p)}.`,
};

const PASAL_30_B_6 = `Pasal 30 ayat (2) huruf b angka 6 ${PERMENPERIN}`;

/** "Nomor … tertanggal …, ditandatangani oleh …" — shared data block of every VKI surat pernyataan. */
const letterIdentity = (p: DocTextParams) =>
  `Nomor ${p.field("Nomor Surat Pernyataan")} tertanggal ${p.field("Tanggal Surat Pernyataan")}, ditandatangani oleh ${p.field("Nama Penandatangan")} selaku pihak berwenang mewakili perusahaan`;

const spMemilikiMenguasai: DocumentNarrative = {
  keterangan: "Pernyataan kepemilikan atau penguasaan atas mesin/peralatan produksi.",
  intro: () => [
    `Verifikasi terhadap Surat Pernyataan Memiliki atau Menguasai dilakukan untuk memastikan bahwa perusahaan memiliki atau menguasai fasilitas bangunan — meliputi area produksi, gudang bahan baku, gudang bahan penolong, dan/atau gudang hasil produksi — yang digunakan dalam pelaksanaan kegiatan industri, sesuai dengan ketentuan ${PASAL_30_B_6}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan Surat Pernyataan Memiliki atau Menguasai ${letterIdentity(p)}.`,
    "Isi pernyataan menyatakan bahwa perusahaan memiliki atau menguasai secara sah fasilitas bangunan yang digunakan untuk menunjang kegiatan produksi. Hasil verifikasi menunjukkan bahwa status kepemilikan/penguasaan yang dinyatakan konsisten dengan data lokasi yang diajukan dalam permohonan.",
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.memenuhi ? "telah menyampaikan" : "belum menyampaikan secara lengkap"} Surat Pernyataan Memiliki atau Menguasai. Dengan demikian, aspek kepemilikan/penguasaan fasilitas bangunan dinyatakan ${status(p)} sesuai dengan ketentuan ${PASAL_30_B_6}.`,
};

// ---------------------------------------------------------------------------------------------
// Dokumen Pendukung VKI (kemampuan produksi) — Bukti Pembayaran Listrik
// ---------------------------------------------------------------------------------------------

const listrik: DocumentNarrative = {
  keterangan: "Bukti pembayaran listrik 3 (tiga) bulan sebelumnya untuk memastikan penggunaan daya listrik sesuai dengan skala operasional dan kapasitas produksi.",
  intro: () => [
    `Verifikasi terhadap Bukti Pembayaran Listrik dilakukan untuk memastikan bahwa penggunaan daya listrik perusahaan sesuai dengan skala operasional dan kapasitas produksi yang diajukan dalam permohonan ${VKI}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan bukti pembayaran listrik untuk periode ${p.field("Periode Tagihan")} dengan nominal pembayaran ${p.field("Nominal Pembayaran")} dan pemakaian sebesar ${p.field("Pemakaian Listrik (kWh)")} kWh.`,
    "Hasil verifikasi menunjukkan bahwa nominal dan pemakaian listrik yang tercantum pada dokumen wajar terhadap skala operasional dan kapasitas produksi yang diklaim perusahaan, serta tidak ditemukan indikasi ketidaksesuaian pada dokumen yang diperiksa.",
  ],
  conclusion: (p) =>
    `${p.company} ${p.memenuhi ? "telah melengkapi" : "belum melengkapi"} bukti pembayaran listrik periode ${p.field("Periode Tagihan")}. Aspek ini dinyatakan ${status(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Tenaga Kerja
// ---------------------------------------------------------------------------------------------

/** Data block: one row per kategori ("12 orang"), or a single "Data Tenaga Kerja: Belum Diisi". */
function workforce(p: DocTextParams): { kategori: string; jumlah: string }[] {
  if (p.fields.length === 1 && p.fields[0].label === "Data Tenaga Kerja") return [];
  return p.fields.map((f) => ({ kategori: f.label, jumlah: f.value === "—" ? "—" : f.value.replace(/ orang$/, "") }));
}

const PASAL_30_B_3 = `Pasal 30 ayat (2) huruf b angka 3 ${PERMENPERIN}`;

const tenagaKerja: DocumentNarrative = {
  keterangan: "Memuat jumlah tenaga kerja yang mendukung kegiatan industri.",
  intro: () => [
    `Verifikasi terhadap Surat Pernyataan Jumlah Tenaga Kerja dilakukan untuk memastikan bahwa perusahaan memiliki tenaga kerja yang mendukung pelaksanaan kegiatan industri, sebagai salah satu persyaratan wajib dalam pengajuan ${VKI} sesuai dengan ketentuan ${PASAL_30_B_3}.`,
  ],
  findings: (p) => {
    const entries = workforce(p);
    if (entries.length === 0) return [`Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan rincian jumlah tenaga kerja per kategori.`];
    const total = entries.reduce((sum, e) => sum + (Number(e.jumlah) || 0), 0);
    const rincian = entries.map((e) => `${e.kategori} sejumlah ${e.jumlah} orang`).join(", ");
    return [
      `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyatakan memiliki tenaga kerja dengan rincian ${rincian}, dengan total ${total} orang yang mendukung pelaksanaan kegiatan industri perusahaan.`,
      "Hasil verifikasi menunjukkan bahwa jumlah dan kategori tenaga kerja yang dinyatakan perusahaan sesuai dengan skala kegiatan industri yang dijalankan dan tercantum dalam surat pernyataan yang ditandatangani oleh pihak berwenang perusahaan.",
    ];
  },
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.memenuhi ? "telah menyampaikan" : "belum menyampaikan secara lengkap"} Surat Pernyataan Jumlah Tenaga Kerja. Dengan demikian, aspek ini dinyatakan ${status(p)} sesuai dengan ketentuan ${PASAL_30_B_3}.`,
};

// ---------------------------------------------------------------------------------------------
// Surat Pernyataan
// ---------------------------------------------------------------------------------------------

/**
 * VKI surat pernyataan pages. Each cites its OWN basis from legal-basis.ts: Alur Proses is a VKI
 * requirement (Pasal 30 ayat (2) huruf b angka 5); Tidak Diperjualbelikan and Kebenaran Data are
 * Pertimbangan Teknis requirements (Pasal 8) collected as VKI supporting documents.
 */
function suratPernyataan(keterangan: string, isiDeskripsi: string, pasalKeterangan: string, basis: LegalBasis): DocumentNarrative {
  const pendukung = basis.kind === "TERKAIT";
  const dasar = pendukung
    ? `sebagaimana dipersyaratkan dalam permohonan Pertimbangan Teknis sesuai dengan ketentuan ${cite(basis)}, dan dikumpulkan sebagai dokumen pendukung pengajuan ${VKI}`
    : `sebagaimana dipersyaratkan dalam pengajuan ${VKI}, sesuai dengan ketentuan ${cite(basis)}`;
  return {
    keterangan,
    intro: (p) => [`Verifikasi terhadap ${p.title} dilakukan untuk memastikan bahwa perusahaan telah menyampaikan pernyataan resmi ${dasar}. ${pasalKeterangan}`],
    findings: (p) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan ${p.title} ${letterIdentity(p)}.`,
      `Isi pernyataan menyatakan bahwa ${isiDeskripsi} Hasil verifikasi menunjukkan bahwa surat pernyataan telah dibuat sesuai format yang dipersyaratkan dan ditandatangani oleh pihak yang berwenang mewakili perusahaan.`,
    ],
    conclusion: (p) =>
      `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.memenuhi ? "telah menyampaikan" : "belum menyampaikan secara lengkap"} ${p.title}. Dengan demikian, aspek ini dinyatakan ${status(p)}${pendukung ? " sebagai dokumen pendukung" : ""} sesuai dengan ketentuan ${cite(basis)}.`,
  };
}

// ---------------------------------------------------------------------------------------------
// Chapters
// ---------------------------------------------------------------------------------------------

const SECTIONS: SchemeNarrative["sections"] = {
  legalitas: {
    title: "Pemeriksaan Administratif Kelengkapan Dokumen Perizinan Berusaha",
    desc: "Dasar hukum dan klasifikasi dokumen perizinan berusaha yang diperiksa",
    intro: [
      `Pemeriksaan administratif perizinan berusaha dilaksanakan untuk memastikan bahwa perusahaan telah memiliki legalitas usaha yang sah serta memenuhi persyaratan administrasi dalam pelaksanaan ${VKI} sesuai dengan ketentuan ${PERMENPERIN}.`,
      "Pemeriksaan dilakukan melalui verifikasi terhadap dokumen persyaratan wajib yang menjadi dasar dalam pengajuan Verifikasi Kemampuan Industri sebagaimana diatur dalam Pasal 30 ayat (2), serta dokumen pendukung verifikasi yang digunakan untuk memastikan keabsahan, konsistensi, dan kesesuaian identitas badan usaha berdasarkan hasil pemeriksaan dokumen sebagaimana dimaksud dalam Pasal 31 ayat (1) huruf a.",
    ],
  },
  perpajakan: {
    title: "Pemeriksaan Administratif Perpajakan",
    desc: "Dasar hukum dan klasifikasi dokumen perpajakan yang diperiksa",
    intro: [
      `Pemeriksaan administratif perpajakan dilaksanakan untuk memastikan bahwa perusahaan telah memenuhi persyaratan administrasi perpajakan sebagai bagian dari pelaksanaan ${VKI} sesuai dengan ketentuan ${PERMENPERIN}.`,
      "Pemeriksaan dilakukan melalui verifikasi terhadap dokumen persyaratan wajib yang dipersyaratkan dalam permohonan Verifikasi Kemampuan Industri sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 1, meliputi Nomor Pokok Wajib Pajak (NPWP) perusahaan.",
    ],
  },
  lokasi: {
    title: "Pemeriksaan Administratif Kepemilikan Bangunan",
    desc: "Dasar hukum dan klasifikasi dokumen kepemilikan/penguasaan fasilitas bangunan yang diperiksa",
    intro: [
      `Pemeriksaan administratif kepemilikan/penguasaan bangunan dilakukan untuk memastikan bahwa perusahaan memiliki atau menguasai fasilitas bangunan yang digunakan dalam pelaksanaan kegiatan industri, meliputi area produksi, gudang bahan baku, gudang bahan penolong, dan/atau gudang hasil produksi. Pemeriksaan ini bertujuan untuk memberikan keyakinan bahwa kegiatan produksi dilaksanakan pada fasilitas yang berada dalam penguasaan perusahaan dan mendukung operasional industri sesuai dengan ruang lingkup usaha yang diajukan dalam permohonan ${VKI}.`,
      "Pemeriksaan dilakukan melalui penelaahan terhadap Surat Pernyataan memiliki/menguasai gudang bahan baku dan/atau bahan penolong dan/atau gudang hasil produksi sebagai persyaratan administratif sesuai Pasal 30 ayat (2) huruf b angka 6 Permenperin Nomor 27 Tahun 2025. Selain itu, apabila tersedia, dilakukan pemeriksaan terhadap dokumen pendukung yang menunjukkan status kepemilikan atau penguasaan fasilitas bangunan, seperti Sertifikat Hak Milik (SHM), Sertifikat Hak Guna Bangunan (HGB), Akta Jual Beli (AJB), Perjanjian Sewa Menyewa, Perjanjian Pinjam Pakai, Perjanjian Kerja Sama, atau dokumen lain yang sah.",
      "Selanjutnya, kesesuaian antara dokumen administratif dengan kondisi aktual di lapangan diverifikasi melalui observasi lokasi industri sesuai ketentuan Pasal 31 Permenperin Nomor 27 Tahun 2025, untuk memastikan bahwa fasilitas bangunan yang digunakan perusahaan benar-benar tersedia, digunakan untuk kegiatan produksi, dan sesuai dengan informasi yang tercantum dalam dokumen permohonan VKI.",
    ],
  },
  // Printed before the refactor without a section text — the chapter then fell back to
  // "Pemeriksaan Administratif {category}" and a company-specific divider line, kept as-is.
  "kemampuan-produksi": {
    title: "Pemeriksaan Administratif Dokumen Pendukung VKI",
    desc: "",
    intro: [],
  },
  "tenaga-kerja": {
    title: "Pemeriksaan Administratif Tenaga Kerja",
    desc: "Dasar hukum dan klasifikasi dokumen tenaga kerja yang diperiksa",
    intro: [
      `Pemeriksaan administratif tenaga kerja dilakukan untuk memastikan bahwa perusahaan telah memenuhi persyaratan administratif terkait ketersediaan tenaga kerja dalam mendukung pelaksanaan kegiatan industri sebagaimana diatur dalam ${PERMENPERIN}.`,
    ],
  },
  "surat-pernyataan": {
    title: "Pemeriksaan Administratif Surat Pernyataan",
    desc: "Kelengkapan surat pernyataan sebagai persyaratan VKI",
    intro: [
      `Pemeriksaan administratif surat pernyataan dilakukan untuk memastikan bahwa perusahaan telah memenuhi persyaratan administratif terkait surat pernyataan dalam mendukung pelaksanaan kegiatan industri sebagaimana diatur dalam ${PERMENPERIN}.`,
    ],
  },
};

export const VKI_NARRATIVE: SchemeNarrative = {
  foreword:
    "Laporan dokumen ini disusun berdasarkan hasil pemeriksaan kelengkapan dan kesesuaian dokumen permohonan oleh verifikator, sebagai bagian dari proses Verifikasi Kemampuan Industri (VKI) sebelum diteruskan kepada pihak terkait.",
  summary: ({ company }) =>
    `Verifikasi dokumen permohonan VKI milik ${company} meliputi pemeriksaan kelengkapan legalitas, perpajakan, lokasi, dan dokumen pendukung terhadap data permohonan yang diajukan oleh verifikator dokumen.`,
  wajibLegend: "Persyaratan Wajib → dokumen yang memang dipersyaratkan atau menjadi dasar pemenuhan VKI.",
  chapterOpening: ({ company, chapter, allMet }) =>
    `Berdasarkan hasil pemeriksaan dokumen dan observasi lapangan terhadap aspek ${chapter.toLowerCase()}, diperoleh hasil bahwa ${company} ${allMet ? "telah memenuhi kelengkapan dokumen yang dipersyaratkan" : "memiliki sebagian dokumen yang masih perlu dilengkapi"} dengan ketentuan dalam pelaksanaan ${VKI}.`,
  chapterClosing: ({ company, chapter, allMet }) =>
    `Berdasarkan keseluruhan hasil verifikasi, Aspek ${chapter} ${company} dinyatakan <strong>${allMet ? "Memenuhi" : "Belum Memenuhi Seluruhnya"}</strong> sebagai dasar pelaksanaan Verifikasi Kemampuan Industri sesuai dengan ketentuan ${PERMENPERIN}.`,
  sections: SECTIONS,
  documents: {
    nib,
    "kbli-utama": kbliUtama,
    "kbli-pendukung": kbliPendukung,
    notarial,
    "notarial-amendment": notarialAmendment,
    sk,
    npwp,
    "tax-proof-summary": taxProofSummary,
    skt,
    "tax-support": taxSupport,
    "tax-support-skf": skf,
    "location-tenure-kantor": locationTenure,
    "location-tenure-pabrik": locationTenure,
    "location-tenure-gudang": locationTenure,
    "warehouse-registration": warehouseRegistration,
    "warehouse-layout": warehouseLayout,
    "sp-memiliki-menguasai": spMemilikiMenguasai,
    "alur-proses": suratPernyataan(
      "Pernyataan mengenai alur proses produksi yang dijalankan.",
      "alur proses produksi yang dijalankan perusahaan telah sesuai dengan kapasitas dan produk yang dimohonkan.",
      "Alur proses produksi dinyatakan konsisten dengan produk dan kapasitas yang dimohonkan.",
      L.alurProses,
    ),
    listrik,
    "tenaga-kerja": tenagaKerja,
    "sp-tidak-diperjualbelikan": suratPernyataan(
      "Pernyataan bahwa mesin/peralatan produksi tidak akan diperjualbelikan atau dipindahtangankan.",
      "mesin/peralatan produksi yang digunakan tidak akan diperjualbelikan atau dipindahtangankan kepada pihak lain selama digunakan dalam kegiatan industri perusahaan.",
      "Dokumen ini mencakup seluruh mesin/peralatan produksi yang menjadi objek permohonan.",
      L.spTidakDiperjualbelikan,
    ),
    "sp-kebenaran-data": suratPernyataan(
      "Pernyataan bahwa seluruh data dan dokumen yang disampaikan benar dan dapat dipertanggungjawabkan.",
      "seluruh data dan dokumen yang disampaikan dalam permohonan adalah benar dan dapat dipertanggungjawabkan.",
      "Pernyataan ini mencakup seluruh data yang diajukan dalam permohonan Verifikasi Kemampuan Industri.",
      L.spKebenaranData,
    ),
  },
};
