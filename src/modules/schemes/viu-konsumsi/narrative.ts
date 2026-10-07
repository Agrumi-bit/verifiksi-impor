import { NON_INDUSTRI_SUPPORT_DOC_DEFS } from "@/modules/applications/financial-capability-defs";
import { baseTitle, cite, listValues, PERMENPERIN, statusHtml, titleContext } from "../shared/narrative-helpers";
import type { DocTextParams, DocumentNarrative, LegalBasis, SchemeNarrative } from "../types";
import { VIU_KONSUMSI_DOCUMENTS } from "./documents";
import { VIU_KONSUMSI_LEGAL_BASIS as L } from "./legal-basis";

/**
 * Report narrative for VIU Barang Konsumsi ONLY — Permenperin 27/2025 Pasal 26 huruf c,
 * Pasal 37 ayat (2) huruf c dan ayat (3)–(9), Pasal 38, Pasal 39 ayat (5).
 * Never mention VKI, pabrik, kemampuan produksi or bahan baku here (see terms.forbiddenTerms).
 */
const VIU = "Verifikasi Importir Umum (VIU) untuk Impor Produk Tekstil sebagai Barang Konsumsi";
const VIU_SHORT = "VIU Barang Konsumsi";

function basisOf(id: string): LegalBasis {
  const def = VIU_KONSUMSI_DOCUMENTS.find((d) => d.id === id);
  if (!def) throw new Error(`VIU Konsumsi: dokumen "${id}" tidak terdaftar di documents.ts`);
  return def.legalBasis;
}

// ---------------------------------------------------------------------------------------------
// Legalitas
// ---------------------------------------------------------------------------------------------

const nib: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan Perizinan Berusaha di bidang perdagangan besar yang sah, identitas Perusahaan API-U, dan alamat kantor sesuai data permohonan.",
  intro: () => [
    `Verifikasi terhadap Nomor Induk Berusaha (NIB) dilakukan melalui pemeriksaan Perizinan Berusaha yang diterbitkan melalui sistem Online Single Submission (OSS), untuk memastikan bahwa Perusahaan API-U memiliki Perizinan Berusaha di bidang perdagangan besar sebagaimana dipersyaratkan dalam ${cite(L.perizinanBerusaha)}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Nomor Induk Berusaha (NIB) ${p.field("Nomor Induk Berusaha (NIB)")} yang merupakan identitas resmi perusahaan dalam menjalankan kegiatan usaha perdagangan.`,
    "Hasil verifikasi menunjukkan bahwa nama perusahaan, alamat, dan informasi kegiatan usaha yang tercantum pada NIB sesuai dengan dokumen legalitas lain yang diperiksa, serta NIB masih berlaku. Identitas Perusahaan API-U tersebut menjadi bagian dari isi Laporan Hasil Verifikasi Importir Umum (LHVIU) sesuai Pasal 39 ayat (5) huruf b " + PERMENPERIN + ".",
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki NIB ${p.field("Nomor Induk Berusaha (NIB)")} yang masih berlaku sesuai ${cite(L.perizinanBerusaha)}. Dengan demikian, aspek Perizinan Berusaha dinyatakan ${statusHtml(p)}.`,
};

const kbliUtama: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan KBLI Utama termasuk KBLI perdagangan besar yang ditetapkan bagi VIU Barang Konsumsi dan sesuai dengan pos tarif/HS yang akan diimpor.",
  intro: () => [
    `Verifikasi terhadap Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) Utama dilakukan melalui pemeriksaan Lampiran NIB, untuk memastikan bahwa Perusahaan API-U memiliki KBLI perdagangan besar sebagaimana ditetapkan dalam ${cite(L.perizinanBerusaha)}, yaitu KBLI 46411, 46412, 46414, 46499, 46691, 46699, 46795, dan/atau 46100, serta menilai kesesuaian KBLI dengan pos tarif/HS Produk Tekstil yang akan diimpor sesuai Pasal 38 ayat (2) huruf b ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki KBLI Utama ${listValues(p, ["Status KBLI"])} yang tercantum dalam Lampiran NIB.`,
    "Hasil verifikasi menunjukkan bahwa KBLI tersebut merupakan kegiatan usaha perdagangan besar yang menjadi dasar Perusahaan API-U untuk melakukan Impor Produk Tekstil sebagai barang konsumsi, dan sejalan dengan pos tarif/HS produk yang diajukan dalam permohonan.",
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki KBLI Utama ${listValues(p, ["Status KBLI"])} yang sesuai dengan ketentuan ${cite(L.perizinanBerusaha)} dan Pasal 38 ayat (2) huruf b. Dengan demikian, aspek kesesuaian KBLI Utama dinyatakan ${statusHtml(p)}.`,
};

