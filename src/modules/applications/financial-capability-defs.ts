/**
 * Shared "Bukti Kemampuan Finansial" document catalog — the Surat Pernyataan Kepemilikan Modal
 * Kerja plus the "pick one" supporting-evidence list. Deliberately a standalone leaf module with
 * no dependency on either `applications/schema.ts` or `viu-schemes/konsumsi/schema.ts`: both of
 * those import catalog data from here, but `konsumsi/schema.ts` must never import from
 * `applications/schema.ts` (the reverse already happens — see that file's own import-direction
 * note), so this catalog can't live in either one of them without creating a cycle.
 *
 * This file holds only the catalog (what documents exist, their labels/descriptions) — the actual
 * per-application data is two separate arrays (`nonIndustriDocuments` for Bahan Baku Industri/Non
 * Industri, `konsumsiFinancialDocuments` for Barang Konsumsi), each schema-owned by its own
 * module, so the three Jenis Impor never share storage even though the regulatory requirement and
 * the document catalog are identical.
 */
export type FinancialDocPriority = "UTAMA" | "PENDUKUNG";

export type FinancialDocDef = {
  key: string;
  title: string;
  /** What the document proves — shown as the field's hint. */
  desc: string;
  priority: FinancialDocPriority;
};

/** The only unconditionally required document — a sworn statement of working-capital ownership.
 * Kept out of `NON_INDUSTRI_SUPPORT_DOC_DEFS` (the "pick one evidence type" group below) since
 * it's not a choice: every applicant uploads this one, full stop, then additionally picks ONE
 * supporting evidence document from the list. */
export const MODAL_STATEMENT_LETTER_DOC_DEF: FinancialDocDef = {
  key: "surat-pernyataan-modal-kerja",
  title: "Surat Pernyataan Kepemilikan Modal Kerja",
  desc: "Pernyataan bermaterai bahwa perusahaan memiliki modal kerja yang cukup untuk membiayai kegiatan impor.",
  priority: "UTAMA",
};

/**
 * "Pick one" evidence-of-financial-capability checklist — supplementary to
 * `MODAL_STATEMENT_LETTER_DOC_DEF` (always required). All PENDUKUNG: the applicant selects
 * exactly one type of evidence and uploads it, rather than needing every item on this list.
 */
export const NON_INDUSTRI_SUPPORT_DOC_DEFS: FinancialDocDef[] = [
  {
    key: "rekening-koran",
    title: "Rekening Koran Perusahaan (3–6 Bulan Terakhir)",
    desc: "Saldo, arus kas, dan aktivitas keuangan aktual perusahaan.",
    priority: "PENDUKUNG",
  },
  {
    key: "surat-referensi-bank",
    title: "Surat Referensi Bank",
    desc: "Hubungan perbankan dan keberadaan rekening perusahaan.",
    priority: "PENDUKUNG",
  },
  {
    key: "laporan-keuangan",
    title: "Laporan Keuangan Terakhir",
    desc: "Kas, aset lancar, kewajiban lancar, modal dan kondisi keuangan.",
    priority: "PENDUKUNG",
  },
  {
    key: "fasilitas-kredit",
    title: "Bukti Fasilitas Kredit / Credit Line dari Bank",
    desc: "Kemampuan memperoleh pembiayaan untuk transaksi impor.",
    priority: "PENDUKUNG",
  },
  {
    key: "keterangan-saldo",
    title: "Surat Keterangan Saldo / Bank Statement",
    desc: "Posisi dana pada tanggal tertentu.",
    priority: "PENDUKUNG",
  },
  {
    key: "deposito",
    title: "Bukti Deposito atau Instrumen Likuid Perusahaan",
    desc: "Tambahan sumber dana yang dapat digunakan.",
    priority: "PENDUKUNG",
  },
  {
    key: "pinjaman-afiliasi",
    title: "Perjanjian Pinjaman Pemegang Saham/Afiliasi",
    desc: "Sumber pembiayaan tambahan, jika memang ada dan sah.",
    priority: "PENDUKUNG",
  },
  {
    key: "kontrak-po",
    title: "Kontrak/PO dengan Perusahaan Industri",
    desc: "Dasar komersial kebutuhan pembelian/importasi.",
    priority: "PENDUKUNG",
  },
  {
    key: "proforma-invoice",
    title: "Proforma Invoice/Quotation Supplier Luar Negeri",
    desc: "Estimasi nilai pembelian barang yang akan dibiayai.",
    priority: "PENDUKUNG",
  },
];
