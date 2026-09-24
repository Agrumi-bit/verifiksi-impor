/**
 * Per-document-type "Uraian yang Diperiksa" checklist — the granular points a
 * verifikator confirms one by one while reviewing a specific document, shown
 * as the left column of the Documents Verification review modal. Keyed by
 * the same `key` values `buildDocumentChecklist` produces.
 *
 * Only "nib" has the full rich spec (description/question/dataSource/
 * examples/criteria) — provided directly by the verifikator team. Every
 * other key still uses the simpler title-only shape until its own uraian is
 * provided; `ChecklistItemRow` renders whichever fields are present, so a
 * title-only item still renders correctly (just without the extra context
 * blocks).
 *
 * Keys with no entry at all (location proofs, electricity bills, VIU
 * support docs, etc.) fall back to `GENERIC_CHECKLIST_ITEMS`.
 */
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  composeLocationAddress,
  OWNERSHIP_DOCUMENT_TYPE_LABELS,
  LEASE_DOCUMENT_TYPE_LABELS,
  splitKbliEntries,
  type OwnershipDocumentType,
  type LeaseDocumentType,
} from "@/modules/shared/schema";

/**
 * Real data available to a checklist item's `getValue` — the application
 * payload plus the handful of company-level fields that live outside it
 * (e.g. the registered business address, which is a `Company` column, not
 * part of the application JSON snapshot).
 */
export type ChecklistContext = {
  payload: ApplicationWizardValues;
  businessAddress: string | null;
  /**
   * Live Company fallback for the SKT fields — `payload.sktXxx` is only
   * populated for applications submitted after this field existed in the
   * wizard schema; older applications' frozen snapshot never captured it, so
   * `getValue` falls back to the company's current record instead of
   * showing blank for data that genuinely exists.
   */
  companySkt: { sktNumber: string | null; sktIssuer: string | null; sktDate: string | null } | null;
};

export type ChecklistItemDef = {
  id: string;
  title: string;
  description?: string;
  question?: string;
  dataSource?: string;
  examples?: string[];
  criteria?: string[];
  /**
   * Pulls the actual value the company entered for this field, so the
   * verifikator sees it side-by-side with the "Sumber data" description
   * instead of just a description of where the value theoretically comes
   * from — they compare this against what's printed on the uploaded
   * document, not take the description on faith.
   */
  getValue?: (ctx: ChecklistContext) => string | null | undefined;
};

const GENERIC_CHECKLIST_ITEMS: ChecklistItemDef[] = [
  { id: "generic-legible", title: "Dokumen dapat dibaca dengan jelas" },
  { id: "generic-format", title: "Dokumen sesuai dengan format yang dipersyaratkan" },
  { id: "generic-consistent", title: "Informasi pada dokumen konsisten dengan data permohonan" },
];

/**
 * The 4 "regular" VKI support surat pernyataan (tidak-diperjualbelikan,
 * memiliki-menguasai, kebenaran-data, alur-proses) all share the same real
 * fields on `payload.vkiSupportDocs[]` — `nomorSurat`/`tanggal`/
 * `penandatangan` — set by the company alongside the upload
 * (`vkiSupportDocEntrySchema`). Same 4-item shape for each, just the
 * document's own title/description/criteria differ.
 */
function suratPernyataanItems(defKey: string, docTitle: string, docDesc: string, contentCriteria: string[]): ChecklistItemDef[] {
  return [
    {
      id: `${defKey}-number`,
      title: "Nomor Surat Pernyataan",
      description: "Nomor surat pernyataan merupakan nomor identifikasi dokumen yang diinput perusahaan saat mengunggah surat pernyataan.",
      question: "Apakah nomor surat pernyataan sesuai dengan dokumen yang diunggah?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.vkiSupportDocs?.find((entry) => entry.key === defKey)?.nomorSurat,
      criteria: ["Nomor surat sesuai dengan dokumen.", "Nomor dapat dibaca dengan jelas."],
    },
    {
      id: `${defKey}-date`,
      title: "Tanggal Surat Pernyataan",
      description: "Tanggal surat pernyataan menunjukkan tanggal dokumen diterbitkan/ditandatangani.",
      question: "Apakah tanggal surat pernyataan sesuai dengan dokumen?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.vkiSupportDocs?.find((entry) => entry.key === defKey)?.tanggal,
      criteria: ["Tanggal pada sistem sama dengan dokumen.", "Surat pernyataan masih berlaku."],
    },
    {
      id: `${defKey}-signatory`,
      title: "Nama Penandatangan",
      description: "Nama penandatangan adalah pihak berwenang yang menandatangani surat pernyataan.",
      question: "Apakah nama penandatangan sesuai dengan dokumen dan berwenang mewakili perusahaan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.vkiSupportDocs?.find((entry) => entry.key === defKey)?.penandatangan,
      criteria: ["Nama penandatangan tercantum dengan jelas.", "Penandatangan berwenang mewakili perusahaan."],
    },
    {
      id: `${defKey}-content`,
      title: "Isi Pernyataan",
      description: docDesc,
      question: `Apakah isi ${docTitle.toLowerCase()} sesuai dengan format dan ketentuan yang berlaku?`,
      criteria: contentCriteria,
    },
  ];
}

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-04" (the `<input type="month">` value) → "April 2026". Anything else passes through unchanged. */
function formatBulanTahun(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const monthName = INDONESIAN_MONTHS[Number(match[2]) - 1];
  return monthName ? `${monthName} ${match[1]}` : value;
}