/** The report's KBLI Pendukung field reads "Tidak ada KBLI pendukung" when the company has none. */
const hasNoKbliPendukung = (p: DocTextParams) => p.fields.every((f) => !f.label.startsWith("KBLI Pendukung") || /tidak ada/i.test(f.value));

const kbliPendukung: DocumentNarrative = {
  keterangan: "Diperiksa sebagai pendukung untuk melihat kegiatan usaha perdagangan lain yang tercantum pada Lampiran NIB, apabila ada.",
  intro: () => [
    "Verifikasi terhadap KBLI Pendukung dilakukan melalui pemeriksaan Lampiran NIB untuk mengetahui kegiatan usaha lain yang dimiliki Perusahaan API-U di luar KBLI Utama, sebagai informasi pendukung identitas dan bidang usaha perusahaan.",
  ],
  findings: (p) =>
    hasNoKbliPendukung(p)
      ? [`Berdasarkan hasil pemeriksaan dokumen, ${p.company} tidak memiliki KBLI Pendukung selain KBLI Utama yang tercantum dalam Lampiran NIB.`]
      : [
          `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki KBLI Pendukung ${listValues(p)} yang tercantum dalam Lampiran NIB dan tidak bertentangan dengan kegiatan usaha perdagangan besar yang menjadi dasar permohonan.`,
        ],
  conclusion: (p) =>
    hasNoKbliPendukung(p)
      ? `${p.company} tidak memiliki KBLI Pendukung di luar KBLI Utama. Aspek ini dinyatakan <strong>Tidak Berlaku</strong>.`
      : `Berdasarkan hasil verifikasi dokumen, KBLI Pendukung ${p.company} telah diperiksa sebagai informasi pendukung. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

const sk: DocumentNarrative = {
  keterangan: "Dokumen pendukung untuk memastikan keabsahan badan hukum Perusahaan API-U dan konsistensi identitasnya dengan NIB.",
  intro: () => [
    `Verifikasi terhadap Surat Keputusan Menteri Hukum dan Hak Asasi Manusia dilakukan sebagai dokumen pendukung untuk memastikan keabsahan badan hukum Perusahaan API-U. Dokumen ini tidak dipersyaratkan dalam Pasal 37 ayat (2) huruf c, namun digunakan untuk memverifikasi identitas perusahaan yang dimuat dalam LHVIU sesuai Pasal 39 ayat (5) huruf b ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Surat Keputusan Menteri Hukum dan HAM Nomor ${p.field("Nomor SK Kemenkumham")} tentang pengesahan badan hukum perusahaan, dengan identitas yang konsisten dengan data pada NIB.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, SK Kemenkumham Nomor ${p.field("Nomor SK Kemenkumham")} milik ${p.company} konsisten dengan dokumen legalitas lainnya. Dokumen pendukung ini dinyatakan ${statusHtml(p)}.`,
};

const notarial: DocumentNarrative = {
  keterangan: "Dokumen pendukung untuk memastikan dasar pendirian dan konsistensi identitas Perusahaan API-U.",
  intro: () => [
    `Verifikasi terhadap Akta Pendirian dilakukan sebagai dokumen pendukung untuk memastikan dasar pendirian Perusahaan API-U serta konsistensi identitasnya dengan NIB dan SK Kemenkumham. Dokumen ini tidak dipersyaratkan dalam Pasal 37 ayat (2) huruf c ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Akta Pendirian Nomor ${p.field("Nomor Akta Pendirian")} yang dibuat oleh ${p.field("Nama Notaris")}, Notaris, pada tanggal ${p.field("Tanggal Akta Pendirian")}, dengan identitas perusahaan yang konsisten dengan dokumen legalitas lainnya.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, Akta Pendirian ${p.company} Nomor ${p.field("Nomor Akta Pendirian")} konsisten dengan dokumen legalitas lainnya. Dokumen pendukung ini dinyatakan ${statusHtml(p)}.`,
};

const notarialAmendment: DocumentNarrative = {
  keterangan: "Dokumen pendukung, diperiksa apabila perusahaan pernah melakukan perubahan anggaran dasar.",
  intro: () => [
    "Verifikasi terhadap Akta Perubahan dilakukan sebagai dokumen pendukung untuk memastikan bahwa perubahan data Perusahaan API-U telah dituangkan dalam akta notaris dan konsisten dengan NIB serta dokumen legalitas lainnya.",
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Akta Perubahan Nomor ${p.field("Nomor Akta Perubahan")} yang dibuat oleh ${p.field("Nama Notaris")}, Notaris, pada tanggal ${p.field("Tanggal Akta Perubahan")}. Perubahan identitas Perusahaan API-U sebelum masa berlaku LHVIU berakhir mewajibkan pengajuan VIU baru sesuai Pasal 40 ayat (1) huruf a ${PERMENPERIN}.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, Akta Perubahan ${p.company} Nomor ${p.field("Nomor Akta Perubahan")} konsisten dengan dokumen legalitas lainnya. Dokumen pendukung ini dinyatakan ${statusHtml(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Perpajakan
// ---------------------------------------------------------------------------------------------

const npwp: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan Perusahaan API-U terdaftar sebagai wajib pajak dengan NPWP yang sah dan aktif.",
  intro: () => [
    `Verifikasi terhadap Nomor Pokok Wajib Pajak (NPWP) dilakukan untuk memastikan bahwa Perusahaan API-U telah terdaftar sebagai wajib pajak dan memiliki identitas perpajakan yang sah, sebagaimana dipersyaratkan dalam ${cite(L.npwp)}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki NPWP ${p.field("Nomor NPWP")} yang terdaftar atas nama perusahaan, dengan nama dan alamat wajib pajak yang sesuai dengan dokumen legalitas lainnya.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki NPWP ${p.field("Nomor NPWP")} yang sah dan aktif sesuai ${cite(L.npwp)}. Dengan demikian, aspek ini dinyatakan ${statusHtml(p)}.`,
};

const PAJAK_PENDUKUNG = `Pasal 37 ayat (2) huruf c ${PERMENPERIN} hanya mensyaratkan NPWP; dokumen ini diperiksa sebagai pendukung kepatuhan perpajakan Perusahaan API-U.`;

const taxProofSummary: DocumentNarrative = {
  keterangan: "Dokumen pendukung kepatuhan pembayaran pajak 3 (tiga) tahun terakhir.",
  intro: () => [`Verifikasi terhadap Bukti Pembayaran Pajak 3 (Tiga) Tahun Terakhir dilakukan sebagai dokumen pendukung. ${PAJAK_PENDUKUNG}`],
  findings: (p) => [
    p.hasDocument
      ? `Berdasarkan hasil pemeriksaan dokumen, ${p.company} telah menyampaikan bukti pembayaran pajak untuk 3 (tiga) tahun terakhir.`
      : `Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan bukti pembayaran pajak 3 (tiga) tahun terakhir.`,
  ],
  conclusion: (p) => `Bukti pembayaran pajak 3 (tiga) tahun terakhir ${p.company} diperiksa sebagai dokumen pendukung dan dinyatakan ${statusHtml(p)}.`,
};

const skt: DocumentNarrative = {
  keterangan: "Dokumen pendukung status terdaftar Perusahaan API-U sebagai wajib pajak.",
  intro: () => [`Verifikasi terhadap Surat Keterangan Terdaftar (SKT) Pajak dilakukan sebagai dokumen pendukung. ${PAJAK_PENDUKUNG}`],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki Surat Keterangan Terdaftar Nomor ${p.field("Nomor Surat Keterangan Terdaftar (SKT)")} yang diterbitkan oleh ${p.field("KPP Terdaftar")} pada tanggal ${p.field("Tanggal Terdaftar")}.`,
  ],
  conclusion: (p) => `SKT Pajak ${p.company} diperiksa sebagai dokumen pendukung dan dinyatakan ${statusHtml(p)}.`,
};

