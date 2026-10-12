import { NON_INDUSTRI_SUPPORT_DOC_DEFS } from "@/modules/applications/financial-capability-defs";
import { baseTitle, cite, listValues, PERMENPERIN, statusHtml, titleContext } from "../shared/narrative-helpers";
import type { DocTextParams, DocumentNarrative, SchemeNarrative } from "../types";
import { VIU_NON_INDUSTRI_TERMS } from "./terms";
import { VIU_NON_INDUSTRI_LEGAL_BASIS as L } from "./legal-basis";

/**
 * Report narrative for VIU Bahan Baku Non Industri ONLY — Permenperin 27/2025 Pasal 26 huruf b,
 * Pasal 37 ayat (2) huruf b, Pasal 38, Pasal 39 ayat (4). The subject is the Perusahaan API-U that
 * imports bahan baku/penolong for a Perusahaan Non Industri mitra under a contract of at least one
 * year. Never mention VKI, LHVKI, factories or production here (see terms.forbiddenTerms).
 */
const VIU = "Verifikasi Importir Umum (VIU) untuk Impor Tekstil dan/atau Produk Tekstil sebagai Bahan Baku dan/atau Bahan Penolong bagi Perusahaan Non Industri";
const VIU_SHORT = "VIU Bahan Baku Non Industri";
const KBLI_LIST = VIU_NON_INDUSTRI_TERMS.allowedKbli!.join(", ").replace(/, (?=[^,]*$)/, ", dan/atau ");
const IDENTITAS = `Pasal 39 ayat (4) huruf b ${PERMENPERIN}`;

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
    `Hasil verifikasi menunjukkan bahwa nama perusahaan, alamat, dan informasi kegiatan usaha yang tercantum pada NIB sesuai dengan dokumen legalitas lain yang diperiksa, serta NIB masih berlaku. Identitas Perusahaan API-U tersebut menjadi bagian dari isi Laporan Hasil Verifikasi Importir Umum (LHVIU) sesuai ${IDENTITAS}.`,
  ],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} memiliki NIB ${p.field("Nomor Induk Berusaha (NIB)")} yang masih berlaku sesuai ${cite(L.perizinanBerusaha)}. Dengan demikian, aspek Perizinan Berusaha dinyatakan ${statusHtml(p)}.`,
};

const kbliUtama: DocumentNarrative = {
  keterangan: "Diverifikasi untuk memastikan KBLI Utama termasuk KBLI perdagangan besar yang ditetapkan bagi VIU Bahan Baku Non Industri dan sesuai dengan pos tarif/HS bahan baku/penolong yang akan diimpor.",
  intro: () => [
    `Verifikasi terhadap Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) Utama dilakukan melalui pemeriksaan Lampiran NIB, untuk memastikan bahwa Perusahaan API-U memiliki KBLI perdagangan besar sebagaimana ditetapkan dalam ${cite(L.perizinanBerusaha)}, yaitu KBLI ${KBLI_LIST}, serta menilai kesesuaian KBLI dengan pos tarif/HS bahan baku dan/atau bahan penolong yang akan diimpor sesuai Pasal 38 ayat (2) huruf b ${PERMENPERIN}.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} memiliki KBLI Utama ${listValues(p, ["Status KBLI"])} yang tercantum dalam Lampiran NIB.`,
    "Hasil verifikasi menunjukkan bahwa KBLI tersebut merupakan kegiatan usaha perdagangan besar yang menjadi dasar Perusahaan API-U untuk melakukan Impor Tekstil dan/atau Produk Tekstil sebagai bahan baku dan/atau bahan penolong bagi Perusahaan Non Industri, dan sejalan dengan pos tarif/HS yang diajukan dalam permohonan.",
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
    `Verifikasi terhadap Surat Keputusan Menteri Hukum dan Hak Asasi Manusia dilakukan sebagai dokumen pendukung untuk memastikan keabsahan badan hukum Perusahaan API-U. Dokumen ini tidak dipersyaratkan dalam Pasal 37 ayat (2) huruf b, namun digunakan untuk memverifikasi identitas perusahaan yang dimuat dalam LHVIU sesuai ${IDENTITAS}.`,
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
    `Verifikasi terhadap Akta Pendirian dilakukan sebagai dokumen pendukung untuk memastikan dasar pendirian Perusahaan API-U serta konsistensi identitasnya dengan NIB dan SK Kemenkumham. Dokumen ini tidak dipersyaratkan dalam Pasal 37 ayat (2) huruf b ${PERMENPERIN}.`,
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

const PAJAK_PENDUKUNG = `Pasal 37 ayat (2) huruf b ${PERMENPERIN} hanya mensyaratkan NPWP; dokumen ini diperiksa sebagai pendukung kepatuhan perpajakan Perusahaan API-U.`;

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
      out.push(`Kesesuaian dokumen dengan kondisi lokasi diverifikasi melalui pemeriksaan lapangan sesuai Pasal 38 ayat (3) ${PERMENPERIN}.`);
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
    p.hasDocument
      ? `Berdasarkan hasil pemeriksaan dokumen, gudang ${p.company} yang beralamat di ${p.field("Alamat Gudang")} telah memiliki ${p.field("Jenis Tanda Daftar")} Nomor ${p.field("Nomor Tanda Daftar Gudang")} yang diterbitkan oleh ${p.field("Instansi Penerbit")} pada tanggal ${p.field("Tanggal Terbit")}.`
      : `Berdasarkan hasil pemeriksaan dokumen, gudang ${p.company} yang beralamat di ${p.field("Alamat Gudang")} belum dilengkapi dengan tanda daftar gudang.`,
  ],
  conclusion: (p) =>
    `${p.company} ${p.hasDocument ? "telah melengkapi" : "belum melengkapi"} tanda daftar gudang sesuai ${cite(L.tandaDaftarGudang)}. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

