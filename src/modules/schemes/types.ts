/**
 * Per-scheme ("skema") domain model — the single source of truth for which documents a
 * verification scheme asks for, how binding each one is (sifat), and on what legal basis.
 *
 * Four schemes, never mixed:
 *   VKI                          — Verifikasi Kemampuan Industri (Permenperin 27/2025 Ps 25, 30–32)
 *   VIU_KONSUMSI                 — VIU, Produk Tekstil sebagai barang konsumsi (Ps 26 c, 37 (2) c)
 *   VIU_BAHAN_BAKU_NON_INDUSTRI  — VIU, bahan baku bagi Perusahaan Non Industri (Ps 26 b, 37 (2) b)
 *   VIU_BAHAN_BAKU_INDUSTRI      — VIU, bahan baku bagi Perusahaan Industri (Ps 26 a, 37 (2) a)
 *
 * Nothing in this module falls back to another scheme's content. A document/narrative a scheme
 * does not define resolves to the `[BELUM DIATUR untuk {skema}]` marker (see resolvers.ts), which
 * blocks report finalization instead of silently printing VKI wording in a VIU report.
 */

export const SCHEME_IDS = [
  "VKI",
  "VIU_KONSUMSI",
  "VIU_BAHAN_BAKU_NON_INDUSTRI",
  "VIU_BAHAN_BAKU_INDUSTRI",
] as const;
export type SchemeId = (typeof SCHEME_IDS)[number];

export const VIU_SCHEME_IDS = [
  "VIU_BAHAN_BAKU_INDUSTRI",
  "VIU_BAHAN_BAKU_NON_INDUSTRI",
  "VIU_KONSUMSI",
] as const satisfies readonly SchemeId[];

/** Mirrors `LOCATION_TYPES` in modules/shared/schema.ts (kept local so this module stays pure). */
export type SchemeLocationType = "KANTOR" | "GUDANG" | "PABRIK";

/**
 * How binding a document is for a scheme.
 * - WAJIB               must be present & sesuai
 * - WAJIB_ALTERNATIF    one of an alternative pair is required (e.g. bukti pajak 3 th ⟷ SKT)
 * - PILIH_SALAH_SATU    at least one document of the same `group` is required
 * - PENDUKUNG           asked for, not blocking
 * - PENDUKUNG_JIKA_ADA  only shown/printed when the applicant actually has/uploaded it
 */
export const DOCUMENT_SIFAT = [
  "WAJIB",
  "WAJIB_ALTERNATIF",
  "PILIH_SALAH_SATU",
  "PENDUKUNG",
  "PENDUKUNG_JIKA_ADA",
] as const;
export type DocumentSifat = (typeof DOCUMENT_SIFAT)[number];

export const DOCUMENT_SIFAT_LABELS: Record<DocumentSifat, string> = {
  WAJIB: "Wajib",
  WAJIB_ALTERNATIF: "Wajib (alternatif)",
  PILIH_SALAH_SATU: "Wajib — pilih salah satu",
  PENDUKUNG: "Pendukung",
  PENDUKUNG_JIKA_ADA: "Pendukung (jika ada)",
};

/**
 * Where a requirement comes from.
 * - REGULASI       an article of Permenperin 27/2025 (citation required)
 * - INTERNAL_LVI   LVI's own internal requirement, no article — printed as such, never as a pasal
 * - TERKAIT        not a requirement of THIS scheme's article, but of a related article
 *                  (e.g. Pertimbangan Teknis, Ps 8) — collected as supporting evidence
 */
export type LegalBasisKind = "REGULASI" | "INTERNAL_LVI" | "TERKAIT";

export type LegalBasis = {
  kind: LegalBasisKind;
  /** e.g. "Pasal 37 ayat (2) huruf c angka 2 huruf a)". Empty for INTERNAL_LVI. */
  citation: string;
  /** Short explanation shown next to / under the citation. */
  note?: string;
};

export const REGULATION_NAME =
  "Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 tentang Tata Cara Penerbitan Pertimbangan Teknis Impor Tekstil dan Produk Tekstil";
export const REGULATION_SHORT = "Permenperin No. 27 Tahun 2025";

export const REPORT_SECTION_IDS = [
  "legalitas",
  "perpajakan",
  "lokasi",
  "kemampuan-produksi",
  "tenaga-kerja",
  "surat-pernyataan",
  "kemampuan-finansial",
  "mitra-industri",
  "mitra-non-industri",
  "merek",
  "uji-mutu",
  "label",
] as const;
export type ReportSectionId = (typeof REPORT_SECTION_IDS)[number];