const taxSupport: DocumentNarrative = {
  keterangan: "Dokumen pendukung kepatuhan perpajakan Perusahaan API-U.",
  intro: (p) => [`Verifikasi terhadap ${p.title} dilakukan sebagai dokumen pendukung. ${PAJAK_PENDUKUNG}`],
  findings: (p) => [
    p.hasDocument
      ? `Berdasarkan hasil pemeriksaan dokumen, ${p.company} telah menyampaikan ${p.title} sebagai bukti pendukung kepatuhan perpajakan.`
      : `Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan ${p.title}.`,
  ],
  conclusion: (p) => `${p.title} ${p.company} diperiksa sebagai dokumen pendukung dan dinyatakan ${statusHtml(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Lokasi (Kantor + Gudang)
// ---------------------------------------------------------------------------------------------

function tenure(kind: "kantor" | "gudang"): DocumentNarrative {
  const basis = kind === "kantor" ? L.kantor : L.gudang;
  const syarat =
    kind === "kantor"
      ? "kantor fisik dengan sisa waktu sewa paling singkat 1 (satu) tahun"
      : "gudang dengan jangka waktu sewa paling singkat 1 (satu) tahun";
  return {
    keterangan: `Bukti kepemilikan atau perjanjian sewa ${syarat}.`,
    intro: (p) => [
      `Verifikasi terhadap ${baseTitle(p)} untuk lokasi ${titleContext(p) || kind} dilakukan untuk memastikan bahwa Perusahaan API-U memiliki atau menguasai ${syarat}, sebagaimana dipersyaratkan dalam ${cite(basis)}.`,
    ],
    findings: (p) => {
      const out = [
        `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan ${baseTitle(p)} untuk lokasi ${titleContext(p) || kind} yang beralamat di ${p.field("Alamat")}, ${p.field("Kota/Kabupaten")}, ${p.field("Provinsi")}, dengan status bangunan ${p.field("Status Bangunan").toLowerCase()}.`,
      ];
      if (p.field("Masa Sewa") !== "—") {
        out.push(
          `Perjanjian sewa dibuat dengan pemilik ${p.field("Pemilik Asli")} untuk masa sewa ${p.field("Masa Sewa")}. Masa sewa tersebut dinilai terhadap ketentuan ${syarat}.`,
        );
      }
      out.push("Kesesuaian dokumen dengan kondisi lokasi diverifikasi melalui pemeriksaan lapangan sesuai Pasal 38 ayat (3) " + PERMENPERIN + ".");
      return out;
    },
    conclusion: (p) =>
      `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.memenuhi ? "memiliki" : "belum melengkapi"} bukti penguasaan yang sah atas lokasi ${titleContext(p) || kind} sesuai ${cite(basis)}. Dengan demikian, aspek ini dinyatakan ${statusHtml(p)}.`,
  };
}

const warehouseRegistration: DocumentNarrative = {
  keterangan: "Tanda daftar gudang atau SK penetapan gudang berikat / tempat penimbunan sementara dari kementerian di bidang keuangan.",
  intro: () => [
    `Verifikasi terhadap Tanda Daftar Gudang dilakukan untuk memastikan bahwa gudang Perusahaan API-U telah terdaftar, atau ditetapkan sebagai gudang berikat/tempat penimbunan sementara, sebagaimana dipersyaratkan dalam ${cite(L.tandaDaftarGudang)}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, gudang ${p.company} yang beralamat di ${p.field("Alamat Gudang")} ${p.hasDocument ? "telah memiliki tanda daftar gudang yang sah" : "belum dilengkapi dengan tanda daftar gudang"}.`,
  ],
  conclusion: (p) =>
    `${p.company} ${p.hasDocument ? "telah melengkapi" : "belum melengkapi"} tanda daftar gudang sesuai ${cite(L.tandaDaftarGudang)}. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

