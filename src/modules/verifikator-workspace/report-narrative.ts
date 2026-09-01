import { NON_INDUSTRI_SUPPORT_DOC_DEFS, type ApplicationWizardValues, type NonIndustriSupportDocDef } from "@/modules/applications/schema";
import { OWNERSHIP_DOCUMENT_TYPE_LABELS, LEASE_DOCUMENT_TYPE_LABELS, splitKbliEntries, type LocationValues } from "@/modules/shared/schema";
import type { CompanyLegalContext } from "./company-context";
import type { ChecklistPartnerContext } from "./schema";

export type NarrativeContext = {
  payload: ApplicationWizardValues;
  company: string;
  businessAddress: string | null;
  /** Resolved `Partner.company` NIB/NPWP/SK for every enabled VIU-industri "Partner Industri"
   * entry — see `buildPartnerIndustriDocuments` below. Defaults to `[]` when a caller doesn't
   * resolve partners (non-VIU-industri applications never have any enabled entries anyway). */
  partners?: ChecklistPartnerContext[];
  /**
   * Live Company fields for NIB/SK/Notarial/NPWP/SKT — `payload.Xxx` is a
   * snapshot frozen at submission time; once the company edits and
   * re-uploads via Company Workspace's profile editor, only the `Company`
   * row changes, so every narrative field/documentPath below must prefer
   * this live value or the printed report shows stale data next to a
   * document that no longer matches it. Mirrors the same pattern in
   * `document-checklist-items.ts`'s `ChecklistContext`.
   */
  companyLegal: CompanyLegalContext;
  /** Live `Company.locations`, same precedence as `companyLegal` — see `buildLocationDocuments`. */
  companyLocations: LocationValues[] | null;
  /**
   * Per-document checklist status (`data.documents[].status`, keyed by the
   * same `DocDetail.key`) — "memenuhi" must reflect that the verifikator has
   * actually reviewed and approved the document (VALID), not just that the
   * applicant's data looks complete. A fully-filled-in NPWP the verifikator
   * hasn't opened yet is not "Memenuhi".
   */
  documentStatuses: Record<string, string>;
};

/** True once the verifikator has actually marked this document VALID — see `NarrativeContext.documentStatuses`. */
function isVerified(ctx: NarrativeContext, key: string): boolean {
  return ctx.documentStatuses[key] === "VALID";
}

export type DocField = { label: string; value: string; ok: boolean };

export type DocDetail = {
  key: string;
  no: number;
  title: string;
  documentPath: (ctx: NarrativeContext) => string | null | undefined;
  /** Preview image aspect ratio (width/height) — defaults to "0.77" (A4-like) in DocImage; override for documents shaped like a physical card, e.g. NPWP at "18/11". */
  imageAspectRatio?: string;
  intro: (ctx: NarrativeContext) => string[];
  fields: (ctx: NarrativeContext) => DocField[];
  findings: (ctx: NarrativeContext) => string[];
  kesimpulan: (ctx: NarrativeContext) => { text: string; memenuhi: boolean };
};

const fmtDate = (value: string | null | undefined): string => {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
};

/**
 * "Legalitas Perusahaan" chapter — the 6 documents given full narrative
 * treatment in the approved Claude Design mockup (Document Verification
 * Report.dc.html, BAB II). Prose is adapted from that mockup: real system
 * values are interpolated, but the surrounding legal-narrative sentences
 * are authored text, not system-generated claims.
 */
