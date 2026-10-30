import type { CaseDetailInput, Evidence } from "./case-detail";
import type { ComplianceStatusValue } from "./consolidation";
import { WORKSPACE_LABELS, type WorkspaceKey } from "./workspace-status";

/**
 * Compliance Dossier (pure): the final case file — one section per source workspace plus the LHVIU —
 * and the two administrative LPV checks Compliance marks itself (Final Review, Dossier lengkap).
 */

/** What one schedule type (survey/dokumen/technical) handed over, per the assignments of the case. */
export type WorkspaceOutput = { doneAt: string | null; names: string[]; pmReview: string | null };

export type AdministrativeRecord = { done: boolean; at: string | null; byName: string | null };

export type DossierInput = CaseDetailInput & {
  administrative?: { finalReview: AdministrativeRecord; dossier: AdministrativeRecord };
  outputs: { CR: { approvedLetters: number; letters: number }; SV: WorkspaceOutput; VF: WorkspaceOutput; TA: WorkspaceOutput; PM: { at: string | null; names: string[] } };
};

export type DossierSection = {
  key: WorkspaceKey | "LH";
  title: string;
  sourceLabel: string;
  ready: boolean;
  status: string;
  completedAt: string | null;
  completedBy: string;
  result: string;
  documents: Evidence[];
  /** Case Detail stage that shows this output. */
  step: number;
};

const DONE_LABELS: Record<WorkspaceKey, string> = {
  CR: "Dokumen Lengkap",
  SV: "Survey Selesai",
  VF: "Verification Completed",
  TA: "Technical Analysis Completed",
  PM: "Approved",
};
const WAITING_LABELS = { IN_PROGRESS: "Dalam Proses", ISSUE: "Ada Issue", NOT_STARTED: "Belum Mulai", COMPLETED: "Completed" } as const;

function names(list: string[]): string {
  return list.length ? list.join(", ") : "—";
}

export function buildDossier(input: DossierInput): DossierSection[] {
  const { row, outputs } = input;
  const section = (key: WorkspaceKey, title: string, step: number, completedAt: string | null, by: string[], result: string, documents: Evidence[] = []): DossierSection => {
    const ready = row.workspaces[key] === "COMPLETED";
    return {
      key,
      title,
      sourceLabel: WORKSPACE_LABELS[key],
      ready,
      status: ready ? DONE_LABELS[key] : WAITING_LABELS[row.workspaces[key]],
      completedAt: ready ? completedAt : null,
      completedBy: ready ? names(by) : "—",
      result: ready ? result : "—",
      documents: ready ? documents : [],
      step,
    };
  };
  const pmApproved = input.pmReviews.filter((review) => review.status === "Disetujui").length;
  return [
    section("CR", "Customer Relation Result", 1, null, [], `${outputs.CR.approvedLetters} dari ${outputs.CR.letters} Surat Tugas disetujui`),
    section("SV", "Survey Report", 3, outputs.SV.doneAt, outputs.SV.names, outputs.SV.pmReview ?? "—"),
    section("VF", "Verification Report", 2, outputs.VF.doneAt, outputs.VF.names, outputs.VF.pmReview ?? "—", input.legal.documents),
    section("TA", "Technical Analysis Report", 5, outputs.TA.doneAt, outputs.TA.names, outputs.TA.pmReview ?? "—"),
    section("PM", "Project Manager Approval", 10, outputs.PM.at, outputs.PM.names, `${pmApproved} dari ${input.pmReviews.length} laporan disetujui`),
    {
      key: "LH",
      title: "LHVIU Final",
      sourceLabel: WORKSPACE_LABELS.PM,
      ready: row.lhviuIssued,
      status: row.lhviuIssued ? "Diterbitkan" : "Belum Terbit",
      completedAt: row.lhviuIssued ? input.lhviu.issuedAt : null,
      completedBy: row.lhviuIssued ? names(outputs.PM.names) : "—",
      result: row.lhviuIssued ? `LHVIU ${input.lhviu.number ?? ""}`.trim() : "—",
      documents: row.lhviuIssued && input.lhviu.file ? [input.lhviu.file] : [],
      step: 11,
    },
  ];
}

export function readySections(sections: DossierSection[]): number {
  return sections.filter((section) => section.ready).length;
}

export type AdministrativeState = { finalReviewDone: boolean; dossierComplete: boolean };

/** Why a check can't be marked now, or null when it can. Unmarking is always allowed. */
export function administrativeBlocker(check: keyof AdministrativeState, input: DossierInput, sections: DossierSection[]): string | null {
  if (check === "dossierComplete") {
    return readySections(sections) === sections.length ? null : "Dossier belum lengkap: masih ada bagian yang belum diserahkan workspace sumber.";
  }
  if (input.row.readiness === "waiting_handover") return "Final Review menunggu semua workspace selesai handover.";
  if (input.row.readiness === "needs_follow_up") return "Selesaikan dulu temuan yang masih aktif sebelum Final Review.";
  return null;
}

/**
 * Compliance status after the administrative checks change: Final Review done → Compliance Lengkap,
 * and with the dossier complete and the LHVIU issued → Selesai. Removing Final Review sends the case
 * back to Dalam Konsolidasi. Statuses Compliance sets for findings are left alone otherwise.
 */
export function nextComplianceStatus(current: ComplianceStatusValue, checks: AdministrativeState, lhviuIssued: boolean): ComplianceStatusValue {
  if (checks.finalReviewDone && checks.dossierComplete && lhviuIssued) return "SELESAI";
  if (checks.finalReviewDone) return "COMPLIANCE_LENGKAP";
  if (current === "COMPLIANCE_LENGKAP" || current === "SELESAI") return "DALAM_KONSOLIDASI";
  return current;
}

/** LHVIU validity — berlaku 1 tahun sejak tanggal terbit (Pasal 39 ayat (6)). */
export function lhviuValidity(issuedAt: string, today: string): { validUntil: string; status: "Berlaku" | "Kedaluwarsa" } {
  const [year, month, day] = issuedAt.split("-").map(Number);
  const validUntil = `${year + 1}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return { validUntil, status: today <= validUntil ? "Berlaku" : "Kedaluwarsa" };
}