/** Strips non-digits and reformats as "Rp 2.565.000" — normalizes both raw numbers and already-"Rp"-prefixed input the same way. */
function formatRupiah(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return `Rp ${Number(digits).toLocaleString("id-ID")}`;
}

/**
 * "2026-07-03" or a full ISO datetime like "2026-07-03T00:00:00.000Z" (the
 * latter comes from `companySkt.sktDate`, a Prisma `DateTime` column
 * serialized to JSON) → "3 Juli 2026". Invalid/unparseable input passes
 * through unchanged rather than showing "Invalid Date".
 */
function formatTanggal(value: string | null | undefined): string | undefined {
  if (!value) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Bukti Pembayaran Listrik — one instance per `payload.electricityMonths[]`
 * entry, keyed `vki-support:listrik:${monthId}`. Real fields (`bulan`,
 * `nominal`, `kwh`) are set by the company alongside the upload
 * (`electricityMonthSchema`); "Status Pembayaran" has no backing field so it
 * stays manual.
 */
function electricityBillItems(monthId: string): ChecklistItemDef[] {
  const findMonth = (payload: ApplicationWizardValues) => payload.electricityMonths?.find((m) => m.id === monthId);
  return [
    {
      id: "listrik-period",
      title: "Periode Tagihan",
      description: "Periode tagihan menunjukkan bulan dan tahun penggunaan listrik.",
      question: "Apakah bukti pembayaran listrik merupakan tagihan terbaru?",
      dataSource: "Data ditampilkan otomatis berdasarkan data permohonan — bulan dan tahun.",
      getValue: ({ payload }) => formatBulanTahun(findMonth(payload)?.bulan),
      criteria: ["Bukti pembayaran berasal dari periode yang ditentukan (misalnya tiga bulan terakhir).", "Bulan dan tagihan dapat dibaca dengan jelas."],
    },
    {
      id: "listrik-payment-status",
      title: "Status Pembayaran",
      description: "Status pembayaran menunjukkan apakah tagihan listrik telah dibayarkan.",
      question: "Apakah tagihan listrik telah dilunasi?",
      criteria: ["Status pembayaran lunas.", "Tidak terdapat tunggakan."],
    },
    {
      id: "listrik-nominal",
      title: "Nominal Pembayaran",
      description: "Nominal pembayaran menunjukkan total tagihan listrik yang dibayarkan perusahaan untuk periode tertentu.",
      question: "Apakah nominal pembayaran listrik sesuai dengan skala operasional perusahaan yang diajukan?",
      dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => formatRupiah(findMonth(payload)?.nominal),
      examples: ["Rp 12.500.000"],
      criteria: [
        "Nominal pembayaran tercantum dengan jelas pada dokumen.",
        "Nominal sesuai dengan daya listrik terpasang.",
        "Nominal pembayaran wajar terhadap kapasitas produksi yang diklaim.",
        "Tidak terdapat perbedaan atau indikasi manipulasi dokumen.",
      ],
    },
    {
      id: "listrik-kwh",
      title: "Pemakaian Listrik (kWh)",
      description: "Pemakaian listrik (kWh) menunjukkan jumlah energi listrik yang digunakan perusahaan selama periode tagihan tertentu.",
      question: "Apakah jumlah kWh yang digunakan sesuai dengan skala operasional dan kapasitas produksi perusahaan?",
      dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => findMonth(payload)?.kwh,
      examples: ["3.850 kWh"],
      criteria: [
        "Nilai kWh tercantum dengan jelas pada dokumen.",
        "Pemakaian listrik sesuai dengan daya terpasang.",
        "Konsumsi listrik wajar dibandingkan kapasitas produksi yang diklaim.",
        "Tidak terdapat anomali atau ketidaksesuaian.",
      ],
    },
  ];
}

const DOCUMENT_CHECKLIST_ITEMS: Record<string, ChecklistItemDef[]> = {
  nib: [
    {
      id: "nib-number",
      title: "Nomor NIB",
      description: "Nomor Induk Berusaha (NIB) adalah nomor identitas resmi perusahaan yang diterbitkan oleh OSS.",
      question: "Apakah nomor NIB perusahaan sesuai dengan nomor yang tercantum pada dokumen NIB?",
      dataSource: "Data nomor ditampilkan secara otomatis berdasarkan data permohonan pada saat mengupload NIB, diisi oleh perusahaan.",
      getValue: ({ payload }) => payload.nibNumber,
      criteria: [
        "Nomor NIB pada sistem harus sama dengan nomor pada dokumen.",
        "Nomor tidak boleh berbeda satu digit pun.",
        "Status NIB harus masih aktif.",
      ],
    },
    {
      id: "nib-company-name",
      title: "Nama Perusahaan",
      description:
        "Nama perusahaan yang terdaftar pada NIB harus sama dengan nama perusahaan yang tercantum dalam dokumen legal lainnya (SK Kemenkumham, akta pendirian, atau akta perubahan terakhir).",
      question: "Apakah nama perusahaan sesuai dengan yang tertera pada dokumen NIB?",
      dataSource: "Data nama perusahaan ditampilkan secara otomatis berdasarkan data permohonan yang diisi oleh perusahaan.",
      getValue: ({ payload }) => payload.companyName,
      examples: ["CV Model Manis"],
      criteria: [
        "Nama perusahaan harus identik dengan dokumen NIB.",
        "Tidak boleh terdapat perbedaan penulisan.",
        "Harus sesuai dengan akta terakhir.",
      ],
    },
    {
      id: "nib-issue-date",
      title: "Tanggal Terbit NIB",
      description: "Tanggal terbit NIB merupakan tanggal penerbitan Nomor Induk Berusaha oleh sistem OSS.",
      question: "Apakah tanggal terbit NIB sesuai dengan yang tercantum pada dokumen?",
      dataSource: "Data tanggal ditampilkan secara otomatis berdasarkan data permohonan, diisi oleh perusahaan.",
      getValue: ({ payload }) => formatTanggal(payload.nibIssueDate),
      criteria: [
        "Tanggal pada sistem harus sesuai dengan dokumen.",
        "Dokumen NIB harus masih berlaku.",
        "Tidak terdapat perubahan atau koreksi yang belum diperbarui.",
      ],
    },
    {
      id: "nib-business-entity",
      title: "Bentuk Badan Usaha",
      description: "Bentuk badan usaha menunjukkan jenis entitas hukum perusahaan.",
      question: "Apakah bentuk badan usaha pada dokumen sesuai dengan data perusahaan?",
      dataSource: "Data bentuk badan usaha ditampilkan secara otomatis berdasarkan data permohonan, diisi oleh perusahaan.",
      getValue: ({ payload }) => payload.companyType,
      examples: ["PT", "CV", "Firma", "Koperasi", "Perseroan Perorangan"],
      criteria: ["Bentuk badan usaha pada sistem harus sama dengan dokumen NIB."],
    },
    {
      id: "nib-status",
      title: "Status NIB",
      description: "Status NIB menunjukkan kondisi legal perusahaan pada saat proses verifikasi dilakukan.",
      question: "Apakah status NIB perusahaan masih aktif?",
      criteria: ["NIB masih aktif.", "Tidak dicabut.", "Tidak dibekukan."],
    },
  ],
  "kbli-utama": [
    {
      id: "kbli-utama-code",
      title: "Kode KBLI Utama",
      description: "KBLI Utama merupakan kode klasifikasi yang menggambarkan kegiatan usaha utama perusahaan.",
      question: "Apakah KBLI utama perusahaan sesuai dengan bidang usaha yang tercantum pada dokumen NIB dan permohonan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => {
        const { utama } = splitKbliEntries(payload.kbliEntries ?? []);
        if (utama.length === 0) return undefined;
        return utama.map((entry) => `${entry.code} — ${entry.description}`).join("; ");
      },
      examples: ["15201 — Industri Alas Kaki untuk Keperluan Sehari-hari"],
      criteria: [
        "Kode KBLI pada sistem harus sama dengan kode pada dokumen NIB.",
        "Deskripsi KBLI harus sesuai.",
        "KBLI harus mendukung kegiatan usaha yang diajukan.",
        "KBLI harus berstatus aktif.",
      ],
    },
    {
      id: "kbli-utama-description",
      title: "Deskripsi KBLI Utama",
      description: "Deskripsi KBLI menjelaskan jenis kegiatan usaha yang dapat dilakukan oleh perusahaan.",
      question: "Apakah deskripsi KBLI sesuai dengan kegiatan usaha perusahaan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => splitKbliEntries(payload.kbliEntries ?? []).utama.map((e) => e.description).join("; ") || undefined,
      examples: ["Industri Alas Kaki untuk Keperluan Sehari-hari"],
      criteria: [
        "Deskripsi KBLI harus sesuai dengan aktivitas perusahaan.",
        "Tidak boleh bertentangan dengan produk yang diajukan.",
        "Harus mendukung proses produksi yang dilakukan perusahaan.",
      ],
    },
    {
      id: "kbli-utama-product-match",
      title: "Kesesuaian KBLI Utama dengan Produk yang Diajukan",
      description: "Verifikator harus memastikan bahwa produk atau barang yang diajukan dalam permohonan sesuai dengan KBLI utama perusahaan.",
      question: "Apakah produk yang diajukan sesuai dengan KBLI utama perusahaan?",
      criteria: [
        "Produk harus sesuai dengan ruang lingkup KBLI utama.",
        "Tidak boleh terdapat produk yang berada di luar cakupan KBLI utama.",
        "Produk harus relevan dengan kegiatan usaha perusahaan.",
      ],
    },
    {
      id: "kbli-utama-status",
      title: "Status KBLI Utama",
      description: "Status KBLI menunjukkan apakah kode KBLI masih aktif dan dapat digunakan untuk kegiatan usaha perusahaan.",
      question: "Apakah KBLI utama perusahaan masih aktif dan berlaku?",
      criteria: [
        "KBLI masih aktif.",
        "Tidak dicabut.",
        "Tidak dinonaktifkan.",
        "Dapat digunakan untuk pengajuan yang sedang diproses.",
      ],
    },
  ],
  "kbli-pendukung": [
    {
      id: "kbli-pendukung-list",
      title: "Daftar KBLI Pendukung",
      description: "KBLI pendukung merupakan kegiatan usaha tambahan yang mendukung kegiatan usaha utama perusahaan.",
      question: "Apakah KBLI pendukung yang tercantum pada NIB sesuai dengan kegiatan usaha perusahaan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => {
        const { pendukung } = splitKbliEntries(payload.kbliEntries ?? []);
        if (pendukung.length === 0) return "Tidak ada KBLI pendukung";
        return pendukung.map((entry) => `${entry.code} — ${entry.description}`).join("; ");
      },
      examples: ["46491 — Perdagangan Besar Berbagai Barang dan Perlengkapan Rumah Tangga"],
      criteria: [
        "KBLI pendukung tercantum dalam NIB.",
        "Kegiatan usaha pendukung masih berkaitan dengan kegiatan usaha utama.",
        "KBLI pendukung mendukung proses bisnis perusahaan.",
      ],
    },
    {
      id: "kbli-pendukung-product-match",
      title: "Kesesuaian KBLI Pendukung dengan Produk yang Diajukan",
      description: "Verifikator memastikan bahwa produk atau barang yang diajukan dalam permohonan konsisten dengan KBLI pendukung perusahaan, apabila tersedia.",
      question: "Apakah produk yang diajukan sesuai dengan KBLI pendukung perusahaan?",
      criteria: [
        "Produk harus sesuai dengan ruang lingkup KBLI pendukung.",
        "Kegiatan usaha pendukung tidak bertentangan dengan kegiatan usaha utama.",
      ],
    },
    {
      id: "kbli-pendukung-status",
      title: "Status KBLI Pendukung",
      description: "Status KBLI pendukung menunjukkan apakah kode KBLI tambahan masih aktif dan dapat digunakan untuk kegiatan usaha perusahaan.",
      question: "Apakah KBLI pendukung perusahaan masih aktif dan berlaku?",
      criteria: [
        "KBLI pendukung masih aktif.",
        "Tidak dicabut.",
        "Tidak dinonaktifkan.",
      ],
    },
  ],
  sk: [
    {
      id: "sk-number",
      title: "Nomor SK Kemenkumham",
      description:
        "Nomor SK Kemenkumham merupakan nomor keputusan yang diterbitkan oleh Kementerian Hukum dan HAM sebagai bukti pengesahan badan hukum perusahaan.",
      question: "Apakah nomor SK Kemenkumham sesuai dengan dokumen yang diunggah?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.skNumber,
      examples: ["AHU-0012345.AH.01.01.Tahun 2024"],
      criteria: ["Nomor SK sesuai dengan dokumen.", "Nomor SK dapat dibaca dengan jelas.", "Nomor SK sesuai dengan akta pendirian atau akta perubahan."],
    },
    {
      id: "sk-date",
      title: "Tanggal SK Kemenkumham",
      description: "Tanggal SK menunjukkan tanggal pengesahan perusahaan oleh Kementerian Hukum dan HAM.",
      question: "Apakah tanggal SK sesuai dengan dokumen?",
      criteria: ["Tanggal pada sistem sama dengan dokumen.", "Tidak terdapat perbedaan tanggal."],
    },
    {
      id: "sk-company-name",
      title: "Nama Perusahaan",
      description: "Nama perusahaan yang tercantum dalam SK Kemenkumham harus sama dengan nama perusahaan pada sistem dan dokumen lainnya.",
      question: "Apakah nama perusahaan sesuai dengan SK Kemenkumham?",
      examples: ["CV Model Manis"],
      criteria: ["Nama perusahaan identik dengan SK.", "Tidak terdapat perbedaan penulisan."],
    },
    {
      id: "sk-ratification-status",
      title: "Status Pengesahan",
      description: "Status pengesahan menunjukkan bahwa perusahaan telah memperoleh persetujuan atau pengesahan dari Kementerian Hukum dan HAM.",
      question: "Apakah status pengesahan pada SK masih berlaku dan sah?",
      criteria: ["SK telah diterbitkan secara resmi.", "Tidak dicabut.", "Tidak dibatalkan."],
    },
  ],
  notarial: [
    {
      id: "notarial-number",
      title: "Nomor Akta Pendirian",
      description: "Nomor akta pendirian merupakan nomor resmi yang diterbitkan oleh notaris pada saat perusahaan didirikan.",
      question: "Apakah nomor akta pendirian sesuai dengan dokumen yang diunggah?",
      dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.notarialDeedNumber,
      criteria: ["Nomor akta sesuai dengan dokumen.", "Nomor akta dapat dibaca dengan jelas.", "Tidak terdapat perbedaan nomor."],
    },
    {
      id: "notarial-date",
      title: "Tanggal Akta Pendirian",
      description: "Tanggal akta menunjukkan tanggal resmi pendirian perusahaan.",
      question: "Apakah tanggal akta pendirian sesuai dengan dokumen?",
      criteria: ["Tanggal pada sistem sama dengan dokumen.", "Tidak terdapat perubahan yang belum diperbarui."],
    },
    {
      id: "notarial-company-name",
      title: "Nama Perusahaan",
      description: "Nama perusahaan yang tercantum dalam akta harus sama dengan nama perusahaan pada permohonan.",
      question: "Apakah nama perusahaan sesuai dengan akta pendirian?",
      examples: ["CV Model Manis"],
      criteria: [
        "Nama perusahaan harus identik.",
        "Tidak boleh terdapat perbedaan penulisan.",
        "Harus sesuai dengan akta perubahan terakhir (jika ada).",
      ],
    },
    {
      id: "notarial-business-entity",
      title: "Bentuk Badan Usaha",
      description: "Bentuk badan usaha menunjukkan status hukum perusahaan.",
      question: "Apakah bentuk badan usaha sesuai dengan akta?",
      examples: ["PT", "CV", "Firma", "Koperasi", "Perseroan Perorangan"],
      criteria: ["Bentuk badan usaha harus sama dengan dokumen."],
    },
    {
      id: "notarial-notary-name",
      title: "Nama Notaris",
      description: "Notaris adalah pejabat yang membuat dan mengesahkan akta pendirian.",
      question: "Apakah nama notaris sesuai dengan yang tercantum pada akta?",
      criteria: ["Nama notaris harus tercantum dengan jelas.", "Nomor dan wilayah kerja notaris sesuai."],
    },
  ],
  "notarial-amendment": [
    {
      id: "amendment-number",
      title: "Nomor Akta Perubahan",
      description: "Nomor akta perubahan merupakan nomor resmi yang diterbitkan oleh notaris untuk setiap perubahan perusahaan.",
      question: "Apakah nomor akta perubahan sesuai dengan dokumen yang diunggah?",
      dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.notarialAmendmentNumber,
      criteria: ["Nomor akta perubahan sesuai dengan dokumen.", "Tidak terdapat perbedaan nomor.", "Nomor akta dapat dibaca dengan jelas."],
    },
    {
      id: "amendment-date",
      title: "Tanggal Akta Perubahan",
      description: "Tanggal akta perubahan menunjukkan tanggal resmi perubahan perusahaan dilakukan.",
      question: "Apakah tanggal akta perubahan sesuai dengan dokumen?",
      dataSource: "Data ditampilkan otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => formatTanggal(payload.notarialAmendmentDate),
      criteria: ["Tanggal pada sistem sama dengan dokumen.", "Tanggal perubahan merupakan perubahan terakhir yang berlaku."],
    },
    {
      id: "amendment-company-name",
      title: "Nama Perusahaan Terbaru",
      description: "Nama perusahaan yang tercantum dalam akta perubahan terakhir harus sesuai dengan data perusahaan pada sistem.",
      question: "Apakah nama perusahaan sesuai dengan akta perubahan terakhir?",
      examples: ["CV Model Manis"],
      criteria: ["Nama perusahaan identik dengan akta perubahan.", "Tidak terdapat perbedaan penulisan."],
    },
    {
      id: "amendment-type",
      title: "Jenis Perubahan",
      description: "Jenis perubahan menjelaskan bagian perusahaan yang mengalami perubahan.",
      question: "Apakah jenis perubahan sesuai dengan dokumen?",
      examples: [
        "Perubahan nama perusahaan",
        "Perubahan alamat perusahaan",
        "Perubahan pengurus",
        "Perubahan pemegang saham",
        "Perubahan modal",
        "Perubahan maksud dan tujuan usaha",
        "Perubahan KBLI",
        "Perubahan status badan usaha",
      ],
      criteria: ["Jenis perubahan harus sesuai dengan dokumen.", "Perubahan telah diperbarui pada sistem."],
    },
    {
      id: "amendment-address",
      title: "Alamat Perusahaan Terbaru",
      description: "Alamat perusahaan yang tercantum dalam akta perubahan harus sesuai dengan data perusahaan pada sistem.",
      question: "Apakah alamat perusahaan sesuai dengan akta perubahan?",
      criteria: ["Alamat kantor sesuai.", "Kota dan provinsi sesuai.", "Tidak terdapat perbedaan alamat."],
    },
  ],
  npwp: [
    {
      id: "npwp-number",
      title: "Nomor NPWP",
      description: "Nomor Pokok Wajib Pajak (NPWP) adalah nomor identitas perpajakan yang digunakan oleh perusahaan dalam memenuhi kewajiban perpajakan.",
      question: "Apakah nomor NPWP perusahaan sesuai dengan dokumen yang diunggah?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.npwpNumber,
      examples: ["01.234.567.8-901.000"],
      criteria: ["Nomor NPWP pada sistem harus sama dengan dokumen.", "Jumlah digit NPWP lengkap dan dapat dibaca.", "Tidak terdapat perbedaan nomor."],
    },
    {
      id: "npwp-taxpayer-name",
      title: "Nama Wajib Pajak",
      description: "Nama wajib pajak merupakan nama perusahaan yang terdaftar pada Direktorat Jenderal Pajak.",
      question: "Apakah nama wajib pajak sesuai dengan nama perusahaan pada dokumen NPWP?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan — nama wajib pajak sama dengan nama perusahaan.",
      getValue: ({ payload }) => payload.companyName,
      examples: ["CV Model Manis"],
      criteria: [
        "Nama wajib pajak harus sama dengan nama perusahaan.",
        "Tidak terdapat perbedaan penulisan.",
        "Harus sesuai dengan akta perubahan terakhir.",
      ],
    },
    {
      id: "npwp-address",
      title: "Alamat Wajib Pajak",
      description: "Alamat wajib pajak merupakan alamat perusahaan yang terdaftar pada sistem perpajakan.",
      question: "Apakah alamat wajib pajak sesuai dengan dokumen NPWP?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan — alamat wajib pajak sama dengan alamat perusahaan.",
      getValue: ({ businessAddress }) => businessAddress,
      criteria: ["Alamat sesuai dengan data perusahaan.", "Kota dan provinsi sesuai.", "Tidak terdapat perbedaan alamat yang signifikan."],
    },
    {
      id: "npwp-status",
      title: "Status NPWP",
      description: "Status NPWP menunjukkan apakah NPWP perusahaan masih aktif dan dapat digunakan.",
      question: "Apakah status NPWP perusahaan masih aktif?",
      criteria: ["NPWP masih aktif.", "Tidak dinonaktifkan.", "Tidak dicabut."],
    },
    {
      id: "npwp-kpp",
      title: "KPP Terdaftar",
      description: "Kantor Pelayanan Pajak (KPP) merupakan unit Direktorat Jenderal Pajak tempat perusahaan terdaftar.",
      question: "Apakah KPP terdaftar sesuai dengan dokumen NPWP?",
      examples: ["KPP Pratama Bandung Tengah"],
      criteria: ["Nama KPP tercantum dengan jelas.", "KPP sesuai dengan wilayah perusahaan."],
    },
  ],
  skt: [
    {
      id: "skt-number",
      title: "Nomor Surat Keterangan Terdaftar (SKT)",
      description: "Nomor SKT merupakan nomor resmi yang diterbitkan oleh Direktorat Jenderal Pajak sebagai bukti registrasi wajib pajak.",
      question: "Apakah nomor SKT sesuai dengan dokumen yang diunggah?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload, companySkt }) => payload.sktNumber || companySkt?.sktNumber,
      criteria: ["Nomor SKT sesuai dengan dokumen.", "Nomor dapat dibaca dengan jelas.", "Tidak terdapat perbedaan data."],
    },
    {
      id: "skt-npwp",
      title: "Nomor NPWP",
      description: "Nomor NPWP yang tercantum dalam SKT harus sesuai dengan NPWP perusahaan yang terdaftar dalam sistem.",
      question: "Apakah nomor NPWP sesuai dengan dokumen SKT?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => payload.npwpNumber,
      examples: ["01.234.567.8-901.000"],
      criteria: ["Nomor NPWP pada SKT sama dengan data permohonan.", "Tidak terdapat perbedaan digit."],
    },
    {
      id: "skt-taxpayer-name",
      title: "Nama Wajib Pajak",
      description: "Nama wajib pajak merupakan nama perusahaan yang terdaftar pada Direktorat Jenderal Pajak.",
      question: "Apakah nama wajib pajak sesuai dengan dokumen SKT?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan — nama wajib pajak sama dengan nama perusahaan.",
      getValue: ({ payload }) => payload.companyName,
      examples: ["CV Model Manis"],
      criteria: ["Nama perusahaan identik dengan dokumen SKT.", "Sesuai dengan akta pendirian atau akta perubahan terakhir."],
    },
    {
      id: "skt-address",
      title: "Alamat Wajib Pajak",
      description: "Alamat wajib pajak merupakan alamat perusahaan yang tercatat pada Direktorat Jenderal Pajak.",
      question: "Apakah alamat wajib pajak sesuai dengan dokumen SKT?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan — alamat wajib pajak sama dengan alamat perusahaan.",
      getValue: ({ businessAddress }) => businessAddress,
      criteria: ["Alamat perusahaan sesuai dengan data permohonan.", "Kota dan provinsi sesuai.", "Tidak terdapat perbedaan alamat yang signifikan."],
    },
    {
      id: "skt-kpp",
      title: "KPP Terdaftar",
      description: "Kantor Pelayanan Pajak (KPP) adalah kantor pajak tempat perusahaan terdaftar.",
      question: "Apakah KPP terdaftar sesuai dengan dokumen SKT?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan — KPP terdaftar sama dengan lembaga penerbit SKT.",
      getValue: ({ payload, companySkt }) => payload.sktIssuer || companySkt?.sktIssuer,
      examples: ["KPP Pratama Bandung Tengah"],
      criteria: ["Nama KPP tercantum dengan jelas.", "KPP sesuai dengan wilayah perusahaan."],
    },
    {
      id: "skt-registered-date",
      title: "Tanggal Terdaftar",
      description: "Tanggal terdaftar menunjukkan tanggal resmi perusahaan terdaftar sebagai wajib pajak.",
      question: "Apakah tanggal terdaftar sesuai dengan dokumen SKT?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan — tanggal terdaftar sama dengan tanggal terbit SKT.",
      getValue: ({ payload, companySkt }) => formatTanggal(payload.sktDate || companySkt?.sktDate),
      criteria: ["Tanggal pada sistem sama dengan dokumen.", "Tidak terdapat perbedaan data."],
    },
    {
      id: "skt-status",
      title: "Status Wajib Pajak",
      description: "Status wajib pajak menunjukkan bahwa perusahaan masih aktif dan terdaftar pada Direktorat Jenderal Pajak.",
      question: "Apakah status wajib pajak masih aktif?",
      criteria: ["Wajib pajak masih aktif.", "Tidak dicabut.", "Tidak dinonaktifkan."],
    },
  ],
  "vki-support:tenaga-kerja": [
    {
      id: "tenaga-kerja-data",
      title: "Data Tenaga Kerja",
      description: "Data tenaga kerja memuat jumlah tenaga kerja per kategori/departemen yang mendukung kegiatan industri.",
      question: "Apakah data tenaga kerja sesuai dengan yang tercantum pada surat pernyataan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data permohonan.",
      getValue: ({ payload }) => {
        const entries = payload.tenagaKerjaEntries ?? [];
        if (entries.length === 0) return undefined;
        return entries.map((e) => `${e.kategori ?? "—"}: ${e.jumlah ?? "—"} orang`).join("; ");
      },
      criteria: ["Jumlah tenaga kerja tercantum jelas.", "Data tenaga kerja sesuai dengan skala kegiatan industri."],
    },
    {
      id: "tenaga-kerja-content",
      title: "Isi Pernyataan",
      description: "Pernyataan jumlah tenaga kerja per kategori/departemen.",
      question: "Apakah isi surat pernyataan tenaga kerja sesuai dengan format dan ketentuan yang berlaku?",
      criteria: ["Surat pernyataan ditandatangani oleh pihak berwenang.", "Isi pernyataan sesuai dengan format yang dipersyaratkan."],
    },
  ],
  "vki-support:tidak-diperjualbelikan": suratPernyataanItems(
    "tidak-diperjualbelikan",
    "Surat Pernyataan Tidak Akan Diperjualbelikan atau Dipindahtangankan",
    "Pernyataan bahwa mesin/peralatan produksi tidak akan diperjualbelikan atau dipindahtangankan.",
    ["Isi pernyataan sesuai dengan format yang dipersyaratkan.", "Pernyataan mencakup seluruh mesin/peralatan produksi yang digunakan."],
  ),
  "vki-support:memiliki-menguasai": suratPernyataanItems(
    "memiliki-menguasai",
    "Surat Pernyataan Memiliki atau Menguasai",
    "Pernyataan kepemilikan atau penguasaan atas mesin/peralatan produksi.",
    ["Status kepemilikan/penguasaan mesin dinyatakan jelas.", "Pernyataan konsisten dengan data mesin yang diajukan."],
  ),
  "vki-support:kebenaran-data": suratPernyataanItems(
    "kebenaran-data",
    "Surat Pernyataan Kebenaran Data",
    "Pernyataan bahwa seluruh data dan dokumen yang disampaikan benar dan dapat dipertanggungjawabkan.",
    ["Materai/legalitas surat pernyataan terpenuhi (jika berlaku).", "Pernyataan mencakup seluruh data yang diajukan dalam permohonan."],
  ),
  "vki-support:alur-proses": suratPernyataanItems(
    "alur-proses",
    "Surat Pernyataan Alur Proses",
    "Pernyataan mengenai alur proses produksi yang dijalankan.",
    ["Alur proses produksi dijelaskan dengan lengkap.", "Alur proses konsisten dengan produk dan kapasitas yang dimohonkan."],
  ),
};