const warehouseLayout: DocumentNarrative = {
  keterangan: "Dokumen pendukung tata letak gudang, digunakan dalam pemeriksaan lapangan.",
  intro: () => [
    `Verifikasi terhadap Layout Gudang dilakukan sebagai dokumen pendukung untuk menilai kesesuaian gudang dengan kondisi di lapangan sesuai Pasal 38 ayat (3) ${PERMENPERIN}. Dokumen ini tidak dipersyaratkan dalam Pasal 37 ayat (2) huruf c.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} layout gudang yang beralamat di ${p.field("Alamat Gudang")}.`,
  ],
  conclusion: (p) => `Layout gudang ${p.company} diperiksa sebagai dokumen pendukung dan dinyatakan ${statusHtml(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Bukti Kemampuan Finansial
// ---------------------------------------------------------------------------------------------

const modalKerja: DocumentNarrative = {
  keterangan: "Surat pernyataan kepemilikan modal kerja dengan format Lampiran II huruf I, mencantumkan nominal modal kerja.",
  intro: () => [
    `Verifikasi terhadap Surat Pernyataan Kepemilikan Modal Kerja dilakukan untuk memastikan bahwa Perusahaan API-U menyatakan kepemilikan modal kerja untuk melaksanakan Impor Produk Tekstil sebagai barang konsumsi, sebagaimana dipersyaratkan dalam ${cite(L.modalKerja)}.`,
  ],
  findings: (p) =>
    p.hasDocument
      ? [
          `Berdasarkan hasil pemeriksaan dokumen, ${p.company} telah menyampaikan Surat Pernyataan Kepemilikan Modal Kerja yang menyatakan modal kerja sebesar ${p.field("Jumlah Modal Kerja")}.`,
          "Surat pernyataan diperiksa kesesuaiannya dengan format Lampiran II huruf I, meliputi identitas perusahaan, bidang usaha, KBLI, nominal modal kerja, meterai, dan tanda tangan pimpinan perusahaan.",
        ]
      : [`Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan Surat Pernyataan Kepemilikan Modal Kerja.`],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} Surat Pernyataan Kepemilikan Modal Kerja sesuai ${cite(L.modalKerja)}. Dengan demikian, aspek ini dinyatakan ${statusHtml(p)}.`,
};

