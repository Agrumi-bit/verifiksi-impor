import { formatLegalBasis, resolveDocumentRequirement } from "@/modules/schemes";
import { buildDocumentRows, documentSummary, type ChecklistInput, type DocumentRow, type DocumentStatusInput } from "./document-matrix";

/**
 * Tahap 2 "Perusahaan & Legalitas" of the Compliance case view (pure): the company data card, the
 * KBLI check against the VIU Konsumsi list, and the Matriks Pemeriksaan — one row per legal/tax
 * document of the application, with the Verifikator's recorded status and the scheme's own
 * requirement type and regulation (src/modules/schemes). Compliance re-judges nothing.
 */

export const LEGALITAS_CATEGORIES = ["Legalitas Perusahaan", "Perpajakan"];

export {
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_TONES,
  VERIFICATION_SUMMARY_ORDER,
  type ChecklistInput,
  type DocumentStatusInput,
  type VerificationStatusTone,
} from "./document-matrix";
export type LegalitasRow = DocumentRow;

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
  return buildDocumentRows(checklist, statuses, { categories: LEGALITAS_CATEGORIES, valueFor: (key) => valueOf(key, values) });
}

export const legalitasSummary = documentSummary;

/** KBLI check: the company's KBLI Utama against the VIU Konsumsi list (Pasal 37 ayat (2) huruf c angka 2 huruf b). */
export function kbliCheck(allowed: readonly string[], kbliUtamaCodes: string[]): { allowed: string[]; matched: string[]; ok: boolean; regulation: string } {
  const held = new Set(kbliUtamaCodes.map((code) => code.trim()));
  const matched = allowed.filter((code) => held.has(code));
  const def = resolveDocumentRequirement(["VIU_KONSUMSI"], "kbli-utama").bySchemes[0]?.def;
  return { allowed: [...allowed], matched, ok: matched.length > 0, regulation: def ? formatLegalBasis(def.legalBasis) : "" };
}
