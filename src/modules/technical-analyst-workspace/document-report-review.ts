/**
 * Technical Analyst's review of the verifikator's Laporan Verifikasi Dokumen — the same desk-review
 * pattern the verifikator applies to the surveyor's field report (checklist + Verified/Revisi/Reject),
 * one level up. Revisi/Reject reopens the verifikator's dokumen
 * assignment (back to SUBMITTED) so the report can be corrected and re-submitted. A VERIFIED review is required before the analyst can Approve the technical assignment.
 *
 * Pure module (no db) — shared by the API routes and the client components.
 */

export const DOCUMENT_REPORT_REVIEW_ITEMS = [
  {
    key: "kelengkapan",
    label: "Kelengkapan Pemeriksaan Dokumen",
    description: "Seluruh dokumen yang dipersyaratkan skema permohonan telah diperiksa dan statusnya ditetapkan (tidak ada yang Belum Diperiksa).",
  },
  {
    key: "kesesuaian",
    label: "Kesesuaian Data",
    description: "Data hasil pemeriksaan pada laporan sesuai dengan data permohonan dan dokumen yang diunggah.",
  },
  {
    key: "regulasi",
    label: "Rujukan Regulasi",
    description: "Rujukan pasal Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 pada setiap pemeriksaan sesuai dengan skema permohonan.",
  },
  {
    key: "kesimpulan",
    label: "Kesimpulan Verifikator",
    description: "Kesimpulan per aspek dan kesimpulan akhir konsisten dengan hasil pemeriksaan dokumen.",
  },
  {
    key: "pengesahan",
    label: "Pengesahan Laporan",
    description: "Laporan telah disubmit dan ditandatangani verifikator dengan tanggal penyusunan yang benar.",
  },
] as const;

export type DocumentReportReviewItemKey = (typeof DOCUMENT_REPORT_REVIEW_ITEMS)[number]["key"];
export type DocumentReportReviewResult = "PASS" | "FAIL";
export type DocumentReportReviewDecision = "VERIFIED" | "REVISION" | "REJECTED";

export const DOCUMENT_REPORT_REVIEW_DECISION_LABELS: Record<DocumentReportReviewDecision, string> = {
  VERIFIED: "Verified",
  REVISION: "Revisi",
  REJECTED: "Reject",
};

export const DOCUMENT_REPORT_REVIEW_DECISION_BADGE: Record<DocumentReportReviewDecision, string> = {
  VERIFIED: "bg-[#e2f7ea] text-[#1a9850]",
  REVISION: "bg-[#faf1de] text-[#a6791f]",
  REJECTED: "bg-[#fbe4de] text-[#c1361f]",
};

export type DocumentReportReview = {
  items: Partial<Record<DocumentReportReviewItemKey, { result: DocumentReportReviewResult | null; note: string | null }>>;
  decision: DocumentReportReviewDecision | null;
  note: string | null;
  /** Tanggal diperiksa chosen by the analyst (YYYY-MM-DD). */
  verifiedAt: string | null;
  verifiedByName: string | null;
  /** When the decision was saved. */
  decidedAt: string | null;
};

export const EMPTY_DOCUMENT_REPORT_REVIEW: DocumentReportReview = {
  items: {},
  decision: null,
  note: null,
  verifiedAt: null,
  verifiedByName: null,
  decidedAt: null,
};

const DECISIONS = new Set<string>(["VERIFIED", "REVISION", "REJECTED"]);
const RESULTS = new Set<string>(["PASS", "FAIL"]);

/** Tolerant read of the stored JSON — unknown keys/values are dropped, never thrown on. */
export function parseDocumentReportReview(value: unknown): DocumentReportReview {
  if (!value || typeof value !== "object") return EMPTY_DOCUMENT_REPORT_REVIEW;
  const raw = value as Record<string, unknown>;
  const items: DocumentReportReview["items"] = {};
  const rawItems = (raw.items ?? {}) as Record<string, { result?: unknown; note?: unknown }>;
  for (const def of DOCUMENT_REPORT_REVIEW_ITEMS) {
    const item = rawItems[def.key];
    if (!item) continue;
    items[def.key] = {
      result: typeof item.result === "string" && RESULTS.has(item.result) ? (item.result as DocumentReportReviewResult) : null,
      note: typeof item.note === "string" && item.note.trim() ? item.note : null,
    };
  }
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
  return {
    items,
    decision: typeof raw.decision === "string" && DECISIONS.has(raw.decision) ? (raw.decision as DocumentReportReviewDecision) : null,
    note: str(raw.note),
    verifiedAt: str(raw.verifiedAt),
    verifiedByName: str(raw.verifiedByName),
    decidedAt: str(raw.decidedAt),
  };
}

export function isDocumentReportVerified(review: DocumentReportReview | null | undefined): boolean {
  return review?.decision === "VERIFIED";
}