export const LEGALITAS_DOCUMENTS: DocDetail[] = [
  {
    key: "nib",
    no: 1,
    title: "Nomor Induk Berusaha (NIB)",
    documentPath: ({ payload, companyLegal }) => companyLegal?.nibDocumentPath || payload.nibDocumentPath,
    intro: () => [
      "Verifikasi terhadap Nomor Induk Berusaha (NIB) dilakukan melalui pemeriksaan dokumen Perizinan Berusaha yang diterbitkan melalui sistem Online Single Submission (OSS). Pemeriksaan dilakukan untuk memastikan keabsahan identitas perusahaan, kesesuaian data perusahaan, serta keberlakuan Perizinan Berusaha sebagai salah satu persyaratan administrasi dalam pengajuan Verifikasi Kemampuan Industri (VKI).",
    ],
    fields: ({ payload, companyLegal }) => {
      const nibNumber = companyLegal?.nibNumber || payload.nibNumber;
      const nibIssueDate = companyLegal?.nibIssueDate || payload.nibIssueDate;
      return [
        { label: "Nomor Induk Berusaha (NIB)", value: nibNumber || "—", ok: Boolean(nibNumber) },
        { label: "Nama Perusahaan", value: payload.companyName || "—", ok: Boolean(payload.companyName) },
        { label: "Tanggal Terbit NIB", value: fmtDate(nibIssueDate), ok: Boolean(nibIssueDate) },
        { label: "Bentuk Badan Usaha", value: payload.companyType || "—", ok: Boolean(payload.companyType) },
        { label: "Status NIB", value: "NIB Berstatus Aktif", ok: Boolean(companyLegal?.nibDocumentPath || payload.nibDocumentPath) },
      ];
    },
    findings: ({ payload, company, companyLegal }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} memiliki Nomor Induk Berusaha (NIB) ${companyLegal?.nibNumber || payload.nibNumber || "—"}. NIB tersebut merupakan identitas resmi perusahaan dalam pelaksanaan kegiatan berusaha dan digunakan sebagai dasar legalitas perusahaan dalam menjalankan kegiatan industri sesuai dengan ketentuan peraturan perundang-undangan.`,
      "Hasil verifikasi menunjukkan bahwa data yang tercantum pada NIB meliputi nama perusahaan, alamat perusahaan, serta informasi kegiatan usaha telah sesuai dengan dokumen legal perusahaan yang diperiksa pada saat verifikasi. Selain itu, NIB tersebut masih berlaku dan digunakan sebagai Perizinan Berusaha perusahaan. Kepemilikan NIB tersebut telah memenuhi persyaratan administrasi sebagaimana dipersyaratkan dalam Pasal 30 ayat (2) huruf b angka 2 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, yang mewajibkan Perusahaan Industri memiliki Perizinan Berusaha sebagai salah satu dokumen dalam pengajuan Verifikasi Kemampuan Industri (VKI).",
    ],
    kesimpulan: (ctx) => {
      const { payload, company, companyLegal } = ctx;
      const nibNumber = companyLegal?.nibNumber || payload.nibNumber;
      const memenuhi = Boolean((companyLegal?.nibDocumentPath || payload.nibDocumentPath) && nibNumber) && isVerified(ctx, "nib");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen dan observasi lapangan, ${company} memiliki Nomor Induk Berusaha (NIB) ${nibNumber || "—"} yang masih berlaku dan sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 2 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025. Dengan demikian, aspek kelengkapan dan keabsahan NIB dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "kbli-utama",
    no: 2,
    title: "KBLI Utama",
    documentPath: ({ payload }) => payload.kbliDocumentPath,
    intro: () => [
      "Verifikasi terhadap Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) Utama dilakukan melalui pemeriksaan Lampiran Nomor Induk Berusaha (NIB) yang diterbitkan melalui sistem Online Single Submission (OSS). Pemeriksaan bertujuan untuk memastikan bahwa klasifikasi kegiatan usaha yang dimiliki perusahaan sesuai dengan kegiatan industri yang dijalankan dan menjadi objek Verifikasi Kemampuan Industri (VKI).",
    ],
    fields: ({ payload }) => {
      const { utama } = splitKbliEntries(payload.kbliEntries ?? []);
      if (utama.length === 0) return [{ label: "KBLI Utama", value: "—", ok: false }, { label: "Status KBLI", value: "KBLI Berstatus Aktif", ok: false }];
      const rows =
        utama.length === 1
          ? [{ label: "KBLI Utama", value: `${utama[0].code} — ${utama[0].description}`, ok: true }]
          : utama.map((entry, i) => ({ label: `KBLI Utama ${i + 1}`, value: `${entry.code} — ${entry.description}`, ok: true }));
      return [...rows, { label: "Status KBLI", value: "KBLI Berstatus Aktif", ok: true }];
    },
    findings: ({ payload }) => {
      const { utama } = splitKbliEntries(payload.kbliEntries ?? []);
      const list = utama.length > 0 ? utama.map((e) => `${e.code} – ${e.description}`).join(" dan ") : "—";
      return [
        `KBLI tersebut merupakan klasifikasi kegiatan usaha industri yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB) dan menjadi dasar legalitas perusahaan dalam melaksanakan kegiatan produksi sesuai dengan ruang lingkup usaha yang dimiliki.`,
        `Berdasarkan hasil pemeriksaan dokumen dan observasi lapangan, perusahaan melaksanakan kegiatan produksi sesuai dengan ruang lingkup KBLI ${list}. Aktivitas industri yang dijalankan terbukti sejalan dengan klasifikasi usaha yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB), sehingga baik secara administratif maupun operasional tidak ditemukan ketidaksesuaian antara KBLI yang dimiliki dengan kegiatan usaha perusahaan.`,
        "Kesesuaian KBLI dengan aktivitas industri menunjukkan bahwa kegiatan usaha perusahaan telah sesuai dengan klasifikasi usaha yang tercantum dalam Perizinan Berusaha. Informasi mengenai KBLI dan bidang usaha merupakan bagian dari identitas perusahaan yang wajib dimuat dalam Laporan Hasil Verifikasi Kemampuan Industri (LHVKI) sesuai dengan ketentuan Pasal 32 ayat (3) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const { utama } = splitKbliEntries(payload.kbliEntries ?? []);
      const list = utama.length > 0 ? utama.map((e) => `${e.code} – ${e.description}`).join(" dan ") : "—";
      const memenuhi = utama.length > 0 && isVerified(ctx, "kbli-utama");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen dan observasi lapangan, ${company} memiliki KBLI Utama ${list} yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB). Kegiatan usaha dan aktivitas produksi yang dilaksanakan perusahaan telah sesuai dengan klasifikasi usaha yang dimiliki. Dengan demikian, aspek kesesuaian KBLI Utama dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> dan sesuai dengan ketentuan Pasal 32 ayat (3) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  },
  {
    key: "kbli-pendukung",
    no: 3,
    title: "KBLI Pendukung",
    documentPath: ({ payload }) => payload.kbliDocumentPath,
    intro: () => [
      "Verifikasi terhadap Klasifikasi Baku Lapangan Usaha Indonesia (KBLI) Pendukung dilakukan melalui pemeriksaan Lampiran Nomor Induk Berusaha (NIB) yang diterbitkan melalui sistem Online Single Submission (OSS). Pemeriksaan bertujuan untuk memastikan bahwa kegiatan usaha pendukung yang dimiliki perusahaan telah tercantum dalam Perizinan Berusaha serta memiliki keterkaitan dengan kegiatan operasional perusahaan.",
    ],
    fields: ({ payload }) => {
      const { pendukung: rest } = splitKbliEntries(payload.kbliEntries ?? []);
      if (rest.length === 0) return [{ label: "KBLI Pendukung", value: "Tidak ada KBLI pendukung", ok: false }];
      return rest.map((entry, i) => ({
        label: `KBLI Pendukung ${i + 1}`,
        value: `${entry.code} — ${entry.description}`,
        ok: true,
      }));
    },
    findings: ({ payload }) => {
      const { pendukung: rest } = splitKbliEntries(payload.kbliEntries ?? []);
      if (rest.length === 0) {
        return ["Berdasarkan hasil pemeriksaan dokumen, perusahaan tidak memiliki KBLI pendukung selain KBLI Utama yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB)."];
      }
      const list = rest.map((e) => `${e.code} – ${e.description}`).join(" dan ");
      return [
        `Hasil pemeriksaan menunjukkan bahwa KBLI pendukung ${list} tercantum dalam Lampiran Nomor Induk Berusaha (NIB) dan menjadi bagian dari ruang lingkup kegiatan usaha yang dimiliki perusahaan.`,
        "Berdasarkan hasil pemeriksaan dokumen dan observasi lapangan, kegiatan usaha pendukung yang dimiliki perusahaan memiliki keterkaitan dengan aktivitas operasional perusahaan dan tidak bertentangan dengan kegiatan industri utama yang dijalankan.",
        "Informasi mengenai KBLI dan bidang usaha merupakan bagian dari identitas perusahaan yang wajib dimuat dalam Laporan Hasil Verifikasi Kemampuan Industri (LHVKI) sesuai dengan ketentuan Pasal 32 ayat (3) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const { pendukung: rest } = splitKbliEntries(payload.kbliEntries ?? []);
      const list = rest.map((e) => `${e.code} – ${e.description}`).join(" dan ");
      if (rest.length === 0) {
        return { memenuhi: true, text: `${company} tidak memiliki KBLI pendukung tambahan di luar KBLI Utama. Aspek ini dinyatakan <strong>Tidak Berlaku</strong>.` };
      }
      const memenuhi = isVerified(ctx, "kbli-pendukung");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen dan observasi lapangan, ${company} memiliki KBLI Pendukung ${list} yang tercantum dalam Lampiran Nomor Induk Berusaha (NIB). Dengan demikian, aspek kesesuaian KBLI Pendukung dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sesuai dengan ketentuan Pasal 32 ayat (3) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  },
  {
    key: "sk",
    no: 4,
    title: "Surat Keputusan Kementerian Hukum dan Hak Asasi Manusia",
    documentPath: ({ payload, companyLegal }) => companyLegal?.skDocumentPath || payload.skDocumentPath,
    intro: () => [
      "Verifikasi terhadap Surat Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia dilakukan sebagai dokumen pendukung untuk memastikan keabsahan dan konsistensi identitas badan usaha yang tercantum dalam Perizinan Berusaha (Nomor Induk Berusaha/NIB). Pemeriksaan dilakukan sebagai bagian dari verifikasi kesesuaian data dan dokumen yang diajukan dalam proses Verifikasi Kemampuan Industri (VKI) sesuai dengan ketentuan Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload, companyLegal }) => {
      const skNumber = companyLegal?.skNumber || payload.skNumber;
      const skDate = companyLegal?.skDate || payload.skDate;
      return [
        { label: "Nomor SK Kemenkumham", value: skNumber || "—", ok: Boolean(skNumber) },
        { label: "Tanggal SK Kemenkumham", value: fmtDate(skDate), ok: Boolean(skDate) },
        { label: "Nama Perusahaan", value: payload.companyName || "—", ok: Boolean(payload.companyName) },
        { label: "Status Pengesahan", value: `Pengesahan Pendirian ${payload.companyName || "—"}`, ok: Boolean(companyLegal?.skDocumentPath || payload.skDocumentPath) },
      ];
    },
    findings: ({ payload, company, companyLegal }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} memiliki Surat Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia Nomor ${companyLegal?.skNumber || payload.skNumber || "—"} tentang Pengesahan Pendirian ${company}.`,
      "Hasil verifikasi menunjukkan bahwa identitas badan usaha yang tercantum dalam Surat Keputusan Kementerian Hukum dan HAM telah sesuai dengan data pada Perizinan Berusaha (NIB), meliputi nama perusahaan serta status pendirian perusahaan. Pemeriksaan juga menunjukkan tidak terdapat perbedaan identitas antara Surat Keputusan Kementerian Hukum dan HAM dengan dokumen legal perusahaan lainnya yang digunakan dalam proses verifikasi.",
      "Meskipun Surat Keputusan Kementerian Hukum dan HAM tidak termasuk dokumen yang secara eksplisit dipersyaratkan dalam Pasal 30 ayat (2), dokumen ini digunakan sebagai bukti pendukung untuk memverifikasi keabsahan identitas badan usaha yang menjadi dasar penerbitan Perizinan Berusaha (NIB), yang merupakan salah satu persyaratan dokumen dalam pengajuan VKI.",
    ],
    kesimpulan: (ctx) => {
      const { payload, company, companyLegal } = ctx;
      const skNumber = companyLegal?.skNumber || payload.skNumber;
      const memenuhi = Boolean((companyLegal?.skDocumentPath || payload.skDocumentPath) && skNumber) && isVerified(ctx, "sk");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} memiliki Surat Keputusan Menteri Hukum dan Hak Asasi Manusia Republik Indonesia Nomor ${skNumber || "—"} yang menunjukkan pengesahan pendirian perusahaan. Data yang tercantum konsisten dengan Perizinan Berusaha (NIB) dan dokumen legal perusahaan lainnya. Dengan demikian, dokumen ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sebagai bukti pendukung legalitas perusahaan.`,
      };
    },
  },
  {
    key: "notarial",
    no: 5,
    title: "Akta Pendirian",
    documentPath: ({ payload, companyLegal }) => companyLegal?.notarialDocumentPath || payload.notarialDocumentPath,
    intro: () => [
      "Verifikasi terhadap Akta Pendirian perusahaan dilakukan sebagai dokumen pendukung untuk memastikan keabsahan identitas badan usaha yang tercantum dalam Perizinan Berusaha (Nomor Induk Berusaha/NIB). Pemeriksaan dilakukan sebagai bagian dari verifikasi kesesuaian data dan dokumen yang diajukan dalam proses Verifikasi Kemampuan Industri (VKI) sesuai dengan ketentuan Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload, companyLegal }) => {
      const notarialDeedNumber = companyLegal?.notarialDeedNumber || payload.notarialDeedNumber;
      const notarialDeedIssueDate = companyLegal?.notarialDeedIssueDate || payload.notarialDeedIssueDate;
      const notarialIssuingAuthority = companyLegal?.notarialIssuingAuthority || payload.notarialIssuingAuthority;
      return [
        { label: "Nomor Akta Pendirian", value: notarialDeedNumber || "—", ok: Boolean(notarialDeedNumber) },
        { label: "Tanggal Akta Pendirian", value: fmtDate(notarialDeedIssueDate), ok: Boolean(notarialDeedIssueDate) },
        { label: "Nama Notaris", value: notarialIssuingAuthority || "—", ok: Boolean(notarialIssuingAuthority) },
        { label: "Nama Perusahaan", value: payload.companyName || "—", ok: Boolean(payload.companyName) },
      ];
    },
    findings: ({ payload, company, companyLegal }) => {
      const notarialDeedNumber = companyLegal?.notarialDeedNumber || payload.notarialDeedNumber;
      const notarialIssuingAuthority = companyLegal?.notarialIssuingAuthority || payload.notarialIssuingAuthority;
      const notarialDeedIssueDate = companyLegal?.notarialDeedIssueDate || payload.notarialDeedIssueDate;
      return [
        `Berdasarkan hasil pemeriksaan dokumen, ${company} memiliki Akta Pendirian Nomor ${notarialDeedNumber || "—"}, yang dibuat oleh ${notarialIssuingAuthority || "—"}, Notaris, pada tanggal ${fmtDate(notarialDeedIssueDate)}.`,
        "Hasil verifikasi menunjukkan bahwa informasi yang tercantum dalam Akta Pendirian, meliputi nama perusahaan, bentuk badan usaha, tanggal pendirian, serta identitas pendiri, telah sesuai dengan data yang tercantum pada Surat Keputusan Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia, Perizinan Berusaha (NIB), serta dokumen legal perusahaan lainnya.",
        "Meskipun Akta Pendirian tidak termasuk dokumen yang secara eksplisit dipersyaratkan dalam Pasal 30 ayat (2) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, dokumen ini digunakan sebagai bukti pendukung untuk memverifikasi keabsahan identitas perusahaan serta memastikan konsistensi data pada Perizinan Berusaha (NIB), yang merupakan salah satu persyaratan dalam pengajuan Verifikasi Kemampuan Industri (VKI).",
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company, companyLegal } = ctx;
      const notarialDeedNumber = companyLegal?.notarialDeedNumber || payload.notarialDeedNumber;
      const notarialIssuingAuthority = companyLegal?.notarialIssuingAuthority || payload.notarialIssuingAuthority;
      const notarialDeedIssueDate = companyLegal?.notarialDeedIssueDate || payload.notarialDeedIssueDate;
      const memenuhi = Boolean((companyLegal?.notarialDocumentPath || payload.notarialDocumentPath) && notarialDeedNumber) && isVerified(ctx, "notarial");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} memiliki Akta Pendirian Nomor ${notarialDeedNumber || "—"} yang dibuat oleh ${notarialIssuingAuthority || "—"}, Notaris, pada ${fmtDate(notarialDeedIssueDate)}. Data yang tercantum konsisten dengan Surat Keputusan Kementerian Hukum dan HAM dan dokumen legal perusahaan lainnya. Dengan demikian, dokumen ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "notarial-amendment",
    no: 6,
    title: "Akta Perubahan",
    documentPath: ({ payload, companyLegal }) => companyLegal?.notarialAmendmentDocPath || payload.notarialAmendmentDocPath,
    intro: () => [
      "Verifikasi terhadap Akta Perubahan dilakukan sebagai dokumen pendukung untuk memastikan bahwa perubahan data perusahaan telah dituangkan dalam akta notaris dan selaras dengan dokumen legal perusahaan lainnya. Pemeriksaan dilakukan sebagai bagian dari verifikasi kesesuaian data dan dokumen yang diajukan dalam proses Verifikasi Kemampuan Industri (VKI) sesuai dengan ketentuan Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload, companyLegal }) => {
      const notarialAmendmentNumber = companyLegal?.notarialAmendmentNumber || payload.notarialAmendmentNumber;
      const notarialAmendmentDate = companyLegal?.notarialAmendmentDate || payload.notarialAmendmentDate;
      const notarialAmendmentAuthority = companyLegal?.notarialAmendmentAuthority || payload.notarialAmendmentAuthority;
      return [
        { label: "Nomor Akta Perubahan", value: notarialAmendmentNumber || "—", ok: Boolean(notarialAmendmentNumber) },
        { label: "Tanggal Akta Perubahan", value: fmtDate(notarialAmendmentDate), ok: Boolean(notarialAmendmentDate) },
        { label: "Nama Notaris", value: notarialAmendmentAuthority || "—", ok: Boolean(notarialAmendmentAuthority) },
        { label: "Nama Perusahaan", value: payload.companyName || "—", ok: Boolean(payload.companyName) },
      ];
    },
    findings: ({ payload, company, companyLegal }) => {
      const docPath = companyLegal?.notarialAmendmentDocPath || payload.notarialAmendmentDocPath;
      if (!docPath) {
        return [`Berdasarkan hasil pemeriksaan, ${company} belum pernah melakukan perubahan akta pendirian, sehingga tidak terdapat Akta Perubahan yang perlu diverifikasi pada permohonan ini.`];
      }
      const notarialAmendmentNumber = companyLegal?.notarialAmendmentNumber || payload.notarialAmendmentNumber;
      const notarialAmendmentAuthority = companyLegal?.notarialAmendmentAuthority || payload.notarialAmendmentAuthority;
      const notarialAmendmentDate = companyLegal?.notarialAmendmentDate || payload.notarialAmendmentDate;
      return [
        `Berdasarkan hasil pemeriksaan dokumen, ${company} memiliki Akta Perubahan Nomor ${notarialAmendmentNumber || "—"}, yang dibuat oleh ${notarialAmendmentAuthority || "—"}, Notaris, pada tanggal ${fmtDate(notarialAmendmentDate)}.`,
        "Hasil verifikasi menunjukkan bahwa perubahan yang tercantum dalam Akta Perubahan telah terdokumentasi secara resmi dan konsisten dengan dokumen legal perusahaan lainnya, termasuk Surat Keputusan Kementerian Hukum dan Hak Asasi Manusia Republik Indonesia serta Perizinan Berusaha (NIB) yang digunakan dalam proses Verifikasi Kemampuan Industri (VKI).",
        "Sesuai dengan ketentuan Pasal 33 ayat (4) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, dalam hal terjadi perubahan identitas perusahaan, perusahaan wajib menyampaikan akta perubahan beserta dokumen persetujuan yang diterbitkan oleh kementerian yang menyelenggarakan urusan pemerintahan di bidang hukum sebagai bagian dari perubahan LHVKI.",
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company, companyLegal } = ctx;
      const docPath = companyLegal?.notarialAmendmentDocPath || payload.notarialAmendmentDocPath;
      if (!docPath) {
        return { memenuhi: true, text: `${company} tidak memiliki perubahan akta, sehingga aspek ini dinyatakan <strong>Tidak Berlaku</strong>.` };
      }
      const notarialAmendmentNumber = companyLegal?.notarialAmendmentNumber || payload.notarialAmendmentNumber;
      const notarialAmendmentAuthority = companyLegal?.notarialAmendmentAuthority || payload.notarialAmendmentAuthority;
      const notarialAmendmentDate = companyLegal?.notarialAmendmentDate || payload.notarialAmendmentDate;
      const memenuhi = Boolean(notarialAmendmentNumber) && isVerified(ctx, "notarial-amendment");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} memiliki Akta Perubahan Nomor ${notarialAmendmentNumber || "—"} tanggal ${fmtDate(notarialAmendmentDate)}, yang dibuat oleh ${notarialAmendmentAuthority || "—"}, Notaris. Dengan demikian, aspek verifikasi Akta Perubahan dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
];

const INDONESIAN_MONTHS = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

const fmtBulanTahun = (value: string | null | undefined): string => {
  if (!value) return "—";
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return value;
  const monthName = INDONESIAN_MONTHS[Number(match[2]) - 1];
  return monthName ? `${monthName} ${match[1]}` : value;
};

const fmtRupiah = (value: string | null | undefined): string => {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return `Rp ${Number(digits).toLocaleString("id-ID")}`;
};

/**
 * "Perpajakan" chapter. Includes every possible key `buildDocumentChecklist`
 * can produce for this category (`npwp`, `skt`, `tax-proof-summary` + 6
 * `tax-support:*`) — the report component only renders the subset that
 * actually exists in the real checklist for a given application (the
 * OVER_3/UNDER_3 branch never renders both alternatives at once), so a
 * document that structurally doesn't apply here simply never appears rather
 * than showing as "missing".
 */
export const PERPAJAKAN_DOCUMENTS: DocDetail[] = [
  {
    key: "npwp",
    no: 1,
    title: "Nomor Pokok Wajib Pajak (NPWP)",
    documentPath: ({ payload, companyLegal }) => companyLegal?.npwpDocumentPath || payload.npwpDocumentPath,
    imageAspectRatio: "18/11",
    intro: () => [
      "Verifikasi terhadap Nomor Pokok Wajib Pajak (NPWP) dilakukan melalui pemeriksaan dokumen identitas perpajakan yang diterbitkan oleh Direktorat Jenderal Pajak. Pemeriksaan bertujuan untuk memastikan bahwa perusahaan telah terdaftar sebagai wajib pajak dan memiliki identitas perpajakan yang sah sebagai salah satu persyaratan wajib dalam pengajuan Verifikasi Kemampuan Industri (VKI) sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 1 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload, businessAddress, companyLegal }) => {
      const npwpNumber = companyLegal?.npwpNumber || payload.npwpNumber;
      return [
        { label: "Nomor NPWP", value: npwpNumber || "—", ok: Boolean(npwpNumber) },
        { label: "Nama Wajib Pajak", value: payload.companyName || "—", ok: Boolean(payload.companyName) },
        { label: "Alamat Wajib Pajak", value: businessAddress || "—", ok: Boolean(businessAddress) },
        { label: "Status NPWP", value: "NPWP Berstatus Aktif", ok: Boolean(companyLegal?.npwpDocumentPath || payload.npwpDocumentPath) },
      ];
    },
    findings: ({ payload, company, companyLegal }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} memiliki Nomor Pokok Wajib Pajak (NPWP) ${companyLegal?.npwpNumber || payload.npwpNumber || "—"} yang terdaftar atas nama perusahaan.`,
      "Hasil verifikasi menunjukkan bahwa nama wajib pajak dan alamat yang tercantum pada NPWP telah sesuai dengan data perusahaan pada dokumen legalitas lainnya, serta NPWP masih berstatus aktif dan dapat digunakan dalam memenuhi kewajiban perpajakan perusahaan.",
    ],
    kesimpulan: (ctx) => {
      const { payload, company, companyLegal } = ctx;
      const npwpNumber = companyLegal?.npwpNumber || payload.npwpNumber;
      const memenuhi = Boolean((companyLegal?.npwpDocumentPath || payload.npwpDocumentPath) && npwpNumber) && isVerified(ctx, "npwp");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} memiliki NPWP ${npwpNumber || "—"} yang sah dan aktif. Dengan demikian, aspek kelengkapan identitas perpajakan dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 1 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  },
  {
    key: "tax-proof-summary",
    no: 2,
    title: "Bukti Pembayaran Pajak 3 (Tiga) Tahun Terakhir",
    documentPath: ({ payload }) => payload.taxProofSummaryDocumentPath,
    intro: () => [
      "Verifikasi terhadap Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir dilakukan untuk memastikan bahwa perusahaan telah memenuhi kewajiban perpajakan secara berkelanjutan selama 3 (tiga) tahun terakhir, sebagai salah satu persyaratan wajib bagi perusahaan yang telah memiliki Perizinan Berusaha 3 (tiga) tahun atau lebih sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 7 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen Bukti Pembayaran Pajak", value: payload.taxProofSummaryDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(payload.taxProofSummaryDocumentPath) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan bukti pembayaran pajak untuk 3 (tiga) tahun terakhir sebagai bagian dari pemenuhan kewajiban perpajakan perusahaan dalam pengajuan Verifikasi Kemampuan Industri (VKI).`,
    ],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const memenuhi = Boolean(payload.taxProofSummaryDocumentPath) && isVerified(ctx, "tax-proof-summary");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} ${payload.taxProofSummaryDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} bukti pembayaran pajak 3 (tiga) tahun terakhir. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 7 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  },
  {
    key: "skt",
    no: 2,
    title: "Surat Keterangan Terdaftar (SKT) Pajak",
    documentPath: ({ payload, companyLegal }) => companyLegal?.sktDocumentPath || payload.sktDocumentPath,
    intro: () => [
      "Verifikasi terhadap Surat Keterangan Terdaftar (SKT) Pajak dilakukan sebagai pengganti Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir bagi perusahaan dengan Perizinan Berusaha kurang dari 3 (tiga) tahun, sebagaimana diatur dalam Pasal 30 ayat (2) huruf b angka 7 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload, businessAddress, companyLegal }) => {
      const sktNumber = companyLegal?.sktNumber || payload.sktNumber;
      const sktIssuer = companyLegal?.sktIssuer || payload.sktIssuer;
      const sktDate = companyLegal?.sktDate || payload.sktDate;
      const sktDocPath = companyLegal?.sktDocumentPath || payload.sktDocumentPath;
      return [
        { label: "Nomor Surat Keterangan Terdaftar (SKT)", value: sktNumber || "—", ok: Boolean(sktNumber) },
        { label: "Nomor NPWP", value: payload.npwpNumber || "—", ok: Boolean(payload.npwpNumber) },
        { label: "Nama Wajib Pajak", value: payload.companyName || "—", ok: Boolean(payload.companyName) },
        { label: "Alamat Wajib Pajak", value: businessAddress || "—", ok: Boolean(businessAddress) },
        { label: "KPP Terdaftar", value: sktIssuer || "—", ok: Boolean(sktIssuer) },
        { label: "Tanggal Terdaftar", value: fmtDate(sktDate), ok: Boolean(sktDate) },
        { label: "Status Wajib Pajak", value: "Wajib Pajak Berstatus Aktif", ok: Boolean(sktDocPath) },
      ];
    },
    findings: ({ payload, company, companyLegal }) => {
      const sktNumber = companyLegal?.sktNumber || payload.sktNumber;
      const sktIssuer = companyLegal?.sktIssuer || payload.sktIssuer;
      const sktDate = companyLegal?.sktDate || payload.sktDate;
      return [
        `Berdasarkan hasil pemeriksaan dokumen, ${company} memiliki Surat Keterangan Terdaftar Nomor ${sktNumber || "—"} yang diterbitkan oleh ${sktIssuer || "—"} pada tanggal ${fmtDate(sktDate)}.`,
        "Hasil verifikasi menunjukkan bahwa data wajib pajak yang tercantum dalam SKT, meliputi NPWP, nama wajib pajak, dan alamat wajib pajak, telah sesuai dengan data perusahaan pada dokumen legalitas lainnya, sehingga dapat digunakan sebagai pengganti Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir sesuai ketentuan yang berlaku bagi perusahaan dengan Perizinan Berusaha kurang dari 3 (tiga) tahun.",
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company, companyLegal } = ctx;
      const sktNumber = companyLegal?.sktNumber || payload.sktNumber;
      const sktIssuer = companyLegal?.sktIssuer || payload.sktIssuer;
      const sktDocPath = companyLegal?.sktDocumentPath || payload.sktDocumentPath;
      const memenuhi = Boolean(sktDocPath && sktNumber) && isVerified(ctx, "skt");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} memiliki SKT Nomor ${sktNumber || "—"} yang diterbitkan oleh ${sktIssuer || "—"}. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sebagai pengganti Bukti Pembayaran Pajak 3 (tiga) Tahun Terakhir sesuai Pasal 30 ayat (2) huruf b angka 7 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  },
  {
    key: "tax-support:spt-tahunan",
    no: 3,
    title: "Surat Pemberitahuan (SPT) Tahunan Badan",
    documentPath: ({ payload }) => payload.sptTahunanDocumentPath,
    intro: () => [
      "Verifikasi terhadap Surat Pemberitahuan (SPT) Tahunan Badan dilakukan sebagai dokumen pendukung untuk memastikan kepatuhan pelaporan pajak tahunan perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen SPT Tahunan Badan", value: payload.sptTahunanDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(payload.sptTahunanDocumentPath) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan Surat Pemberitahuan (SPT) Tahunan Badan sebagai bukti kepatuhan pelaporan pajak tahunan perusahaan.`,
    ],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const memenuhi = Boolean(payload.sptTahunanDocumentPath) && isVerified(ctx, "tax-support:spt-tahunan");
      return {
        memenuhi,
        text: `${company} ${payload.sptTahunanDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} SPT Tahunan Badan. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "tax-support:bpe",
    no: 4,
    title: "Bukti Penerimaan Elektronik (BPE) SPT Tahunan",
    documentPath: ({ payload }) => payload.bpeDocumentPath,
    intro: () => [
      "Verifikasi terhadap Bukti Penerimaan Elektronik (BPE) dilakukan untuk memastikan bahwa Surat Pemberitahuan (SPT) Tahunan telah diterima secara resmi oleh Direktorat Jenderal Pajak, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen BPE", value: payload.bpeDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(payload.bpeDocumentPath) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan Bukti Penerimaan Elektronik (BPE) yang membuktikan SPT Tahunan telah diterima oleh Direktorat Jenderal Pajak.`,
    ],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const memenuhi = Boolean(payload.bpeDocumentPath) && isVerified(ctx, "tax-support:bpe");
      return {
        memenuhi,
        text: `${company} ${payload.bpeDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} BPE SPT Tahunan. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "tax-support:skf",
    no: 5,
    title: "Surat Keterangan Fiskal (SKF)",
    documentPath: ({ payload }) => payload.skfDocumentPath,
    intro: () => [
      "Verifikasi terhadap Surat Keterangan Fiskal (SKF) dilakukan sebagai bukti status kepatuhan perpajakan perusahaan apabila tersedia, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen SKF", value: payload.skfDocumentPath ? "Tersedia" : "Tidak Diunggah", ok: Boolean(payload.skfDocumentPath) },
    ],
    findings: ({ company }) => [skfSupportNote(company)],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      if (!payload.skfDocumentPath) {
        return { memenuhi: true, text: `${company} tidak menyampaikan Surat Keterangan Fiskal (SKF) karena dokumen ini bersifat pendukung dan hanya diperiksa apabila tersedia. Aspek ini dinyatakan <strong>Tidak Berlaku</strong>.` };
      }
      const memenuhi = isVerified(ctx, "tax-support:skf");
      return {
        memenuhi,
        text: `${company} telah menyampaikan Surat Keterangan Fiskal (SKF) sebagai bukti pendukung status kepatuhan perpajakan. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "tax-support:ssp",
    no: 6,
    title: "Surat Setoran Pajak (SSP)",
    documentPath: ({ payload }) => payload.sspDocumentPath,
    intro: () => [
      "Verifikasi terhadap Surat Setoran Pajak (SSP) dilakukan sebagai bukti penyetoran kewajiban perpajakan perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen SSP", value: payload.sspDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(payload.sspDocumentPath) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan Surat Setoran Pajak (SSP) sebagai bukti penyetoran kewajiban perpajakan perusahaan.`,
    ],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const memenuhi = Boolean(payload.sspDocumentPath) && isVerified(ctx, "tax-support:ssp");
      return {
        memenuhi,
        text: `${company} ${payload.sspDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} SSP. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "tax-support:pph-badan",
    no: 7,
    title: "Bukti Pembayaran Pajak Penghasilan (PPh) Badan",
    documentPath: ({ payload }) => payload.pphBadanDocumentPath,
    intro: () => [
      "Verifikasi terhadap bukti pembayaran Pajak Penghasilan (PPh) Badan dilakukan untuk memastikan pemenuhan kewajiban pembayaran PPh Badan perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen Bukti Pembayaran PPh Badan", value: payload.pphBadanDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(payload.pphBadanDocumentPath) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan bukti pembayaran Pajak Penghasilan (PPh) Badan sebagai bagian dari pemenuhan kewajiban perpajakan perusahaan.`,
    ],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const memenuhi = Boolean(payload.pphBadanDocumentPath) && isVerified(ctx, "tax-support:pph-badan");
      return {
        memenuhi,
        text: `${company} ${payload.pphBadanDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} bukti pembayaran PPh Badan. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "tax-support:ppn",
    no: 8,
    title: "Bukti Pembayaran Pajak Pertambahan Nilai (PPN)",
    documentPath: ({ payload }) => payload.ppnDocumentPath,
    intro: () => [
      "Verifikasi terhadap bukti pembayaran Pajak Pertambahan Nilai (PPN) dilakukan untuk memastikan kepatuhan pembayaran PPN sesuai dengan kegiatan usaha perusahaan, sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen Bukti Pembayaran PPN", value: payload.ppnDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(payload.ppnDocumentPath) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan bukti pembayaran Pajak Pertambahan Nilai (PPN) sesuai dengan kegiatan usaha yang dijalankan.`,
    ],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const memenuhi = Boolean(payload.ppnDocumentPath) && isVerified(ctx, "tax-support:ppn");
      return {
        memenuhi,
        text: `${company} ${payload.ppnDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} bukti pembayaran PPN. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
  {
    key: "tax-support:e-billing",
    no: 9,
    title: "Bukti Setor Pajak melalui e-Billing",
    documentPath: ({ payload }) => payload.eBillingDocumentPath,
    intro: () => [
      "Verifikasi terhadap bukti setor pajak melalui e-Billing dilakukan sebagai bukti pembayaran pajak secara elektronik melalui sistem Direktorat Jenderal Pajak (DJP), sebagai bagian dari verifikasi kesesuaian data dan dokumen sesuai Pasal 31 ayat (1) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => [
      { label: "Dokumen Bukti Setor e-Billing", value: payload.eBillingDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(payload.eBillingDocumentPath) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan bukti setor pajak melalui sistem e-Billing Direktorat Jenderal Pajak.`,
    ],
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const memenuhi = Boolean(payload.eBillingDocumentPath) && isVerified(ctx, "tax-support:e-billing");
      return {
        memenuhi,
        text: `${company} ${payload.eBillingDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} bukti setor e-Billing. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  },
];

function skfSupportNote(company: string): string {
  return `Dokumen ini bersifat pendukung dan hanya diperiksa apabila tersedia pada permohonan ${company}; ketiadaannya tidak memengaruhi kelengkapan persyaratan wajib Perpajakan.`;
}

/**
 * "Dokumen Pendukung" chapter — VIU's "Bukti Kemampuan Finansial" checklist (shared between the
 * "Bahan Baku Industri" and "Bahan Baku Non Industri" import types), one narrative document per
 * `NON_INDUSTRI_SUPPORT_DOC_DEFS` entry. UTAMA docs are required; PENDUKUNG docs are supplementary
 * evidence and only assessed when the company actually enabled/uploaded them (same "Tidak Berlaku"
 * pattern as SKF in the Perpajakan chapter).
 */
function modalFinansialDocument(def: NonIndustriSupportDocDef, no: number): DocDetail {
  const key = `nonindustri-support:${def.key}`;
  return {
    key,
    no,
    title: def.title,
    documentPath: ({ payload }) => payload.nonIndustriDocuments?.find((d) => d.key === def.key)?.documentPath,
    intro: () => [
      `Verifikasi terhadap ${def.title} dilakukan sebagai bagian dari pemeriksaan bukti kemampuan finansial perusahaan dalam membiayai kegiatan importasi bahan baku, sebagaimana dipersyaratkan dalam pengajuan Verifikasi Importir Umum (VIU) bagi perusahaan non industri (API-U).`,
    ],
    fields: ({ payload }) => {
      const entry = payload.nonIndustriDocuments?.find((d) => d.key === def.key);
      return [{ label: def.title, value: entry?.documentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(entry?.documentPath) }];
    },
    findings: ({ payload, company }) => {
      const entry = payload.nonIndustriDocuments?.find((d) => d.key === def.key);
      if (!entry?.documentPath) {
        return def.priority === "PENDUKUNG"
          ? [skfSupportNote(company).replace("kelengkapan persyaratan wajib Perpajakan", "kelengkapan bukti kemampuan finansial")]
          : [`Berdasarkan hasil pemeriksaan, ${company} belum menyampaikan ${def.title}.`];
      }
      return [
        `Berdasarkan hasil pemeriksaan dokumen, ${company} telah menyampaikan ${def.title} sebagai bukti kemampuan finansial perusahaan dalam membiayai kegiatan importasi. ${def.desc}`,
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const entry = payload.nonIndustriDocuments?.find((d) => d.key === def.key);
      if (!entry?.documentPath && def.priority === "PENDUKUNG") {
        return {
          memenuhi: true,
          text: `${company} tidak menyampaikan ${def.title} karena dokumen ini bersifat pendukung dan hanya diperiksa apabila tersedia. Aspek ini dinyatakan <strong>Tidak Berlaku</strong>.`,
        };
      }
      const memenuhi = Boolean(entry?.documentPath) && isVerified(ctx, key);
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} ${memenuhi ? "telah menyampaikan" : "belum menyampaikan"} ${def.title}. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sebagai bukti kemampuan finansial perusahaan dalam pengajuan Verifikasi Importir Umum (VIU).`,
      };
    },
  };
}

export const MODAL_FINANSIAL_DOCUMENTS: DocDetail[] = NON_INDUSTRI_SUPPORT_DOC_DEFS.map((def, i) => modalFinansialDocument(def, i + 1));

/** "Tenaga Kerja" chapter — a single fixed document (surat pernyataan jumlah tenaga kerja). */
export const TENAGA_KERJA_DOCUMENTS: DocDetail[] = [
  {
    key: "vki-support:tenaga-kerja",
    no: 1,
    title: "Surat Pernyataan Jumlah Tenaga Kerja",
    documentPath: ({ payload }) => payload.tenagaKerjaDocumentPath,
    intro: () => [
      "Verifikasi terhadap Surat Pernyataan Jumlah Tenaga Kerja dilakukan untuk memastikan bahwa perusahaan memiliki tenaga kerja yang mendukung pelaksanaan kegiatan industri, sebagai salah satu persyaratan wajib dalam pengajuan Verifikasi Kemampuan Industri (VKI) sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 3 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => {
      const entries = payload.tenagaKerjaEntries ?? [];
      if (entries.length === 0) return [{ label: "Data Tenaga Kerja", value: "Belum Diisi", ok: false }];
      return entries.map((entry) => ({
        label: entry.kategori || "Kategori Tenaga Kerja",
        value: entry.jumlah ? `${entry.jumlah} orang` : "—",
        ok: Boolean(entry.jumlah),
      }));
    },
    findings: ({ payload, company }) => {
      const entries = payload.tenagaKerjaEntries ?? [];
      const totalOrang = entries.reduce((sum, e) => sum + (Number(e.jumlah) || 0), 0);
      if (entries.length === 0) {
        return [`Berdasarkan hasil pemeriksaan, ${company} belum menyampaikan rincian jumlah tenaga kerja per kategori.`];
      }
      const rincian = entries.map((e) => `${e.kategori ?? "—"} sejumlah ${e.jumlah ?? "—"} orang`).join(", ");
      return [
        `Berdasarkan hasil pemeriksaan dokumen, ${company} menyatakan memiliki tenaga kerja dengan rincian ${rincian}, dengan total ${totalOrang} orang yang mendukung pelaksanaan kegiatan industri perusahaan.`,
        "Hasil verifikasi menunjukkan bahwa jumlah dan kategori tenaga kerja yang dinyatakan perusahaan sesuai dengan skala kegiatan industri yang dijalankan dan tercantum dalam surat pernyataan yang ditandatangani oleh pihak berwenang perusahaan.",
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const entries = payload.tenagaKerjaEntries ?? [];
      const memenuhi = Boolean(payload.tenagaKerjaDocumentPath && entries.length > 0) && isVerified(ctx, "vki-support:tenaga-kerja");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} ${memenuhi ? "telah menyampaikan" : "belum menyampaikan secara lengkap"} Surat Pernyataan Jumlah Tenaga Kerja. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 3 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  },
];

/** "Surat Pernyataan" chapter — the 4 fixed VKI surat pernyataan, each sharing the same nomorSurat/tanggal/penandatangan shape. */
function suratPernyataanNarrative(defKey: string, no: number, title: string, isiDeskripsi: string, pasalKeterangan: string): DocDetail {
  return {
    key: `vki-support:${defKey}`,
    no,
    title,
    documentPath: ({ payload }) => payload.vkiSupportDocs?.find((d) => d.key === defKey)?.documentPath,
    intro: () => [
      `Verifikasi terhadap ${title} dilakukan untuk memastikan bahwa perusahaan telah menyampaikan pernyataan resmi sebagaimana dipersyaratkan dalam pengajuan Verifikasi Kemampuan Industri (VKI), sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 6 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025. ${pasalKeterangan}`,
    ],
    fields: ({ payload }) => {
      const entry = payload.vkiSupportDocs?.find((d) => d.key === defKey);
      return [
        { label: "Nomor Surat Pernyataan", value: entry?.nomorSurat || "—", ok: Boolean(entry?.nomorSurat) },
        { label: "Tanggal Surat Pernyataan", value: fmtDate(entry?.tanggal), ok: Boolean(entry?.tanggal) },
        { label: "Nama Penandatangan", value: entry?.penandatangan || "—", ok: Boolean(entry?.penandatangan) },
      ];
    },
    findings: ({ payload, company }) => {
      const entry = payload.vkiSupportDocs?.find((d) => d.key === defKey);
      return [
        `Berdasarkan hasil pemeriksaan dokumen, ${company} menyampaikan ${title} Nomor ${entry?.nomorSurat || "—"} tertanggal ${fmtDate(entry?.tanggal)}, ditandatangani oleh ${entry?.penandatangan || "—"} selaku pihak berwenang mewakili perusahaan.`,
        `Isi pernyataan menyatakan bahwa ${isiDeskripsi} Hasil verifikasi menunjukkan bahwa surat pernyataan telah dibuat sesuai format yang dipersyaratkan dan ditandatangani oleh pihak yang berwenang mewakili perusahaan.`,
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const entry = payload.vkiSupportDocs?.find((d) => d.key === defKey);
      const memenuhi = Boolean(entry?.documentPath && entry?.nomorSurat && entry?.penandatangan) && isVerified(ctx, `vki-support:${defKey}`);
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} ${memenuhi ? "telah menyampaikan" : "belum menyampaikan secara lengkap"} ${title}. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 6 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  };
}

/**
 * "Surat Pernyataan Memiliki atau Menguasai" is filed under "Dokumen Lokasi"
 * (not "Surat Pernyataan") — it corroborates building/facility ownership, so
 * it belongs alongside the location documents it supports. See
 * `buildLocationDocuments` below, which appends this as the last item.
 */
export const SURAT_PERNYATAAN_DOCUMENTS: DocDetail[] = [
  suratPernyataanNarrative(
    "tidak-diperjualbelikan",
    1,
    "Surat Pernyataan Tidak Akan Diperjualbelikan atau Dipindahtangankan",
    "mesin/peralatan produksi yang digunakan tidak akan diperjualbelikan atau dipindahtangankan kepada pihak lain selama digunakan dalam kegiatan industri perusahaan.",
    "Dokumen ini mencakup seluruh mesin/peralatan produksi yang menjadi objek permohonan.",
  ),
  suratPernyataanNarrative(
    "kebenaran-data",
    2,
    "Surat Pernyataan Kebenaran Data",
    "seluruh data dan dokumen yang disampaikan dalam permohonan adalah benar dan dapat dipertanggungjawabkan.",
    "Pernyataan ini mencakup seluruh data yang diajukan dalam permohonan Verifikasi Kemampuan Industri.",
  ),
  suratPernyataanNarrative(
    "alur-proses",
    3,
    "Surat Pernyataan Alur Proses",
    "alur proses produksi yang dijalankan perusahaan telah sesuai dengan kapasitas dan produk yang dimohonkan.",
    "Alur proses produksi dinyatakan konsisten dengan produk dan kapasitas yang dimohonkan.",
  ),
];

const LOCATION_TYPE_NAMES: Record<string, string> = {
  KANTOR: "Kantor",
  GUDANG: "Gudang",
  PABRIK: "Pabrik",
};

/**
 * "Dokumen Lokasi" chapter — dynamic, one narrative document per real typed
 * ownership/lease entry (`loc.ownershipDocuments[]` / `loc.leaseDocuments[]`),
 * plus warehouse docs for GUDANG.
 */
export function buildLocationDocuments(ctx: NarrativeContext): DocDetail[] {
  const docs: DocDetail[] = [];
  let no = 1;
  for (const payloadLoc of ctx.payload.locations ?? []) {
    // Prefer the live Company.locations entry over the frozen payload snapshot — same
    // precedence as `companyLegal` above, see `ChecklistCompanyContext.locations`.
    const loc = ctx.companyLocations?.find((l) => l.id === payloadLoc.id) ?? payloadLoc;
    const label = LOCATION_TYPE_NAMES[loc.locationType] ?? loc.locationType;
    const isOwned = loc.buildingStatus === "MILIK_SENDIRI";
    const typedDocs = isOwned
      ? (loc.ownershipDocuments ?? []).map((entry) => ({ kind: "ownership" as const, type: entry.type, typeLabel: OWNERSHIP_DOCUMENT_TYPE_LABELS[entry.type], documentPath: entry.documentPath }))
      : (loc.leaseDocuments ?? []).map((entry) => ({ kind: "lease" as const, type: entry.type, typeLabel: LEASE_DOCUMENT_TYPE_LABELS[entry.type], documentPath: entry.documentPath }));
    for (const typed of typedDocs) {
      docs.push({
        key: `location:${loc.id}:${typed.kind}:${typed.type}`,
        no: no++,
        title: `${typed.typeLabel} — ${label}`,
        documentPath: () => typed.documentPath,
        intro: () => [
          `Verifikasi terhadap ${typed.typeLabel} lokasi ${label.toLowerCase()} dilakukan untuk memastikan bahwa perusahaan memiliki atau menguasai fasilitas bangunan yang digunakan dalam pelaksanaan kegiatan industri, sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 6 dan Pasal 31 ayat (2) huruf a Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
        ],
        fields: () => [
          { label: "Jenis Dokumen", value: typed.typeLabel, ok: true },
          { label: "Jenis Lokasi", value: label, ok: true },
          { label: "Alamat", value: loc.address || "—", ok: Boolean(loc.address) },
          { label: "Kota/Kabupaten", value: loc.city || "—", ok: Boolean(loc.city) },
          { label: "Provinsi", value: loc.province || "—", ok: Boolean(loc.province) },
          { label: "Status Bangunan", value: isOwned ? "Milik Sendiri" : "Sewa", ok: true },
          ...(isOwned
            ? []
            : [
                { label: "Pemilik Asli", value: loc.leaseOriginalOwnerName || "—", ok: Boolean(loc.leaseOriginalOwnerName) },
                {
                  label: "Masa Sewa",
                  value: loc.leaseStartDate || loc.leaseEndDate ? `${fmtDate(loc.leaseStartDate)} s.d. ${fmtDate(loc.leaseEndDate)}` : "—",
                  ok: Boolean(loc.leaseStartDate && loc.leaseEndDate),
                },
              ]),
        ],
        findings: ({ company }) => {
          const base = [
            `Berdasarkan hasil pemeriksaan dokumen, ${company} menyampaikan ${typed.typeLabel} untuk lokasi ${label} yang beralamat di ${loc.address || "—"}, ${loc.city || "—"}, ${loc.province || "—"} dengan status bangunan ${isOwned ? "milik sendiri" : "sewa"}.`,
            `Hasil verifikasi menunjukkan bahwa ${typed.typeLabel} yang diunggah perusahaan menunjukkan hak penggunaan yang sah atas lokasi tersebut dan konsisten dengan alamat lokasi yang tercantum dalam data permohonan.`,
          ];
          if (isOwned) return base;
          return [
            ...base,
            `Perjanjian sewa dibuat dengan pemilik asli ${loc.leaseOriginalOwnerName || "—"} untuk masa sewa ${fmtDate(loc.leaseStartDate)} sampai dengan ${fmtDate(loc.leaseEndDate)}.`,
          ];
        },
        kesimpulan: (ctx) => {
          const { company } = ctx;
          const leaseComplete = isOwned || Boolean(loc.leaseOriginalOwnerName && loc.leaseStartDate && loc.leaseEndDate);
          const memenuhi = Boolean(typed.documentPath && loc.address) && leaseComplete && isVerified(ctx, `location:${loc.id}:${typed.kind}:${typed.type}`);
          return {
            memenuhi,
            text: `Berdasarkan hasil verifikasi dokumen, ${company} ${memenuhi ? "memiliki" : "belum melengkapi"} ${typed.typeLabel} yang sah atas lokasi ${label}${isOwned ? "" : ` beserta data perjanjian sewa (pemilik asli dan masa sewa)`}. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
          };
        },
      });
    }
    if (loc.locationType === "GUDANG") {
      docs.push({
        key: `location:${loc.id}:warehouseRegistration`,
        no: no++,
        title: `Tanda Daftar Gudang — ${label}`,
        documentPath: () => loc.warehouseRegistrationDocumentPath,
        intro: () => [
          "Verifikasi terhadap Tanda Daftar Gudang dilakukan untuk memastikan bahwa fasilitas gudang perusahaan telah terdaftar secara resmi sesuai dengan ketentuan peraturan perundang-undangan di bidang perdagangan dan perindustrian.",
        ],
        fields: () => [
          { label: "Alamat Gudang", value: loc.address || "—", ok: Boolean(loc.address) },
          { label: "Status Pendaftaran", value: loc.warehouseRegistrationDocumentPath ? "Terdaftar" : "Belum Terdaftar", ok: Boolean(loc.warehouseRegistrationDocumentPath) },
        ],
        findings: ({ company }) => [
          `Berdasarkan hasil pemeriksaan dokumen, gudang milik ${company} yang beralamat di ${loc.address || "—"} ${loc.warehouseRegistrationDocumentPath ? "telah memiliki Tanda Daftar Gudang yang sah" : "belum dilengkapi dengan Tanda Daftar Gudang"}.`,
        ],
        kesimpulan: (ctx) => {
          const { company } = ctx;
          const memenuhi = Boolean(loc.warehouseRegistrationDocumentPath) && isVerified(ctx, `location:${loc.id}:warehouseRegistration`);
          return {
            memenuhi,
            text: `${company} ${loc.warehouseRegistrationDocumentPath ? "telah melengkapi" : "belum melengkapi"} Tanda Daftar Gudang untuk lokasi ${label}. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
          };
        },
      });
      docs.push({
        key: `location:${loc.id}:warehouseLayout`,
        no: no++,
        title: `Layout Gudang — ${label}`,
        documentPath: () => loc.warehouseLayoutDocumentPath,
        intro: () => [
          "Verifikasi terhadap Layout Gudang dilakukan untuk memastikan tata letak dan kapasitas ruang penyimpanan gudang sesuai dengan skala kegiatan usaha perusahaan yang dimohonkan.",
        ],
        fields: () => [
          { label: "Alamat Gudang", value: loc.address || "—", ok: Boolean(loc.address) },
          { label: "Dokumen Layout", value: loc.warehouseLayoutDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(loc.warehouseLayoutDocumentPath) },
        ],
        findings: ({ company }) => [
          `Berdasarkan hasil pemeriksaan dokumen, ${company} ${loc.warehouseLayoutDocumentPath ? "telah menyampaikan" : "belum menyampaikan"} layout gudang untuk lokasi ${label} yang menggambarkan tata letak ruang penyimpanan.`,
        ],
        kesimpulan: (ctx) => {
          const { company } = ctx;
          const memenuhi = Boolean(loc.warehouseLayoutDocumentPath) && isVerified(ctx, `location:${loc.id}:warehouseLayout`);
          return {
            memenuhi,
            text: `${company} ${loc.warehouseLayoutDocumentPath ? "telah melengkapi" : "belum melengkapi"} Layout Gudang untuk lokasi ${label}. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
          };
        },
      });
    }
  }

  docs.push({
    key: "vki-support:memiliki-menguasai",
    no: no++,
    title: "Surat Pernyataan Memiliki atau Menguasai",
    documentPath: ({ payload }) => payload.vkiSupportDocs?.find((d) => d.key === "memiliki-menguasai")?.documentPath,
    intro: () => [
      "Verifikasi terhadap Surat Pernyataan Memiliki atau Menguasai dilakukan untuk memastikan bahwa perusahaan memiliki atau menguasai fasilitas bangunan — meliputi area produksi, gudang bahan baku, gudang bahan penolong, dan/atau gudang hasil produksi — yang digunakan dalam pelaksanaan kegiatan industri, sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 6 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.",
    ],
    fields: ({ payload }) => {
      const entry = payload.vkiSupportDocs?.find((d) => d.key === "memiliki-menguasai");
      return [
        { label: "Nomor Surat Pernyataan", value: entry?.nomorSurat || "—", ok: Boolean(entry?.nomorSurat) },
        { label: "Tanggal Surat Pernyataan", value: fmtDate(entry?.tanggal), ok: Boolean(entry?.tanggal) },
        { label: "Nama Penandatangan", value: entry?.penandatangan || "—", ok: Boolean(entry?.penandatangan) },
      ];
    },
    findings: ({ payload, company }) => {
      const entry = payload.vkiSupportDocs?.find((d) => d.key === "memiliki-menguasai");
      return [
        `Berdasarkan hasil pemeriksaan dokumen, ${company} menyampaikan Surat Pernyataan Memiliki atau Menguasai Nomor ${entry?.nomorSurat || "—"} tertanggal ${fmtDate(entry?.tanggal)}, ditandatangani oleh ${entry?.penandatangan || "—"} selaku pihak berwenang mewakili perusahaan.`,
        "Isi pernyataan menyatakan bahwa perusahaan memiliki atau menguasai secara sah fasilitas bangunan yang digunakan untuk menunjang kegiatan produksi. Hasil verifikasi menunjukkan bahwa status kepemilikan/penguasaan yang dinyatakan konsisten dengan data lokasi yang diajukan dalam permohonan.",
      ];
    },
    kesimpulan: (ctx) => {
      const { payload, company } = ctx;
      const entry = payload.vkiSupportDocs?.find((d) => d.key === "memiliki-menguasai");
      const memenuhi = Boolean(entry?.documentPath && entry?.nomorSurat && entry?.penandatangan) && isVerified(ctx, "vki-support:memiliki-menguasai");
      return {
        memenuhi,
        text: `Berdasarkan hasil verifikasi dokumen, ${company} ${memenuhi ? "telah menyampaikan" : "belum menyampaikan secara lengkap"} Surat Pernyataan Memiliki atau Menguasai. Dengan demikian, aspek kepemilikan/penguasaan fasilitas bangunan dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sesuai dengan ketentuan Pasal 30 ayat (2) huruf b angka 6 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.`,
      };
    },
  });

  return docs;
}

/**
 * "Dokumen Pendukung VKI" chapter — dynamic, one narrative document per real
 * `payload.electricityMonths[]` entry (Bukti Pembayaran Listrik).
 */
export function buildElectricityDocuments(ctx: NarrativeContext): DocDetail[] {
  return (ctx.payload.electricityMonths ?? []).map((month, i) => ({
    key: `vki-support:listrik:${month.id}`,
    no: i + 1,
    title: `Bukti Pembayaran Listrik — ${fmtBulanTahun(month.bulan)}`,
    documentPath: () => month.documentPath,
    intro: () => [
      "Verifikasi terhadap Bukti Pembayaran Listrik dilakukan untuk memastikan bahwa penggunaan daya listrik perusahaan sesuai dengan skala operasional dan kapasitas produksi yang diajukan dalam permohonan Verifikasi Kemampuan Industri (VKI).",
    ],
    fields: () => [
      { label: "Periode Tagihan", value: fmtBulanTahun(month.bulan), ok: Boolean(month.bulan) },
      { label: "Nominal Pembayaran", value: fmtRupiah(month.nominal), ok: Boolean(month.nominal) },
      { label: "Pemakaian Listrik (kWh)", value: month.kwh || "—", ok: Boolean(month.kwh) },
    ],
    findings: ({ company }) => [
      `Berdasarkan hasil pemeriksaan dokumen, ${company} menyampaikan bukti pembayaran listrik untuk periode ${fmtBulanTahun(month.bulan)} dengan nominal pembayaran ${fmtRupiah(month.nominal)} dan pemakaian sebesar ${month.kwh || "—"} kWh.`,
      "Hasil verifikasi menunjukkan bahwa nominal dan pemakaian listrik yang tercantum pada dokumen wajar terhadap skala operasional dan kapasitas produksi yang diklaim perusahaan, serta tidak ditemukan indikasi ketidaksesuaian pada dokumen yang diperiksa.",
    ],
    kesimpulan: (ctx) => {
      const { company } = ctx;
      const memenuhi = Boolean(month.documentPath && month.nominal && month.kwh) && isVerified(ctx, `vki-support:listrik:${month.id}`);
      return {
        memenuhi,
        text: `${company} ${memenuhi ? "telah melengkapi" : "belum melengkapi"} bukti pembayaran listrik periode ${fmtBulanTahun(month.bulan)}. Aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
      };
    },
  }));
}

/**
 * "Dokumen Partner Industri" chapter — dynamic, 4 narrative documents (NIB/NPWP/SK Kemenkumham
 * Partner + LHVKI) per enabled `payload.partnerIndustriEntries[]` entry. NIB/NPWP/SK resolve
 * against the partner's own Company row (`ctx.partners`, resolved by the caller via
 * `resolvePartnerContexts`), not the applicant's — a mitra industri is a separate company with
 * its own legal identity. LHVKI is the one document that actually lives on this application's
 * own payload.
 */
export function buildPartnerIndustriDocuments(ctx: NarrativeContext): DocDetail[] {
  const docs: DocDetail[] = [];
  let no = 1;
  for (const entry of ctx.payload.partnerIndustriEntries ?? []) {
    if (!entry.enabled) continue;
    const partner = ctx.partners?.find((p) => p.partnerId === entry.partnerId);
    const partnerLabel = partner?.companyName ?? "Partner";

    docs.push({
      key: `partner:${entry.partnerId}:nib`,
      no: no++,
      title: `NIB Partner — ${partnerLabel}`,
      documentPath: () => partner?.nibDocumentPath,
      intro: () => [
        `Verifikasi terhadap Nomor Induk Berusaha (NIB) mitra industri ${partnerLabel} dilakukan untuk memastikan legalitas usaha mitra yang memasok bahan baku dan/atau bahan penolong dalam pelaksanaan Verifikasi Importir Umum (VIU) bagi perusahaan industri.`,
      ],
      fields: () => [
        { label: "Nama Mitra Industri", value: partnerLabel, ok: Boolean(partner) },
        { label: "Dokumen NIB Partner", value: partner?.nibDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(partner?.nibDocumentPath) },
      ],
      findings: () => [
        `Berdasarkan hasil pemeriksaan dokumen, mitra industri ${partnerLabel} ${partner?.nibDocumentPath ? "memiliki Nomor Induk Berusaha (NIB) yang tersedia dalam Directory Perusahaan" : "belum melengkapi dokumen Nomor Induk Berusaha (NIB) pada Directory Perusahaan"}, sebagai bagian dari verifikasi legalitas rantai pasok bahan baku perusahaan.`,
      ],
      kesimpulan: (kctx) => {
        const memenuhi = Boolean(partner?.nibDocumentPath) && isVerified(kctx, `partner:${entry.partnerId}:nib`);
        return {
          memenuhi,
          text: `Mitra industri ${partnerLabel} ${memenuhi ? "memiliki" : "belum melengkapi"} Nomor Induk Berusaha (NIB) yang sah. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
        };
      },
    });

    docs.push({
      key: `partner:${entry.partnerId}:npwp`,
      no: no++,
      title: `NPWP Partner — ${partnerLabel}`,
      documentPath: () => partner?.npwpDocumentPath,
      intro: () => [
        `Verifikasi terhadap Nomor Pokok Wajib Pajak (NPWP) mitra industri ${partnerLabel} dilakukan untuk memastikan identitas perpajakan mitra yang sah sebagai bagian dari verifikasi kesesuaian rantai pasok bahan baku perusahaan.`,
      ],
      fields: () => [
        { label: "Nama Mitra Industri", value: partnerLabel, ok: Boolean(partner) },
        { label: "Dokumen NPWP Partner", value: partner?.npwpDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(partner?.npwpDocumentPath) },
      ],
      findings: () => [
        `Berdasarkan hasil pemeriksaan dokumen, mitra industri ${partnerLabel} ${partner?.npwpDocumentPath ? "memiliki Nomor Pokok Wajib Pajak (NPWP) yang tersedia dalam Directory Perusahaan" : "belum melengkapi dokumen Nomor Pokok Wajib Pajak (NPWP) pada Directory Perusahaan"}.`,
      ],
      kesimpulan: (kctx) => {
        const memenuhi = Boolean(partner?.npwpDocumentPath) && isVerified(kctx, `partner:${entry.partnerId}:npwp`);
        return {
          memenuhi,
          text: `Mitra industri ${partnerLabel} ${memenuhi ? "memiliki" : "belum melengkapi"} NPWP yang sah. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
        };
      },
    });

    docs.push({
      key: `partner:${entry.partnerId}:sk`,
      no: no++,
      title: `SK Kemenkumham Partner — ${partnerLabel}`,
      documentPath: () => partner?.skDocumentPath,
      intro: () => [
        `Verifikasi terhadap Surat Keputusan Kementerian Hukum dan Hak Asasi Manusia mitra industri ${partnerLabel} dilakukan sebagai bukti pendukung keabsahan badan usaha mitra dalam rantai pasok bahan baku perusahaan.`,
      ],
      fields: () => [
        { label: "Nama Mitra Industri", value: partnerLabel, ok: Boolean(partner) },
        { label: "Dokumen SK Kemenkumham Partner", value: partner?.skDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(partner?.skDocumentPath) },
      ],
      findings: () => [
        `Berdasarkan hasil pemeriksaan dokumen, mitra industri ${partnerLabel} ${partner?.skDocumentPath ? "melampirkan Surat Keputusan Kementerian Hukum dan HAM yang tersedia dalam Directory Perusahaan" : "belum melampirkan Surat Keputusan Kementerian Hukum dan HAM pada Directory Perusahaan"}.`,
      ],
      kesimpulan: (kctx) => {
        const memenuhi = Boolean(partner?.skDocumentPath) && isVerified(kctx, `partner:${entry.partnerId}:sk`);
        return {
          memenuhi,
          text: `Mitra industri ${partnerLabel} ${memenuhi ? "melampirkan" : "belum melampirkan"} Surat Keputusan Kementerian Hukum dan HAM. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong> sebagai dokumen pendukung legalitas mitra.`,
        };
      },
    });

    docs.push({
      key: `partner:${entry.partnerId}:lhvki`,
      no: no++,
      title: `LHVKI — ${partnerLabel}`,
      documentPath: () => entry.lhvkiDocumentPath,
      intro: () => [
        `Verifikasi terhadap Laporan Hasil Verifikasi Kemampuan Industri (LHVKI) mitra industri ${partnerLabel} dilakukan untuk memastikan bahwa mitra telah dinyatakan memiliki kemampuan industri yang sah dan terverifikasi, sebagai dasar kerja sama pasokan bahan baku dalam pengajuan Verifikasi Importir Umum (VIU).`,
      ],
      fields: () => [
        { label: "Nomor LHVKI", value: entry.lhvki || "—", ok: Boolean(entry.lhvki) },
        { label: "Nama Mitra Industri", value: partnerLabel, ok: Boolean(partner) },
        { label: "Dokumen LHVKI", value: entry.lhvkiDocumentPath ? "Tersedia" : "Belum Tersedia", ok: Boolean(entry.lhvkiDocumentPath) },
      ],
      findings: () => [
        `Berdasarkan hasil pemeriksaan dokumen, mitra industri ${partnerLabel} melampirkan LHVKI Nomor ${entry.lhvki || "—"} sebagai bukti kemampuan industri yang telah terverifikasi.`,
      ],
      kesimpulan: (kctx) => {
        const memenuhi = Boolean(entry.lhvkiDocumentPath && entry.lhvki) && isVerified(kctx, `partner:${entry.partnerId}:lhvki`);
        return {
          memenuhi,
          text: `Mitra industri ${partnerLabel} ${memenuhi ? "melampirkan" : "belum melampirkan"} LHVKI Nomor ${entry.lhvki || "—"} yang sah. Dengan demikian, aspek ini dinyatakan <strong>${memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>.`,
        };
      },
    });
  }
  return docs;
}
