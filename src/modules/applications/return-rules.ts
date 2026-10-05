import { getViuWizardSteps, VIU_WIZARD_STEPS, VKI_WIZARD_STEPS } from "./wizard-steps-meta";

/**
 * Rules for "Kembalikan untuk Revisi" by Customer Relationship / Admin, shared by the UI (to
 * hide/disable the action) and `returnApplicationForRevision` (which enforces them). No db
 * import — safe for client components.
 */

/** Application statuses CR/Admin may return from. DRAFT, RETURNED, COMPLETED, REJECTED and
 * WITHDRAWN are refused. */
export const RETURNABLE_APPLICATION_STATUSES = [
  "SUBMITTED",
  "ADMINISTRATIVE_REVIEW",
  "SURVEY_SCHEDULED",
  "FIELD_VERIFICATION",
  "VERIFICATION",
  "TECHNICAL_REVIEW",
  "COMPLIANCE_REVIEW",
] as const;

export const RETURN_REASON_MIN_LENGTH = 10;

const NOT_RETURNABLE_REASON: Record<string, string> = {
  DRAFT: "Permohonan masih berupa draft dan belum diajukan.",
  RETURNED: "Permohonan sudah dikembalikan untuk revisi dan sedang menunggu perbaikan dari perusahaan.",
  COMPLETED: "Permohonan sudah selesai.",
  REJECTED: "Permohonan sudah ditolak.",
  WITHDRAWN: "Permohonan sudah ditarik oleh perusahaan.",
  REPORT_GENERATION: "Permohonan sudah dalam tahap penyusunan laporan.",
};

/**
 * Whether CR/Admin may return the application. Application.status alone isn't enough: nothing
 * writes COMPLETED today, so an application whose every assignment is COMPLETED still reads
 * SUBMITTED — that counts as finished too.
 */
export function getReturnEligibility(
  status: string,
  assignmentStatuses: readonly string[],
): { allowed: true } | { allowed: false; reason: string } {
  if (!(RETURNABLE_APPLICATION_STATUSES as readonly string[]).includes(status)) {
    return { allowed: false, reason: NOT_RETURNABLE_REASON[status] ?? `Permohonan berstatus ${status} tidak dapat dikembalikan.` };
  }
  if (assignmentStatuses.length > 0 && assignmentStatuses.every((s) => s === "COMPLETED")) {
    return { allowed: false, reason: "Seluruh penugasan permohonan ini sudah selesai." };
  }
  return { allowed: true };
}

/** Wizard steps a returner can flag for correction — the application's own step list, minus
 * Preview/Submit which hold no data of their own. */
export function returnSectionOptions(verificationType: string, importTypes: readonly string[]): { key: string; title: string }[] {
  const steps = verificationType === "VKI" ? VKI_WIZARD_STEPS : getViuWizardSteps([...importTypes]);
  return steps.filter((s) => s.key !== "preview" && s.key !== "submit").map((s) => ({ key: s.key, title: s.title }));
}

const SECTION_TITLES = new Map<string, string>(
  [...VKI_WIZARD_STEPS, ...VIU_WIZARD_STEPS].map((s) => [s.key, s.title] as const),
);

export function isKnownReturnSection(key: string): boolean {
  return SECTION_TITLES.has(key) && key !== "preview" && key !== "submit";
}

export function returnSectionTitle(key: string): string {
  return SECTION_TITLES.get(key) ?? key;
}

export type ReturnSource = "VERIFIKATOR" | "TECHNICAL_ANALYST" | "CUSTOMER_RELATIONSHIP" | "ADMIN";

const RETURN_SOURCE_LABELS: Record<ReturnSource, string> = {
  VERIFIKATOR: "Verifikator",
  TECHNICAL_ANALYST: "Technical Analyst",
  CUSTOMER_RELATIONSHIP: "Customer Relationship",
  ADMIN: "Admin",
};

export function returnSourceLabel(source: string | null | undefined): string {
  return source && source in RETURN_SOURCE_LABELS ? RETURN_SOURCE_LABELS[source as ReturnSource] : "Petugas";
}