function financialEvidence(desc: string): DocumentNarrative {
  return {
    keterangan: `Dokumen pendukung Surat Pernyataan Kepemilikan Modal Kerja (opsional). ${desc}`,
    intro: (p) => [
      `Verifikasi terhadap ${p.title} dilakukan sebagai dokumen pendukung Surat Pernyataan Kepemilikan Modal Kerja. Dokumen ini bersifat opsional dan diperiksa karena disampaikan oleh Perusahaan API-U.`,
    ],
    findings: (p) => [`Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan ${p.title}. ${desc}`],
    conclusion: (p) => `${p.title} ${p.company} diperiksa sebagai dokumen pendukung kemampuan finansial dan dinyatakan ${statusHtml(p)}.`,
  };
}

// ---------------------------------------------------------------------------------------------
// Merek, Uji Mutu, Label
// ---------------------------------------------------------------------------------------------

const brandEvidence: DocumentNarrative = {
  keterangan:
    "Sertifikat merek sesuai kelas merek dari kementerian di bidang hukum; tanda pendaftaran merek dapat menggantikan selama 9 (sembilan) bulan sejak tanggal registrasi (Pasal 37 ayat (6)–(7)).",
  intro: (p) => [
    `Verifikasi terhadap bukti merek ${titleContext(p)} dilakukan untuk memastikan bahwa merek Produk Tekstil yang akan diimpor terdaftar sesuai kelas merek, sebagaimana dipersyaratkan dalam ${cite(L.merek)}. Dalam hal sertifikat merek belum diterbitkan, tanda pendaftaran merek atau tanda pendaftaran merek internasional dapat digunakan selama 9 (sembilan) bulan sejak tanggal registrasi atau notifikasi sesuai Pasal 37 ayat (6) dan ayat (7).`,
  ],
  findings: (p) =>
    p.hasDocument
      ? [
          `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan ${p.field("Jenis Bukti Merek")} untuk merek ${p.field("Nama Merek")} dengan Nomor ${p.field("Nomor Sertifikat / Pendaftaran")}, diterbitkan tanggal ${p.field("Tanggal Penerbitan")} dan berlaku sampai dengan ${p.field("Tanggal Kedaluwarsa")}.`,
          `Merek tersebut terdaftar pada ${p.field("Kelas Merek")} atas nama pemilik merek ${p.field("Pemilik Merek")}, dengan hubungan ${p.company} terhadap merek sebagai ${p.field("Hubungan dengan Pemohon VIU Konsumsi")}.`,
          "Identitas pemilik merek dimuat dalam LHVIU sesuai Pasal 39 ayat (5) huruf c " + PERMENPERIN + ".",
        ]
      : [`Berdasarkan hasil pemeriksaan, bukti merek untuk merek ${titleContext(p)} belum disampaikan.`],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, bukti merek ${titleContext(p)} ${p.hasDocument ? "telah disampaikan" : "belum disampaikan"} sesuai ${cite(L.merek)}. Dengan demikian, aspek ini dinyatakan ${statusHtml(p)}.`,
};

function brandRelationship(id: string, keterangan: string): DocumentNarrative {
  const basis = basisOf(id);
  return {
    keterangan,
    intro: (p) => [
      `Verifikasi terhadap ${baseTitle(p)} untuk merek ${titleContext(p)} dilakukan karena ${p.company} tidak bertindak sebagai pemilik merek, sehingga hubungan hukum dengan pemilik merek atau Perwakilan Resmi wajib dibuktikan sesuai ${cite(basis)}.`,
    ],
    findings: (p) =>
      p.hasDocument
        ? [`Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan ${baseTitle(p)} untuk merek ${titleContext(p)}. Pemeriksaan meliputi para pihak, ruang lingkup, dan masa berlaku dokumen.`]
        : [`Berdasarkan hasil pemeriksaan, ${baseTitle(p)} untuk merek ${titleContext(p)} belum disampaikan.`],
    conclusion: (p) =>
      `${baseTitle(p)} untuk merek ${titleContext(p)} ${p.hasDocument ? "telah disampaikan" : "belum disampaikan"} sesuai ${cite(basis)}. Aspek ini dinyatakan ${statusHtml(p)}.`,
  };
}

const ujiMutu: DocumentNarrative = {
  keterangan: "Sertifikat hasil uji mutu untuk setiap merek per komoditas/subkomoditas, dari laboratorium uji, diajukan paling lama 6 (enam) bulan sejak diterbitkan.",
  intro: (p) => [
    `Verifikasi terhadap Sertifikat Hasil Uji Mutu ${titleContext(p)} dilakukan untuk memastikan bahwa setiap merek per komoditas atau subkomoditas Produk Tekstil yang akan diimpor telah diuji oleh laboratorium uji, sebagaimana dipersyaratkan dalam ${cite(L.ujiMutu)}.`,
  ],
  findings: (p) =>
    p.hasDocument
      ? [
          `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan sertifikat hasil uji mutu untuk ${titleContext(p)}. Pemeriksaan meliputi kesesuaian merek dan komoditas/subkomoditas, laboratorium penerbit, serta tanggal terbit yang tidak lebih dari 6 (enam) bulan pada saat diajukan.`,
          "Hasil uji mutu dimuat dalam LHVIU apabila standar nasional Indonesia atau spesifikasi teknis tidak diberlakukan secara wajib, sesuai Pasal 39 ayat (5) huruf g " + PERMENPERIN + ".",
        ]
      : [`Berdasarkan hasil pemeriksaan, sertifikat hasil uji mutu untuk ${titleContext(p)} belum disampaikan.`],
  conclusion: (p) =>
    `Sertifikat hasil uji mutu untuk ${titleContext(p)} ${p.hasDocument ? "telah disampaikan" : "belum disampaikan"} sesuai ${cite(L.ujiMutu)}. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

const labelStatement: DocumentNarrative = {
  keterangan: "Surat pernyataan pemenuhan ketentuan label berbahasa Indonesia dengan format Lampiran II huruf H.",
  intro: () => [
    `Verifikasi terhadap Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia dilakukan untuk memastikan komitmen Perusahaan API-U memenuhi ketentuan label berbahasa Indonesia atas Produk Tekstil yang akan diimpor, sebagaimana dipersyaratkan dalam ${cite(L.label)}.`,
  ],
  findings: (p) =>
    p.hasDocument
      ? [
          `Berdasarkan hasil pemeriksaan dokumen, ${p.company} telah menyampaikan surat pernyataan pemenuhan ketentuan label berbahasa Indonesia. Pemeriksaan meliputi kesesuaian dengan format Lampiran II huruf H, identitas perusahaan, meterai, dan tanda tangan pimpinan perusahaan.`,
        ]
      : [`Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan surat pernyataan pemenuhan ketentuan label berbahasa Indonesia.`],
  conclusion: (p) =>
    `${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} surat pernyataan pemenuhan ketentuan label berbahasa Indonesia sesuai ${cite(L.label)}. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

const labelDocumentation: DocumentNarrative = {
  keterangan: "Dokumentasi label produk berbahasa Indonesia yang melampiri surat pernyataan label.",
  intro: () => [
    `Verifikasi terhadap Dokumentasi Label Produk dilakukan untuk memastikan bahwa surat pernyataan pemenuhan ketentuan label berbahasa Indonesia disertai bukti dokumentasi label produk yang akan diimpor, sebagaimana dipersyaratkan dalam ${cite(L.labelDokumentasi)}.`,
  ],
  findings: (p) =>
    p.hasDocument
      ? [`Berdasarkan hasil pemeriksaan dokumen, ${p.company} telah menyampaikan dokumentasi label produk berbahasa Indonesia untuk Produk Tekstil yang diajukan.`]
      : [`Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan dokumentasi label produk.`],
  conclusion: (p) =>
    `${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} dokumentasi label produk sesuai ${cite(L.labelDokumentasi)}. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

// ---------------------------------------------------------------------------------------------

const financialEvidenceDocs = Object.fromEntries(
  NON_INDUSTRI_SUPPORT_DOC_DEFS.map((def) => [`financial-${def.key}`, financialEvidence(def.desc)]),
);

export const VIU_KONSUMSI_NARRATIVE: SchemeNarrative = {
  foreword: `Laporan dokumen ini disusun berdasarkan hasil pemeriksaan kelengkapan dan kesesuaian data dan dokumen permohonan oleh verifikator, sebagai bagian dari proses ${VIU} sesuai Pasal 37 dan Pasal 38 ${PERMENPERIN}, sebelum diteruskan kepada pihak terkait.`,
  summary: ({ company }) =>
    `Verifikasi dokumen permohonan ${VIU_SHORT} milik ${company} meliputi pemeriksaan legalitas, perpajakan, lokasi kantor dan gudang, dokumen merek, hasil uji mutu, label berbahasa Indonesia, serta bukti kemampuan finansial, sesuai Pasal 37 ayat (2) huruf c ${PERMENPERIN}.`,
  wajibLegend: `Persyaratan Wajib → dokumen yang dipersyaratkan dalam Pasal 37 ayat (2) huruf c dan ayat (3)–(5) ${PERMENPERIN} untuk ${VIU_SHORT}.`,
  chapterOpening: ({ company, chapter, allMet }) =>
    `Berdasarkan hasil pemeriksaan dokumen dan verifikasi lapangan terhadap aspek ${chapter.toLowerCase()}, ${company} ${
      allMet ? "telah memenuhi kelengkapan dokumen yang dipersyaratkan" : "memiliki sebagian dokumen yang masih perlu dilengkapi"
    } dalam pelaksanaan ${VIU}.`,
  chapterClosing: ({ company, chapter, allMet }) =>
    `Berdasarkan keseluruhan hasil verifikasi, aspek ${chapter} ${company} dinyatakan <strong>${allMet ? "Memenuhi" : "Belum Memenuhi Seluruhnya"}</strong> sebagai dasar penerbitan Laporan Hasil Verifikasi Importir Umum (LHVIU) sesuai Pasal 39 ayat (5) ${PERMENPERIN}.`,
  sections: {
    legalitas: {
      title: "Pemeriksaan Administratif Perizinan Berusaha",
      desc: "Dasar hukum dan klasifikasi dokumen perizinan berusaha Perusahaan API-U",
      intro: [
        `Pemeriksaan administratif perizinan berusaha dilaksanakan untuk memastikan bahwa Perusahaan API-U memiliki Perizinan Berusaha di bidang perdagangan besar dengan KBLI yang ditetapkan dalam ${cite(L.perizinanBerusaha)}, sebagai persyaratan ${VIU}.`,
        `Selain itu dinilai kesesuaian KBLI Perusahaan API-U dengan pos tarif/HS Produk Tekstil yang akan diimpor sesuai Pasal 38 ayat (2) huruf b. Akta dan SK Kemenkumham diperiksa sebagai dokumen pendukung identitas perusahaan yang dimuat dalam LHVIU (Pasal 39 ayat (5) huruf b).`,
      ],
    },
    perpajakan: {
      title: "Pemeriksaan Administratif Perpajakan",
      desc: "Dasar hukum dan klasifikasi dokumen perpajakan Perusahaan API-U",
      intro: [
        `Pemeriksaan administratif perpajakan dilaksanakan untuk memastikan bahwa Perusahaan API-U memiliki Nomor Pokok Wajib Pajak sebagaimana dipersyaratkan dalam ${cite(L.npwp)}.`,
        "Bukti pembayaran pajak, SKT, dan rincian bukti pajak lainnya diperiksa sebagai dokumen pendukung kepatuhan perpajakan perusahaan.",
      ],
    },
    lokasi: {
      title: "Pemeriksaan Administratif Kantor dan Gudang",
      desc: "Dasar hukum dan klasifikasi dokumen penguasaan kantor dan gudang",
      intro: [
        `Pemeriksaan administratif lokasi dilaksanakan untuk memastikan bahwa Perusahaan API-U memiliki atau menguasai kantor fisik dengan sisa waktu sewa paling singkat 1 (satu) tahun dan gudang dengan jangka waktu sewa paling singkat 1 (satu) tahun, serta memiliki tanda daftar gudang, sebagaimana dipersyaratkan dalam Pasal 37 ayat (2) huruf c angka 2 huruf c), d), dan e) ${PERMENPERIN}.`,
        "Kesesuaian dokumen dengan kondisi kantor dan gudang di lapangan diverifikasi sesuai Pasal 38 ayat (3). Alamat kantor dan alamat gudang dimuat dalam LHVIU sesuai Pasal 39 ayat (5) huruf b.",
      ],
    },
    merek: {
      title: "Pemeriksaan Administratif Dokumen Merek",
      desc: "Dasar hukum dan klasifikasi dokumen merek dan hubungan hukum dengan pemilik merek",
      intro: [
        `Pemeriksaan administratif dokumen merek dilaksanakan untuk memastikan bahwa setiap merek Produk Tekstil yang akan diimpor memiliki sertifikat merek sesuai kelas merek sebagaimana dipersyaratkan dalam ${cite(L.merek)}, atau tanda pendaftaran merek sesuai Pasal 37 ayat (6) dan ayat (7).`,
        "Dalam hal Perusahaan API-U merupakan Perwakilan Resmi atau hanya bertindak selaku importir, diperiksa pula bukti penunjukan, perjanjian lisensi/sublisensi beserta bukti pencatatannya, surat penunjukan impor, dan legalitas Perwakilan Resmi sesuai Pasal 37 ayat (3), ayat (4), ayat (5), dan ayat (8).",
      ],
    },
    "uji-mutu": {
      title: "Pemeriksaan Administratif Hasil Uji Mutu",
      desc: "Dasar hukum dan klasifikasi sertifikat hasil uji mutu per merek per komoditas/subkomoditas",
      intro: [
        `Pemeriksaan administratif hasil uji mutu dilaksanakan untuk memastikan bahwa tersedia sertifikat hasil uji mutu untuk setiap merek per komoditas atau subkomoditas dari laboratorium uji, yang diajukan paling lama 6 (enam) bulan sejak tanggal diterbitkan, sebagaimana dipersyaratkan dalam ${cite(L.ujiMutu)}.`,
      ],
    },
    label: {
      title: "Pemeriksaan Administratif Label Berbahasa Indonesia",
      desc: "Dasar hukum dan klasifikasi dokumen pemenuhan ketentuan label berbahasa Indonesia",
      intro: [
        `Pemeriksaan administratif label dilaksanakan untuk memastikan bahwa Perusahaan API-U menyampaikan surat pernyataan pemenuhan ketentuan label berbahasa Indonesia disertai dokumentasi label produk, sebagaimana dipersyaratkan dalam ${cite(L.label)}, dengan format surat pernyataan sesuai Lampiran II huruf H.`,
      ],
    },
    "kemampuan-finansial": {
      title: "Pemeriksaan Administratif Kepemilikan Modal Kerja",
      desc: "Dasar hukum dan klasifikasi dokumen kepemilikan modal kerja",
      intro: [
        `Pemeriksaan administratif kepemilikan modal kerja dilaksanakan untuk memastikan bahwa Perusahaan API-U menyampaikan surat pernyataan kepemilikan modal kerja sebagaimana dipersyaratkan dalam ${cite(L.modalKerja)}, dengan format sesuai Lampiran II huruf I.`,
        "Dokumen keuangan lain (rekening koran, surat referensi bank, laporan keuangan, dan sebagainya) bersifat opsional dan hanya diperiksa apabila disampaikan perusahaan.",
      ],
    },
  },
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
    "tax-support-skf": taxSupport,
    "location-tenure-kantor": tenure("kantor"),
    "location-tenure-gudang": tenure("gudang"),
    "warehouse-registration": warehouseRegistration,
    "warehouse-layout": warehouseLayout,
    "surat-pernyataan-modal-kerja": modalKerja,
    ...financialEvidenceDocs,
    "brand-evidence": brandEvidence,
    "brand-rel-official_representative_appointment": brandRelationship(
      "brand-rel-official_representative_appointment",
      "Akta otentik penunjukan sebagai Perwakilan Resmi yang dibuat di hadapan notaris di wilayah NKRI.",
    ),
    "brand-rel-license_or_sublicense": brandRelationship(
      "brand-rel-license_or_sublicense",
      "Perjanjian lisensi/sublisensi; dikecualikan apabila menggunakan tanda pendaftaran merek (Pasal 37 ayat (8)).",
    ),
    "brand-rel-license_registration": brandRelationship(
      "brand-rel-license_registration",
      "Bukti pencatatan perjanjian lisensi/sublisensi dari kementerian di bidang hukum; dikecualikan apabila menggunakan tanda pendaftaran merek.",
    ),
    "brand-rel-official_rep_deed": brandRelationship("brand-rel-official_rep_deed", "Salinan akta pendirian Perwakilan Resmi."),
    "brand-rel-official_rep_deed_amendment": brandRelationship(
      "brand-rel-official_rep_deed_amendment",
      "Akta perubahan Perwakilan Resmi, apabila ada.",
    ),
    "brand-rel-official_rep_business_license": brandRelationship("brand-rel-official_rep_business_license", "Perizinan Berusaha Perwakilan Resmi."),
    "brand-rel-importer_appointment": brandRelationship(
      "brand-rel-importer_appointment",
      "Surat penunjukan untuk melakukan Impor dari pemilik merek atau Perwakilan Resmi.",
    ),
    "brand-rel-importer_appointment_from_brand_owner": brandRelationship(
      "brand-rel-importer_appointment_from_brand_owner",
      "Surat penunjukan untuk melakukan Impor dari pemilik merek yang berkedudukan di wilayah NKRI.",
    ),
    "uji-mutu": ujiMutu,
    "label-statement": labelStatement,
    "label-documentation": labelDocumentation,
  },
};
