import {
  MODAL_STATEMENT_LETTER_DOC_DEF,
  NON_INDUSTRI_SUPPORT_DOC_DEFS,
} from "@/modules/applications/financial-capability-defs";
import type { LegalBasis, SchemeDocumentDef } from "../types";

/**
 * "Bukti Kemampuan Finansial" for VIU schemes. Titles come from the existing catalog
 * (financial-capability-defs.ts) so labels never drift; each scheme decides sifat + basis.
 *
 * Key prefixes stay as the app stores them today:
 *   Bahan Baku Industri / Non Industri → `nonindustri-support:{key}`
 *   Barang Konsumsi                    → `konsumsi-financial:{key}`
 */
export type FinancialPrefix = "nonindustri-support" | "konsumsi-financial";

export const FINANCIAL_EVIDENCE_GROUP = "bukti-kemampuan-finansial";

export function modalKerjaStatement(prefix: FinancialPrefix, legalBasis: LegalBasis): SchemeDocumentDef {
  return {
    id: "surat-pernyataan-modal-kerja",
    keyPatterns: [`${prefix}:${MODAL_STATEMENT_LETTER_DOC_DEF.key}`],
    label: MODAL_STATEMENT_LETTER_DOC_DEF.title,
    section: "kemampuan-finansial",
    sifat: "WAJIB",
    legalBasis,
  };
}

/**
 * Supporting financial evidence.
 * - mode "PILIH_SALAH_SATU": at least one of the list is required (Bahan Baku Industri/Non Industri).
 * - mode "PENDUKUNG_JIKA_ADA": optional, printed only when uploaded (Barang Konsumsi).
 */
export function financialEvidence(
  prefix: FinancialPrefix,
  mode: "PILIH_SALAH_SATU" | "PENDUKUNG_JIKA_ADA",
  legalBasis: LegalBasis,
): SchemeDocumentDef[] {
  return NON_INDUSTRI_SUPPORT_DOC_DEFS.map((def) => ({
    id: `financial-${def.key}`,
    keyPatterns: [`${prefix}:${def.key}`],
    label: def.title,
    section: "kemampuan-finansial" as const,
    sifat: mode,
    legalBasis,
    ...(mode === "PILIH_SALAH_SATU" ? { group: FINANCIAL_EVIDENCE_GROUP } : {}),
  }));
}
