import { WORKSPACE_KEYS, type WorkspaceKey, type WorkspaceStatuses } from "./workspace-status";

/**
 * Compliance Workspace rules — handover, readiness and the compliance summary (VIU Konsumsi).
 * Pure functions over the derived workspace statuses (workspace-status.ts) and Compliance's own
 * findings; nothing here is stored.
 */

/** 42 requirements = 40 from the workspaces + 2 administrative LPV checks (Final Review, Dossier). */
export const REQUIREMENTS_PER_WORKSPACE: Record<WorkspaceKey, number> = { CR: 6, SV: 6, VF: 20, TA: 6, PM: 2 };
export const ADMINISTRATIVE_REQUIREMENTS = 2;
export const TOTAL_REQUIREMENTS =
  WORKSPACE_KEYS.reduce((sum, key) => sum + REQUIREMENTS_PER_WORKSPACE[key], 0) + ADMINISTRATIVE_REQUIREMENTS;

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
  return WORKSPACE_KEYS.every((key) => statuses[key] === "COMPLETED");
}

export function handoverStatus(statuses: WorkspaceStatuses, complianceStatus: ComplianceStatusValue): HandoverStatus {
  if (!allWorkspaceCompleted(statuses)) {
    return WORKSPACE_KEYS.some((key) => statuses[key] === "ISSUE") ? "HANDOVER_SEBAGIAN" : "MENUNGGU_HANDOVER";
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

export type ComplianceSummary = {
  total: number;
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
  administrative: { finalReviewDone: boolean; dossierComplete: boolean },
): ComplianceSummary {
  let available = 0;
  let pending = 0;
  for (const key of WORKSPACE_KEYS) {
    const handedOver = statuses[key] === "COMPLETED" || statuses[key] === "ISSUE";
    if (handedOver) available += REQUIREMENTS_PER_WORKSPACE[key];
    else pending += REQUIREMENTS_PER_WORKSPACE[key];
  }
  const activeFindings = findings.filter(isActiveFinding).length;
  const sesuai = Math.max(0, available - activeFindings);
  const adminDone = Number(administrative.finalReviewDone) + Number(administrative.dossierComplete);
  return {
    total: TOTAL_REQUIREMENTS,
    available,
    pending,
    activeFindings,
    sesuai,
    administrative: adminDone,
    score: Math.round(((sesuai + adminDone) / TOTAL_REQUIREMENTS) * 100),
  };
}

/** Returns an error message, or null when the resolution note is acceptable. */
export function validateResolutionNote(note: string | null | undefined): string | null {
  if ((note ?? "").trim().length < MIN_RESOLUTION_NOTE_LENGTH) {
    return `Catatan penyelesaian wajib diisi minimal ${MIN_RESOLUTION_NOTE_LENGTH} karakter.`;
  }
  return null;
}
