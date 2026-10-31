import { DOCUMENT_SIFAT_LABELS, formatLegalBasis, resolveDocumentRequirement } from "@/modules/schemes";
import type { VerificationStatusValue } from "@/modules/company/document-versions";
import type { Evidence } from "./case-detail";

/**
 * A document matrix row as every Compliance stage shows it: the document from the shared checklist,
 * the status the reviewer recorded (Verifikator / Customer Relation), and the VIU Konsumsi scheme's
 * requirement type and regulation (src/modules/schemes). Pure — Compliance re-judges nothing.
 */

const SCHEME = "VIU_KONSUMSI" as const;

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
/** Summary chip order, as on the design. "Tidak Berlaku" rows are never built, so it has no chip. */
export const VERIFICATION_SUMMARY_ORDER: VerificationStatusValue[] = ["VERIFIED", "NEED_REVISION", "REJECTED", "EXPIRED", "NOT_YET_VERIFIED"];

export type ChecklistInput = { key: string; label: string; category: string; documentPath: string | null };
export type DocumentStatusInput = {
  verificationStatus: VerificationStatusValue;
  verifiedByName: string | null;
  verifiedByRole: "CR" | "VERIFIKATOR" | null;
  verifiedAt: string | null;
  rejectionNote: string | null;
};

export type DocumentRow = {
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

export function buildDocumentRows(
  checklist: ChecklistInput[],
  statuses: Record<string, DocumentStatusInput | undefined>,
  options: { categories: string[]; valueFor?: (key: string) => string },
): DocumentRow[] {
  return checklist
    .filter((item) => options.categories.includes(item.category))
    .flatMap((item) => {
      const requirement = resolveDocumentRequirement([SCHEME], item.key);
      if (!requirement.applicable) return [];
      // A supporting document the applicant didn't upload has nothing to check — only a required
      // one stays visible while missing.
      if (!item.documentPath && requirement.sifat !== "WAJIB") return [];
      const def = requirement.bySchemes[0]?.def;
      const status = statuses[item.key];
      // The Verifikator declared it "Tidak Berlaku" for this case — nothing left to show.
      if (status?.verificationStatus === "NOT_APPLICABLE") return [];
      const by = status?.verifiedByName
        ? `${status.verifiedByName}${status.verifiedByRole === "CR" ? " (Customer Relation)" : status.verifiedByRole === "VERIFIKATOR" ? " (Verifikator)" : ""}`
        : null;
      return [
        {
          key: item.key,
          label: item.label,
          value: options.valueFor?.(item.key) ?? "—",
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

export function documentSummary(rows: DocumentRow[]): { status: VerificationStatusValue; count: number }[] {
  return VERIFICATION_SUMMARY_ORDER.map((status) => ({ status, count: rows.filter((row) => row.status === status).length })).filter(
    (item) => item.count > 0 || item.status === "VERIFIED" || item.status === "NOT_YET_VERIFIED",
  );
}