/**
 * "Dokumen Kepemilikan Bangunan" — one uraian set per typed ownership/lease
 * entry (SHM/AJB/HGB/... for milik sendiri; Sewa Menyewa/Pinjam Pakai/... for
 * sewa). All `getValue` fields resolve the specific `locationId` from
 * `payload.locations` at review time — real lokasi data, not a guess.
 */
function findLocation(payload: ApplicationWizardValues, locationId: string) {
  return payload.locations?.find((loc) => loc.id === locationId);
}

function ownershipDocumentItems(locationId: string, type: OwnershipDocumentType): ChecklistItemDef[] {
  const typeLabel = OWNERSHIP_DOCUMENT_TYPE_LABELS[type];
  return [
    {
      id: "location-ownership-doc-type",
      title: "Jenis Dokumen",
      description: "Jenis dokumen menunjukkan bentuk bukti kepemilikan bangunan yang diunggah perusahaan.",
      question: "Apakah jenis dokumen yang diunggah sesuai dengan yang tercantum pada sistem?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan jenis dokumen yang dipilih perusahaan saat mengunggah.",
      getValue: () => typeLabel,
      criteria: ["Jenis dokumen pada sistem sesuai dengan dokumen yang diunggah.", "Dokumen dapat dibaca dengan jelas."],
    },
    {
      id: "location-ownership-address",
      title: "Alamat Lokasi",
      description: "Alamat lokasi menunjukkan alamat fasilitas bangunan yang menjadi objek dokumen kepemilikan.",
      question: "Apakah alamat pada dokumen sesuai dengan alamat lokasi yang diajukan dalam permohonan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data lokasi pada permohonan.",
      getValue: ({ payload }) => {
        const loc = findLocation(payload, locationId);
        return loc ? `${composeLocationAddress(loc)}, ${loc.city}, ${loc.province}` : undefined;
      },
      criteria: ["Alamat pada dokumen sesuai dengan alamat lokasi permohonan.", "Tidak terdapat perbedaan alamat yang signifikan."],
    },
    {
      id: "location-ownership-status",
      title: "Status Kepemilikan",
      description: "Status kepemilikan menunjukkan bahwa bangunan merupakan milik perusahaan sendiri.",
      question: "Apakah status kepemilikan pada dokumen konsisten dengan status bangunan yang dinyatakan perusahaan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan status bangunan pada data lokasi.",
      getValue: ({ payload }) => (findLocation(payload, locationId)?.buildingStatus === "MILIK_SENDIRI" ? "Milik Sendiri" : undefined),
      criteria: ["Status kepemilikan pada dokumen sesuai dengan data sistem.", "Tidak terdapat sengketa atau catatan hukum atas bangunan."],
    },
    {
      id: "location-ownership-field-match",
      title: "Kesesuaian dengan Kondisi Lapangan",
      description: "Kesesuaian dokumen dengan kondisi aktual bangunan diverifikasi melalui observasi lokasi industri.",
      question: "Apakah bangunan yang tercantum dalam dokumen benar-benar tersedia dan digunakan untuk kegiatan produksi?",
      criteria: ["Bangunan sesuai dengan yang tercantum dalam dokumen.", "Bangunan digunakan untuk kegiatan produksi sesuai permohonan."],
    },
  ];
}

