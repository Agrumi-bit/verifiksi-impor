import { requirementWeights } from "./requirements";
import type { ComplianceScheme } from "./scheme";
import { workspaceKeysOf, type WorkspaceKey, type WorkspaceStatuses } from "./workspace-status";

/**
 * Compliance Workspace rules — handover, readiness and the compliance summary (VIU Konsumsi, VKI).
 * Pure functions over the derived workspace statuses (workspace-status.ts) and Compliance's own
 * findings; nothing here is stored.
 */

/** The 2 administrative LPV checks (Final Review, Dossier), on top of each scheme's workspace requirements. */
export const ADMINISTRATIVE_REQUIREMENTS = 2;

/** All requirements of a scheme: its workspace requirements (requirements.ts) + the administrative checks. */
export function totalRequirements(scheme: ComplianceScheme = "konsumsi"): number {
  return Object.values(requirementWeights(scheme)).reduce((sum, count) => sum + (count ?? 0), 0) + ADMINISTRATIVE_REQUIREMENTS;
}

/** VIU Konsumsi: 42 requirements = 40 from the workspaces + 2 administrative checks. */
export const TOTAL_REQUIREMENTS = totalRequirements("konsumsi");

/** A resolved finding must say how it was resolved. */
export const MIN_RESOLUTION_NOTE_LENGTH = 10;

export type FindingKind = "OPEN" | "KLARIFIKASI" | "CONFLICT" | "RESOLVED";
export type ComplianceStatusValue =
  | "BELUM_DIREVIEW"
  | "DALAM_KONSOLIDASI"
  | "PERLU_TINDAK_LANJUT"
  | "PERLU_KLARIFIKASI"
  | "OPEN_ISSUE"
  | "COMPLIANCE_LENGKAP"
  | "SELESAI";

export type HandoverStatus = "MENUNGGU_HANDOVER" | "HANDOVER_SEBAGIAN" | "SIAP_KONSOLIDASI" | "HANDOVER_LENGKAP";
export const HANDOVER_LABELS: Record<HandoverStatus, string> = {
  MENUNGGU_HANDOVER: "Menunggu Handover",
  HANDOVER_SEBAGIAN: "Handover Sebagian",
  SIAP_KONSOLIDASI: "Siap Konsolidasi",
  HANDOVER_LENGKAP: "Handover Lengkap",
};

export type Readiness = "waiting_handover" | "needs_follow_up" | "ready";
export const READINESS_LABELS: Record<Readiness, string> = {
  waiting_handover: "Menunggu handover",
  needs_follow_up: "Perlu tindak lanjut",
  ready: "Siap",
};

export function allWorkspaceCompleted(statuses: WorkspaceStatuses): boolean {
  return workspaceKeysOf(statuses).every((key) => statuses[key] === "COMPLETED");
}

export function handoverStatus(statuses: WorkspaceStatuses, complianceStatus: ComplianceStatusValue): HandoverStatus {
  if (!allWorkspaceCompleted(statuses)) {
    return workspaceKeysOf(statuses).some((key) => statuses[key] === "ISSUE") ? "HANDOVER_SEBAGIAN" : "MENUNGGU_HANDOVER";
  }
  return complianceStatus === "SELESAI" ? "HANDOVER_LENGKAP" : "SIAP_KONSOLIDASI";
}

function isActiveFinding(finding: { kind: FindingKind }): boolean {
  return finding.kind !== "RESOLVED";
}

export function readiness(statuses: WorkspaceStatuses, findings: { kind: FindingKind }[]): Readiness {
  if (!allWorkspaceCompleted(statuses)) return "waiting_handover";
  return findings.some(isActiveFinding) ? "needs_follow_up" : "ready";
}

/**
 * The administrative LPV checks (Final Review, Dossier) started on 5 Oct 2026. A case whose LHVIU was
 * issued before then never had them, so they are not counted for it at all.
 */
export const ADMINISTRATIVE_CHECKS_SINCE = "2026-10-05";

export function administrativeApplies(lhviuIssuedAt: string | null | undefined): boolean {
  return !lhviuIssuedAt || lhviuIssuedAt >= ADMINISTRATIVE_CHECKS_SINCE;
}

export type ComplianceSummary = {
  total: number;
  /** 2, or 0 when the administrative checks do not apply to the case (administrativeApplies). */
  administrativeTotal: number;
  /** Requirements whose workspace has handed over (completed, or completed with an issue). */
  available: number;
  /** Requirements still waiting for their workspace. */
  pending: number;
  activeFindings: number;
  /** Available requirements not covered by an active finding. */
  sesuai: number;
  /** 0–2 administrative LPV checks done. */
  administrative: number;
  /** (sesuai + administrative) / total, as a whole percentage. */
  score: number;
};