const warehouseLayout: DocumentNarrative = {
  keterangan: "Dokumen pendukung tata letak gudang, digunakan dalam pemeriksaan lapangan.",
  intro: () => [
    `Verifikasi terhadap Layout Gudang dilakukan sebagai dokumen pendukung untuk menilai kesesuaian gudang dengan kondisi di lapangan sesuai Pasal 38 ayat (3) ${PERMENPERIN}. Dokumen ini tidak dipersyaratkan dalam Pasal 37 ayat (2) huruf b.`,
  ],
  findings: (p) => [
    `Berdasarkan hasil pemeriksaan dokumen, ${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} layout gudang yang beralamat di ${p.field("Alamat Gudang")}.`,
  ],
  conclusion: (p) => `Layout gudang ${p.company} diperiksa sebagai dokumen pendukung dan dinyatakan ${statusHtml(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Mitra Perusahaan Non Industri
// ---------------------------------------------------------------------------------------------

/** Partner name from the "Nama Mitra" field, else the title suffix ("… — PT X"). */
const mitra = (p: DocTextParams) => (p.field("Nama Mitra") !== "—" ? p.field("Nama Mitra") : titleContext(p) || "Perusahaan Non Industri mitra");

const mitraKontrak: DocumentNarrative = {
  keterangan: "Kontrak kerja sama dan/atau kontrak jual beli bahan baku/penolong dengan Perusahaan Non Industri, masa perjanjian paling singkat 1 (satu) tahun.",
  intro: (p) => [
    `Verifikasi terhadap kontrak kerja sama dan/atau kontrak jual beli dengan ${mitra(p)} dilakukan untuk memastikan bahwa bahan baku dan/atau bahan penolong yang diimpor Perusahaan API-U ditujukan bagi Perusahaan Non Industri berdasarkan perjanjian dengan masa paling singkat 1 (satu) tahun, sebagaimana dipersyaratkan dalam ${cite(L.kontrakNonIndustri)}.`,
  ],
  findings: (p) =>
    p.hasDocument
      ? [`Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan kontrak dengan ${mitra(p)}. Pemeriksaan meliputi para pihak, jenis bahan baku/penolong, dan masa berlaku perjanjian. Kesesuaian rencana impor dengan kebutuhan mitra menurut kontrak dinilai pada analisis teknis.`]
      : [`Berdasarkan hasil pemeriksaan, kontrak kerja sama dan/atau kontrak jual beli dengan ${mitra(p)} belum disampaikan.`],
  conclusion: (p) =>
    `Kontrak dengan ${mitra(p)} ${p.hasDocument ? "telah disampaikan" : "belum disampaikan"} sesuai ${cite(L.kontrakNonIndustri)}. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

const mitraNib: DocumentNarrative = {
  keterangan: "NIB Perusahaan Non Industri mitra, sebagai identitas mitra yang dimuat dalam LHVIU.",
  intro: (p) => [
    `Verifikasi terhadap Nomor Induk Berusaha (NIB) ${mitra(p)} dilakukan untuk memastikan identitas Perusahaan Non Industri mitra — nama, alamat, NIB, dan KBLI — yang dimuat dalam LHVIU sesuai ${cite(L.identitasMitra)}.`,
  ],
  findings: (p) => [
    p.hasDocument
      ? `Berdasarkan hasil pemeriksaan dokumen, ${mitra(p)} memiliki Nomor Induk Berusaha (NIB) yang digunakan sebagai identitas mitra dalam permohonan ${p.company}.`
      : `Berdasarkan hasil pemeriksaan dokumen, NIB ${mitra(p)} belum disampaikan.`,
  ],
  conclusion: (p) => `${mitra(p)} ${p.hasDocument ? "memiliki" : "belum melengkapi"} NIB sebagai identitas Perusahaan Non Industri mitra. Aspek ini dinyatakan ${statusHtml(p)}.`,
};

// ---------------------------------------------------------------------------------------------
// Bukti Kemampuan Finansial
// ---------------------------------------------------------------------------------------------

const modalKerja: DocumentNarrative = {
  keterangan: "Surat pernyataan kepemilikan modal kerja yang mencantumkan nominal modal kerja (persyaratan internal Lembaga Pelaksana Verifikasi).",
  intro: () => [
    `Verifikasi terhadap Surat Pernyataan Kepemilikan Modal Kerja dilakukan untuk memastikan bahwa Perusahaan API-U menyatakan kepemilikan modal kerja untuk melaksanakan impor bahan baku dan/atau bahan penolong bagi Perusahaan Non Industri. Kepemilikan modal kerja tidak dipersyaratkan dalam Pasal 37 ayat (2) huruf b ${PERMENPERIN}, dan ditetapkan sebagai ${cite(L.modalKerja)}.`,
  ],
  findings: (p) =>
    p.hasDocument
      ? [
          `Berdasarkan hasil pemeriksaan dokumen, ${p.company} telah menyampaikan Surat Pernyataan Kepemilikan Modal Kerja yang menyatakan modal kerja sebesar ${p.field("Jumlah Modal Kerja")}.`,
          "Surat pernyataan diperiksa kelengkapannya, meliputi identitas perusahaan, bidang usaha, KBLI, nominal modal kerja, meterai, dan tanda tangan pimpinan perusahaan. Kecukupan modal kerja terhadap nilai impor dinilai pada analisis teknis.",
        ]
      : [`Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan Surat Pernyataan Kepemilikan Modal Kerja.`],
  conclusion: (p) =>
    `Berdasarkan hasil verifikasi dokumen, ${p.company} ${p.hasDocument ? "telah menyampaikan" : "belum menyampaikan"} Surat Pernyataan Kepemilikan Modal Kerja sebagai ${cite(L.modalKerja)}. Dengan demikian, aspek ini dinyatakan ${statusHtml(p)}.`,
};

function financialEvidence(desc: string): DocumentNarrative {
  return {
    keterangan: `Bukti pendukung Surat Pernyataan Kepemilikan Modal Kerja — cukup salah satu jenis bukti. ${desc}`,
    intro: (p) => [
      `Verifikasi terhadap ${p.title} dilakukan sebagai bukti pendukung Surat Pernyataan Kepemilikan Modal Kerja. Perusahaan API-U cukup menyampaikan salah satu jenis bukti kemampuan finansial, sebagai ${cite(L.buktiFinansial)}.`,
    ],
    findings: (p) => [
      p.hasDocument
        ? `Berdasarkan hasil pemeriksaan dokumen, ${p.company} menyampaikan ${p.title}. ${desc}`
        : `Berdasarkan hasil pemeriksaan, ${p.company} belum menyampaikan ${p.title}.`,
    ],
    conclusion: (p) => `${p.title} ${p.company} diperiksa sebagai bukti kemampuan finansial dan dinyatakan ${statusHtml(p)}.`,
  };
}

// ---------------------------------------------------------------------------------------------

const financialEvidenceDocs = Object.fromEntries(
  NON_INDUSTRI_SUPPORT_DOC_DEFS.map((def) => [`financial-${def.key}`, financialEvidence(def.desc)]),
);

export const VIU_NON_INDUSTRI_NARRATIVE: SchemeNarrative = {
  foreword: `Laporan dokumen ini disusun berdasarkan hasil pemeriksaan kelengkapan dan kesesuaian data dan dokumen permohonan oleh verifikator, sebagai bagian dari proses ${VIU} sesuai Pasal 37 dan Pasal 38 ${PERMENPERIN}, sebelum diteruskan kepada pihak terkait.`,
  summary: ({ company }) =>
    `Verifikasi dokumen permohonan ${VIU_SHORT} milik ${company} meliputi pemeriksaan legalitas, perpajakan, lokasi kantor dan gudang, kontrak dan identitas Perusahaan Non Industri mitra, serta bukti kemampuan finansial, sesuai Pasal 37 ayat (2) huruf b ${PERMENPERIN}.`,
  wajibLegend: `Persyaratan Wajib → dokumen yang dipersyaratkan dalam Pasal 37 ayat (2) huruf b ${PERMENPERIN} untuk ${VIU_SHORT}, atau ditetapkan wajib oleh Lembaga Pelaksana Verifikasi.`,
  chapterOpening: ({ company, chapter, allMet }) =>
    `Berdasarkan hasil pemeriksaan dokumen dan verifikasi lapangan terhadap aspek ${chapter.toLowerCase()}, ${company} ${
      allMet ? "telah memenuhi kelengkapan dokumen yang dipersyaratkan" : "memiliki sebagian dokumen yang masih perlu dilengkapi"
    } dalam pelaksanaan ${VIU}.`,
  chapterClosing: ({ company, chapter, allMet }) =>
    `Berdasarkan keseluruhan hasil verifikasi, aspek ${chapter} ${company} dinyatakan <strong>${allMet ? "Memenuhi" : "Belum Memenuhi Seluruhnya"}</strong> sebagai dasar penerbitan Laporan Hasil Verifikasi Importir Umum (LHVIU) sesuai Pasal 39 ayat (4) ${PERMENPERIN}.`,
  sections: {
    legalitas: {
      title: "Pemeriksaan Administratif Perizinan Berusaha",
      desc: "Dasar hukum dan klasifikasi dokumen perizinan berusaha Perusahaan API-U",
      intro: [
        `Pemeriksaan administratif perizinan berusaha dilaksanakan untuk memastikan bahwa Perusahaan API-U memiliki Perizinan Berusaha di bidang perdagangan besar dengan KBLI yang ditetapkan dalam ${cite(L.perizinanBerusaha)}, sebagai persyaratan ${VIU}.`,
        "Selain itu dinilai kesesuaian KBLI Perusahaan API-U dengan pos tarif/HS bahan baku dan/atau bahan penolong yang akan diimpor sesuai Pasal 38 ayat (2) huruf b. Akta dan SK Kemenkumham diperiksa sebagai dokumen pendukung identitas perusahaan yang dimuat dalam LHVIU (Pasal 39 ayat (4) huruf b).",
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
        `Pemeriksaan administratif lokasi dilaksanakan untuk memastikan bahwa Perusahaan API-U memiliki atau menguasai kantor fisik dengan sisa waktu sewa paling singkat 1 (satu) tahun dan gudang dengan jangka waktu sewa paling singkat 1 (satu) tahun, serta memiliki tanda daftar gudang, sebagaimana dipersyaratkan dalam Pasal 37 ayat (2) huruf b angka 2 huruf c), d), dan e) ${PERMENPERIN}.`,
        "Kesesuaian dokumen dengan kondisi kantor dan gudang di lapangan diverifikasi sesuai Pasal 38 ayat (3). Alamat kantor dan alamat gudang dimuat dalam LHVIU sesuai Pasal 39 ayat (4) huruf b.",
      ],
    },
    "mitra-non-industri": {
      title: "Pemeriksaan Administratif Perusahaan Non Industri Mitra",
      desc: "Dasar hukum dan klasifikasi dokumen kontrak dan identitas Perusahaan Non Industri mitra",
      intro: [
        `Pemeriksaan administratif Perusahaan Non Industri mitra dilaksanakan untuk memastikan bahwa bahan baku dan/atau bahan penolong yang akan diimpor ditujukan bagi Perusahaan Non Industri yang memiliki kontrak kerja sama dan/atau kontrak jual beli dengan Perusahaan API-U dengan masa perjanjian paling singkat 1 (satu) tahun, sebagaimana dipersyaratkan dalam ${cite(L.kontrakNonIndustri)}.`,
        "Identitas Perusahaan Non Industri mitra — nama, alamat, NIB, dan KBLI — dimuat dalam LHVIU sesuai Pasal 39 ayat (4) huruf c.",
      ],
    },
    "kemampuan-finansial": {
      title: "Pemeriksaan Administratif Kepemilikan Modal Kerja",
      desc: "Dasar hukum dan klasifikasi dokumen kepemilikan modal kerja",
      intro: [
        `Pemeriksaan administratif kepemilikan modal kerja dilaksanakan untuk memastikan bahwa Perusahaan API-U menyampaikan surat pernyataan kepemilikan modal kerja. Persyaratan ini tidak diatur dalam Pasal 37 ayat (2) huruf b ${PERMENPERIN} dan ditetapkan sebagai persyaratan internal Lembaga Pelaksana Verifikasi.`,
        "Surat pernyataan didukung salah satu bukti kemampuan finansial (rekening koran, surat referensi bank, laporan keuangan, fasilitas kredit, keterangan saldo, deposito, atau perjanjian pinjaman pemegang saham/afiliasi).",
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
    "mitra-non-industri-kontrak": mitraKontrak,
    "mitra-non-industri-nib": mitraNib,
    "surat-pernyataan-modal-kerja": modalKerja,
    ...financialEvidenceDocs,
  },
};
