import { DOCUMENT_SIFAT_LABELS, formatLegalBasis, resolveDocumentRequirement } from "@/modules/schemes";
import type { VerificationStatusValue } from "@/modules/company/document-versions";
import type { Evidence } from "./case-detail";

/**
 * Tahap 2 "Perusahaan & Legalitas" of the Compliance case view (pure): the company data card, the
 * KBLI check against the VIU Konsumsi list, and the Matriks Pemeriksaan — one row per legal/tax
 * document of the application, with the Verifikator's recorded status and the scheme's own
 * requirement type and regulation (src/modules/schemes). Compliance re-judges nothing.
 */

const SCHEME = "VIU_KONSUMSI" as const;
export const LEGALITAS_CATEGORIES = ["Legalitas Perusahaan", "Perpajakan"];

export type VerificationStatusTone = "green" | "orange" | "red" | "slate";
export const VERIFICATION_STATUS_LABELS: Record<VerificationStatusValue, string> = {
  VERIFIED: "Terverifikasi",
  NOT_YET_VERIFIED: "Belum Diverifikasi",
  NEED_REVISION: "Perlu Revisi",
  REJECTED: "Ditolak",
  NOT_APPLICABLE: "Tidak Berlaku",
  EXPIRED: "Kedaluwarsa",
};
export const VERIFICATION_STATUS_TONES: Record<VerificationStatusValue, VerificationStatusTone> = {
  VERIFIED: "green",
  NOT_YET_VERIFIED: "slate",
  NEED_REVISION: "orange",
  REJECTED: "red",
  NOT_APPLICABLE: "slate",
  EXPIRED: "red",
};
/** Summary chip order, as on the design. */
export const VERIFICATION_SUMMARY_ORDER: VerificationStatusValue[] = ["VERIFIED", "NEED_REVISION", "REJECTED", "EXPIRED", "NOT_YET_VERIFIED", "NOT_APPLICABLE"];

export type ChecklistInput = { key: string; label: string; category: string; documentPath: string | null };
export type DocumentStatusInput = {
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedByRole: "CR" | "VERIFIKATOR" | null;
  verifiedAt: string | null;
  rejectionNote: string | null;
};

export type LegalitasRow = {
  key: string;
  label: string;
  value: string;
  document: Evidence | null;
  status: VerificationStatusValue;
  verifiedBy: string | null;
  note: string | null;
  requirement: string;
  regulation: string;
};

/** What the applicant filled in for each legal/tax document ("Isian"). */
export type LegalitasValues = {
  nib: string | null;
  npwp: string | null;
  kbliUtama: string[];
  kbliPendukung: string[];
  notarialDeedNumber: string | null;
  notarialAmendmentNumber: string | null;
  skNumber: string | null;
  sktNumber: string | null;
  taxProofYears: string[];
};

function valueOf(key: string, values: LegalitasValues): string {
  const join = (list: string[]) => (list.length ? list.join("; ") : "—");
  switch (key) {
    case "nib":
      return values.nib ?? "—";
    case "npwp":
      return values.npwp ?? "—";
    case "kbli-utama":
      return join(values.kbliUtama);
    case "kbli-pendukung":
      return join(values.kbliPendukung);
    case "notarial":
      return values.notarialDeedNumber ?? "—";
    case "notarial-amendment":
      return values.notarialAmendmentNumber ?? "—";
    case "sk":
      return values.skNumber ?? "—";
    case "skt":
      return values.sktNumber ?? "—";
    case "tax-proof-summary":
      return values.taxProofYears.length ? `Tahun ${values.taxProofYears.join(", ")}` : "—";
    default:
      return "—";
  }
}

export function buildLegalitasRows(
  checklist: ChecklistInput[],
  statuses: Record<string, DocumentStatusInput | undefined>,
  values: LegalitasValues,
): LegalitasRow[] {
  return checklist
    .filter((item) => LEGALITAS_CATEGORIES.includes(item.category))
    .flatMap((item) => {
      const requirement = resolveDocumentRequirement([SCHEME], item.key);
      if (!requirement.applicable) return [];
      // A supporting document the applicant didn't upload has nothing to check — only a required
      // one stays visible while missing.
      if (!item.documentPath && requirement.sifat !== "WAJIB") return [];
      const def = requirement.bySchemes[0]?.def;
      const status = statuses[item.key];
      const by = status?.verifiedByName
        ? `${status.verifiedByName}${status.verifiedByRole === "CR" ? " (Customer Relation)" : status.verifiedByRole === "VERIFIKATOR" ? " (Verifikator)" : ""}`
        : null;
      return [
        {
          key: item.key,
          label: item.label,
          value: valueOf(item.key, values),
          document: item.documentPath ? { label: item.label, path: item.documentPath } : null,
          status: status?.verificationStatus ?? "NOT_YET_VERIFIED",
          verifiedBy: by,
          note: status?.rejectionNote ?? null,
          requirement: requirement.sifat ? DOCUMENT_SIFAT_LABELS[requirement.sifat] : "—",
          regulation: def ? formatLegalBasis(def.legalBasis) : "—",
        },
      ];
    });
}

export function legalitasSummary(rows: LegalitasRow[]): { status: VerificationStatusValue; count: number }[] {
  return VERIFICATION_SUMMARY_ORDER.map((status) => ({ status, count: rows.filter((row) => row.status === status).length })).filter(
    (item) => item.count > 0 || item.status === "VERIFIED" || item.status === "NOT_YET_VERIFIED",
  );
}

/** KBLI check: the company's KBLI Utama against the VIU Konsumsi list (Pasal 37 ayat (2) huruf c angka 2 huruf b). */
export function kbliCheck(allowed: readonly string[], kbliUtamaCodes: string[]): { allowed: string[]; matched: string[]; ok: boolean; regulation: string } {
  const held = new Set(kbliUtamaCodes.map((code) => code.trim()));
  const matched = allowed.filter((code) => held.has(code));
  const def = resolveDocumentRequirement([SCHEME], "kbli-utama").bySchemes[0]?.def;
  return { allowed: [...allowed], matched, ok: matched.length > 0, regulation: def ? formatLegalBasis(def.legalBasis) : "" };
}