function leaseDocumentItems(locationId: string, type: LeaseDocumentType): ChecklistItemDef[] {
  const typeLabel = LEASE_DOCUMENT_TYPE_LABELS[type];
  return [
    {
      id: "location-lease-doc-type",
      title: "Jenis Dokumen",
      description: "Jenis dokumen menunjukkan bentuk bukti penguasaan bangunan yang diunggah perusahaan.",
      question: "Apakah jenis dokumen yang diunggah sesuai dengan yang tercantum pada sistem?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan jenis dokumen yang dipilih perusahaan saat mengunggah.",
      getValue: () => typeLabel,
      criteria: ["Jenis dokumen pada sistem sesuai dengan dokumen yang diunggah.", "Dokumen dapat dibaca dengan jelas."],
    },
    {
      id: "location-lease-address",
      title: "Alamat Lokasi",
      description: "Alamat lokasi menunjukkan alamat fasilitas bangunan yang menjadi objek perjanjian.",
      question: "Apakah alamat pada dokumen sesuai dengan alamat lokasi yang diajukan dalam permohonan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data lokasi pada permohonan.",
      getValue: ({ payload }) => {
        const loc = findLocation(payload, locationId);
        return loc ? `${composeLocationAddress(loc)}, ${loc.city}, ${loc.province}` : undefined;
      },
      criteria: ["Alamat pada dokumen sesuai dengan alamat lokasi permohonan.", "Tidak terdapat perbedaan alamat yang signifikan."],
    },
    {
      id: "location-lease-owner-name",
      title: "Nama Pemilik Asli",
      description: "Nama pemilik asli merupakan pihak yang menyewakan/memberikan hak penguasaan atas bangunan.",
      question: "Apakah nama pemilik asli pada dokumen sesuai dengan data permohonan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data lokasi pada permohonan.",
      getValue: ({ payload }) => findLocation(payload, locationId)?.leaseOriginalOwnerName,
      criteria: ["Nama pemilik asli tercantum dengan jelas pada dokumen.", "Nama sesuai dengan data permohonan."],
    },
    {
      id: "location-lease-period",
      title: "Masa Berlaku",
      description: "Masa berlaku menunjukkan jangka waktu penguasaan bangunan sebagaimana disepakati para pihak.",
      question: "Apakah masa berlaku pada dokumen masih berlaku pada saat verifikasi dilakukan?",
      dataSource: "Data ditampilkan secara otomatis berdasarkan data lokasi pada permohonan — tanggal mulai dan berakhir.",
      getValue: ({ payload }) => {
        const loc = findLocation(payload, locationId);
        if (!loc?.leaseStartDate && !loc?.leaseEndDate) return undefined;
        return `${formatTanggal(loc?.leaseStartDate) ?? "—"} s.d. ${formatTanggal(loc?.leaseEndDate) ?? "—"}`;
      },
      criteria: ["Masa berlaku masih aktif pada saat verifikasi dilakukan.", "Tidak terdapat perbedaan tanggal dengan data sistem."],
    },
    {
      id: "location-lease-field-match",
      title: "Kesesuaian dengan Kondisi Lapangan",
      description: "Kesesuaian dokumen dengan kondisi aktual bangunan diverifikasi melalui observasi lokasi industri.",
      question: "Apakah bangunan yang tercantum dalam dokumen benar-benar tersedia dan digunakan untuk kegiatan produksi?",
      criteria: ["Bangunan sesuai dengan yang tercantum dalam dokumen.", "Bangunan digunakan untuk kegiatan produksi sesuai permohonan."],
    },
  ];
}

export function getChecklistItems(key: string): ChecklistItemDef[] {
  const electricityMatch = key.match(/^vki-support:listrik:(.+)$/);
  if (electricityMatch) return electricityBillItems(electricityMatch[1]);

  const locationMatch = key.match(/^location:([^:]+):(ownership|lease):([A-Za-z_]+)$/);
  if (locationMatch) {
    const [, locationId, kind, docType] = locationMatch;
    return kind === "ownership"
      ? ownershipDocumentItems(locationId, docType as OwnershipDocumentType)
      : leaseDocumentItems(locationId, docType as LeaseDocumentType);
  }

  return DOCUMENT_CHECKLIST_ITEMS[key] ?? GENERIC_CHECKLIST_ITEMS;
}