export function complianceSummary(
  statuses: WorkspaceStatuses,
  findings: { kind: FindingKind }[],
  administrative: { finalReviewDone: boolean; dossierComplete: boolean; lhviuIssuedAt?: string | null; scheme?: ComplianceScheme },
): ComplianceSummary {
  const scheme = administrative.scheme ?? "konsumsi";
  const weights = requirementWeights(scheme);
  let available = 0;
  let pending = 0;
  for (const key of workspaceKeysOf(statuses)) {
    const handedOver = statuses[key] === "COMPLETED" || statuses[key] === "ISSUE";
    if (handedOver) available += weights[key] ?? 0;
    else pending += weights[key] ?? 0;
  }
  const activeFindings = findings.filter(isActiveFinding).length;
  const sesuai = Math.max(0, available - activeFindings);
  const applies = administrativeApplies(administrative.lhviuIssuedAt);
  const adminDone = applies ? Number(administrative.finalReviewDone) + Number(administrative.dossierComplete) : 0;
  const total = totalRequirements(scheme) - (applies ? 0 : ADMINISTRATIVE_REQUIREMENTS);
  return {
    total,
    administrativeTotal: applies ? ADMINISTRATIVE_REQUIREMENTS : 0,
    available,
    pending,
    activeFindings,
    sesuai,
    administrative: adminDone,
    score: Math.round(((sesuai + adminDone) / total) * 100),
  };
}

/** Returns an error message, or null when the resolution note is acceptable. */
export function validateResolutionNote(note: string | null | undefined): string | null {
  if ((note ?? "").trim().length < MIN_RESOLUTION_NOTE_LENGTH) {
    return `Catatan penyelesaian wajib diisi minimal ${MIN_RESOLUTION_NOTE_LENGTH} karakter.`;
  }
  return null;
}

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatusValue, string> = {
  BELUM_DIREVIEW: "Belum Direview",
  DALAM_KONSOLIDASI: "Dalam Konsolidasi",
  PERLU_TINDAK_LANJUT: "Perlu Tindak Lanjut",
  PERLU_KLARIFIKASI: "Perlu Klarifikasi",
  OPEN_ISSUE: "Open Issue",
  COMPLIANCE_LENGKAP: "Compliance Lengkap",
  SELESAI: "Selesai",
};

/** The six buckets of the Daftar Permohonan (summary cards, quick chips, Status filter). */
export const CASE_CATEGORIES = ["MH", "SK", "PTL", "OI", "CL", "SL"] as const;
export type CaseCategory = (typeof CASE_CATEGORIES)[number];
export const CASE_CATEGORY_LABELS: Record<CaseCategory, string> = {
  MH: "Menunggu Handover",
  SK: "Siap Konsolidasi",
  PTL: "Perlu Tindak Lanjut",
  OI: "Open Issue",
  CL: "Compliance Lengkap",
  SL: "Selesai",
};

/**
 * Which bucket a case is in. Handover comes first (a case is never "Siap Konsolidasi" while a
 * workspace is unfinished), then Compliance's own decisions: finished, then its active findings
 * (an open finding outranks clarification/conflict), then the compliance status it set.
 */
export function caseCategory(
  statuses: WorkspaceStatuses,
  complianceStatus: ComplianceStatusValue,
  findings: { kind: FindingKind }[],
): CaseCategory {
  if (!allWorkspaceCompleted(statuses)) return "MH";
  if (complianceStatus === "SELESAI") return "SL";
  const active = findings.filter(isActiveFinding);
  if (active.some((finding) => finding.kind === "OPEN") || complianceStatus === "OPEN_ISSUE") return "OI";
  if (active.length > 0 || complianceStatus === "PERLU_TINDAK_LANJUT" || complianceStatus === "PERLU_KLARIFIKASI") return "PTL";
  if (complianceStatus === "COMPLIANCE_LENGKAP") return "CL";
  return "SK";
}

/**
 * The workspace a case is currently at: the first one, in CR → SV → VF (→ TA) → PM order, that has
 * not completed yet; PM once everything is completed. Workspaces don't run in a strict order here
 * (CR schedules survey and dokumen independently, and the PM reviews each report as it
 * comes), so the earliest unfinished one is where the case is held up.
 */
export function lastWorkspace(statuses: WorkspaceStatuses): WorkspaceKey {
  return workspaceKeysOf(statuses).find((key) => statuses[key] !== "COMPLETED") ?? "PM";
}

export function completedWorkspaceCount(statuses: WorkspaceStatuses): number {
  return workspaceKeysOf(statuses).filter((key) => statuses[key] === "COMPLETED").length;
}