/**
 * One document a scheme can ask for.
 *
 * `keyPatterns` match the checklist keys produced by `buildDocumentChecklist`
 * (verifikator-workspace/schema.ts) — `{name}` segments are wildcards for one key segment,
 * a trailing `*` matches any remaining segments. Example: `location:{locationId}:lease:{type}`.
 * When several defs match a key, the most specific one (most literal segments) wins.
 */
export type SchemeDocumentDef = {
  /** Stable id, unique within a scheme (also used for narrative lookup). */
  id: string;
  keyPatterns: readonly string[];
  label: string;
  section: ReportSectionId;
  sifat: DocumentSifat;
  legalBasis: LegalBasis;
  /** For PILIH_SALAH_SATU / WAJIB_ALTERNATIF — documents sharing a group satisfy each other. */
  group?: string;
  /** Location documents only: which location types this def applies to. */
  locationTypes?: readonly SchemeLocationType[];
  /** Key exists in the scheme's design but is not produced by the app yet (new requirement). */
  planned?: boolean;
};

/** Scheme-level vocabulary used by narrative/report code — never hard-code these elsewhere. */
export type SchemeTerms = {
  id: SchemeId;
  /** "VKI" | "VIU" */
  family: "VKI" | "VIU";
  /** Full name, e.g. "Verifikasi Importir Umum (VIU) untuk Impor Produk Tekstil sebagai Barang Konsumsi" */
  verificationName: string;
  /** Short label for chips/tables, e.g. "VIU Barang Konsumsi" */
  shortLabel: string;
  /** e.g. "Laporan Hasil Verifikasi Importir Umum (LHVIU)" */
  reportName: string;
  reportAbbreviation: "LHVKI" | "LHVIU";
  /** Subject of the verification, e.g. "Perusahaan API-U" */
  subject: string;
  /** Purpose phrase, e.g. "Impor Produk Tekstil untuk digunakan sebagai barang konsumsi" */
  importPurpose: string;
  subjectBasis: LegalBasis;
  requirementBasis: LegalBasis;
  verificationBasis: LegalBasis;
  reportContentBasis: LegalBasis;
  validity: { text: string; basis: LegalBasis };
  requiredLocationTypes: readonly SchemeLocationType[];
  /** VIU only — KBLI perdagangan besar the API-U must hold (Ps 37 (2) … angka 2 huruf b)). */
  allowedKbli?: readonly string[];
  /** Phrases that must never appear in this scheme's narrative/report text. */
  forbiddenTerms: readonly string[];
};

/** Values the report hands to a document narrative (all pre-formatted strings). */
export type DocTextParams = {
  company: string;
  /** Document title as printed, e.g. "Sertifikat Uji Mutu — MEREK · Kemeja" */
  title: string;
  /** Verified VALID by the verifikator and data complete. */
  memenuhi: boolean;
  hasDocument: boolean;
  fields: readonly { label: string; value: string }[];
  /** Value of a field by its label, "—" when absent. */
  field: (label: string) => string;
};

/** Narrative for one document — what the checklist/report prints for it in THIS scheme. */
export type DocumentNarrative = {
  /** Short "Keterangan" for the compliance table. */
  keterangan: string;
  intro: (p: DocTextParams) => string[];
  findings: (p: DocTextParams) => string[];
  /** May contain <strong>…</strong>. */
  conclusion: (p: DocTextParams) => string;
};

export type SectionNarrative = {
  title: string;
  desc: string;
  intro: string[];
};

export type ChapterTextParams = { company: string; chapter: string; allMet: boolean };

export type SchemeNarrative = {
  /** Approval page paragraph. */
  foreword: string;
  /** Executive summary opening sentence. */
  summary: (p: { company: string }) => string;
  /** Compliance-table legend for "Wajib". */
  wajibLegend: string;
  /** Opening paragraph of a chapter's "C. Kesimpulan". */
  chapterOpening: (p: ChapterTextParams) => string;
  /** Closing paragraph of a chapter's "C. Kesimpulan" (may contain <strong>). */
  chapterClosing: (p: ChapterTextParams) => string;
  sections: Partial<Record<ReportSectionId, SectionNarrative>>;
  /** Keyed by SchemeDocumentDef.id. */
  documents: Record<string, DocumentNarrative>;
};

export type SchemeDefinition = {
  terms: SchemeTerms;
  documents: readonly SchemeDocumentDef[];
  /** null until the scheme's narrative is written — everything then resolves to BELUM DIATUR. */
  narrative: SchemeNarrative | null;
  /** Report chapter order for this scheme. */
  reportSections: readonly ReportSectionId[];
};
