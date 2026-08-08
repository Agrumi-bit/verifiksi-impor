/**
 * "Uraian Verifikasi Laporan Hasil Survei Verifikasi Lapangan" — the
 * verifikator's own desk-review checklist over the surveyor's completed
 * report for one location, distinct from the surveyor's own checklist
 * inside that report. Two sections (A: administrative, B: location &
 * facility), each a flat list of `ReportChecklistItemDef`s rendered by
 * `ReportChecklistItemRow` in `field-verification-tab.tsx`.
 */

export type ReportChecklistContext = {
  applicationNumber: string;
  companyName: string;
  surveyorName: string;
  visitDate: string | null;
  address: string;
  city: string | null;
  buildingStatus: "MILIK_SENDIRI" | "SEWA" | null;
  documentationCount: number;
};

export type ReportResultLabels = { pass: string; fail: string; na: string };
const DEFAULT_RESULT_LABELS: ReportResultLabels = { pass: "Sesuai", fail: "Tidak Sesuai", na: "Perlu Klarifikasi" };

export type ReportChecklistItemDef = {
  id: string;
  no: number;
  title: string;
  question: string;
  dataSource?: string;
  examples?: string[];
  criteria: string[];
  resultLabels?: ReportResultLabels;
  getValue?: (ctx: ReportChecklistContext) => string | null | undefined;
};

export type ReportChecklistSection = {
  key: "administrative" | "location";
  title: string;
  description: string;
  items: ReportChecklistItemDef[];
};

export const REPORT_CHECKLIST_SECTIONS: ReportChecklistSection[] = [
  {
    key: "administrative",
    title: "A. Verifikasi Administratif Laporan",
    description:
      "Bagian ini bertujuan untuk memastikan bahwa laporan hasil survei yang disusun oleh surveyor telah lengkap, sesuai dengan permohonan, dan memenuhi persyaratan administratif.",
    items: [
      {
        id: "report-number",
        no: 1,
        title: "Nomor Laporan",
        question: "Apakah nomor laporan hasil survei sesuai dengan data permohonan?",
        criteria: ["Nomor laporan tercantum dengan jelas.", "Nomor laporan sesuai dengan sistem.", "Tidak terdapat duplikasi nomor laporan."],
      },
      {
        id: "application-number",
        no: 2,
        title: "Nomor Permohonan",
        question: "Apakah nomor permohonan yang tercantum pada laporan sesuai dengan permohonan yang sedang diverifikasi?",
        dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
        getValue: (ctx) => ctx.applicationNumber,
        criteria: ["Nomor permohonan sesuai.", "Tidak terdapat perbedaan data."],
      },
      {
        id: "company-name",
        no: 3,
        title: "Nama Perusahaan",
        question: "Apakah nama perusahaan yang tercantum pada laporan sesuai dengan data perusahaan pada sistem?",
        dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
        getValue: (ctx) => ctx.companyName,
        criteria: ["Nama perusahaan identik dengan data permohonan.", "Tidak terdapat perbedaan penulisan."],
      },
      {
        id: "surveyor-name",
        no: 4,
        title: "Nama Surveyor",
        question: "Apakah nama surveyor yang menyusun laporan sesuai dengan penugasan?",
        dataSource: "Data ditampilkan otomatis berdasarkan data penugasan.",
        getValue: (ctx) => ctx.surveyorName,
        criteria: ["Nama surveyor sesuai dengan surat tugas.", "Surveyor masih aktif."],
      },
      {
        id: "visit-date",
        no: 5,
        title: "Tanggal Pelaksanaan Survei",
        question: "Apakah tanggal survei lapangan sesuai dengan jadwal pelaksanaan?",
        dataSource: "Data ditampilkan otomatis berdasarkan laporan surveyor.",
        getValue: (ctx) => ctx.visitDate,
        criteria: ["Tanggal survei tercantum dengan jelas.", "Tanggal sesuai dengan jadwal penugasan."],
      },
      {
        id: "supporting-documents",
        no: 6,
        title: "Kelengkapan Dokumen Pendukung",
        question: "Apakah seluruh dokumen pendukung survei telah dilampirkan?",
        resultLabels: { pass: "Lengkap", fail: "Tidak Lengkap", na: "Perlu Klarifikasi" },
        criteria: ["Foto lokasi.", "Foto fasilitas.", "Berita acara.", "Daftar hadir.", "Dokumentasi tambahan."],
      },
    ],
  },
  {
    key: "location",
    title: "B. Verifikasi Lokasi dan Fasilitas",
    description:
      "Bagian ini bertujuan untuk memastikan bahwa lokasi dan fasilitas yang dikunjungi surveyor sesuai dengan data perusahaan yang diajukan.",
    items: [
      {
        id: "location-address",
        no: 1,
        title: "Alamat Lokasi",
        question: "Apakah alamat lokasi yang diverifikasi sesuai dengan data perusahaan?",
        dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
        getValue: (ctx) => [ctx.address, ctx.city].filter(Boolean).join(", "),
        criteria: ["Alamat sesuai dengan dokumen perusahaan.", "Kota dan provinsi sesuai.", "Lokasi dapat diidentifikasi."],
      },
      {
        id: "location-gps",
        no: 2,
        title: "Koordinat Lokasi (GPS)",
        question: "Apakah koordinat lokasi sesuai dengan lokasi yang dilaporkan?",
        criteria: ["Titik koordinat valid.", "Koordinat sesuai dengan alamat perusahaan."],
      },
      {
        id: "facility-ownership",
        no: 3,
        title: "Status Kepemilikan Fasilitas",
        question: "Apakah status kepemilikan fasilitas sesuai dengan laporan survei?",
        dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
        getValue: (ctx) =>
          ctx.buildingStatus === "MILIK_SENDIRI" ? "Milik sendiri" : ctx.buildingStatus === "SEWA" ? "Sewa" : undefined,
        examples: ["Milik sendiri.", "Sewa.", "Kerja sama.", "Lainnya."],
        criteria: ["Status kepemilikan tercantum dengan jelas.", "Status sesuai dengan dokumen perusahaan."],
      },
      // Item 4 not provided by verifikator team — see item 5's own numbering below.
      {
        id: "location-photos",
        no: 5,
        title: "Dokumentasi Foto Lokasi",
        question: "Apakah dokumentasi foto yang dilampirkan sesuai dengan lokasi dan fasilitas perusahaan?",
        dataSource: "Data ditampilkan otomatis berdasarkan laporan surveyor.",
        getValue: (ctx) => (ctx.documentationCount > 0 ? `${ctx.documentationCount} foto terlampir` : "Belum ada foto terlampir"),
        criteria: ["Foto jelas dan lengkap.", "Menunjukkan lokasi yang diverifikasi.", "Sesuai dengan laporan survei."],
      },
    ],
  },
];

export function reportResultLabels(item: ReportChecklistItemDef): ReportResultLabels {
  return item.resultLabels ?? DEFAULT_RESULT_LABELS;
}
