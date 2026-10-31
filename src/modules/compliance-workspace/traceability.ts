import type { CaseDetailInput, Evidence } from "./case-detail";
import { WORKSPACE_LABELS, type WorkspaceKey } from "./workspace-status";

/**
 * Audit & Traceability (pure): the cross-workspace timeline, the change history and the data lineage
 * of a case — all from what was recorded, nothing reconstructed.
 */

export type TrailSource = WorkspaceKey | "CMP" | "COMPANY" | "ADMIN" | "SYSTEM";
export const TRAIL_SOURCE_LABELS: Record<TrailSource, string> = {
  ...WORKSPACE_LABELS,
  CMP: "Compliance",
  COMPANY: "Perusahaan",
  ADMIN: "Admin",
  SYSTEM: "Sistem",
};
export const TRAIL_SOURCES: TrailSource[] = ["CR", "SV", "VF", "PM", "CMP", "COMPANY", "ADMIN", "SYSTEM"];

const ROLE_SOURCE: Record<string, TrailSource> = {
  CUSTOMER_RELATIONSHIP: "CR",
  SURVEYOR: "SV",
  VERIFIKATOR: "VF",
  PROJECT_MANAGER: "PM",
  COMPLIANCE: "CMP",
  PERUSAHAAN: "COMPANY",
  ADMIN: "ADMIN",
  SUPER_ADMIN: "ADMIN",
};

/** Which party an audit-log entry belongs to: Compliance's own actions by name, else the actor's role. */
export function trailSourceOf(action: string, actorRole: string | null): TrailSource {
  if (action.startsWith("COMPLIANCE_")) return "CMP";
  return (actorRole && ROLE_SOURCE[actorRole]) || "SYSTEM";
}

const ACTION_LABELS: Record<string, string> = {
  RETURN: "Dikembalikan untuk revisi",
  EDIT: "Data permohonan diubah",
  RESUBMIT: "Revisi dikirim ulang",
  COMPLETE: "Permohonan selesai (LHVIU terbit)",
  UNCOMPLETE: "Status selesai dibatalkan",
  SCHEDULE_DATE: "Jadwal diubah",
  COMPLIANCE_ASSIGN_PIC: "PIC Compliance diubah",
  COMPLIANCE_REVIEW_FLAG: "Tanda review diubah",
  COMPLIANCE_FINDING_CREATE: "Temuan dicatat",
  COMPLIANCE_FINDING_FOLLOW_UP: "Tindak lanjut temuan",
  COMPLIANCE_ADMIN_CHECK: "Cek administratif",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.replaceAll("_", " ").toLowerCase();
}

export type TrailEvent = {
  id: string;
  at: string;
  applicationId: string;
  applicationNumber: string;
  source: TrailSource;
  text: string;
  by: string | null;
};

/** Newest first; ties keep a stable order by id. */
export function sortTrail(events: TrailEvent[]): TrailEvent[] {
  return [...events].sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}

const FIELD_LABELS: Record<string, string> = {
  "compliance.pic": "PIC Compliance",
  "compliance.reviewFlag": "Tanda review",
  "compliance.finalReviewDone": "Final Review Compliance",
  "compliance.dossierComplete": "Dossier lengkap",
  "compliance.status": "Status compliance",
};
const KIND_LABELS: Record<string, string> = { OPEN: "Open Issue", KLARIFIKASI: "Perlu Klarifikasi", CONFLICT: "Conflict Data", RESOLVED: "Resolved" };

export function fieldLabel(path: string): string {
  if (FIELD_LABELS[path]) return FIELD_LABELS[path];
  const finding = /^compliance\.finding\.(.+)\.status$/.exec(path);
  if (finding) return `Status ${finding[1]}`;
  return path;
}

function display(path: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "Ya" : "Tidak";
  if (/^compliance\.finding\..+\.status$/.test(path) && typeof value === "string") return KIND_LABELS[value] ?? value;
  if (typeof value === "string" || typeof value === "number") return String(value);
  return JSON.stringify(value);
}

export type HistoryRow = { id: string; at: string; applicationId: string; applicationNumber: string; field: string; before: string; after: string; by: string | null; source: TrailSource };

/** One row per changed field of every audit-log entry that recorded before/after values. */
export function historyRows(
  logs: { id: string; createdAt: string; applicationId: string; applicationNumber: string; action: string; actorName: string | null; actorRole: string | null; changedFields: unknown }[],
): HistoryRow[] {
  return logs.flatMap((log) => {
    if (!Array.isArray(log.changedFields)) return [];
    return log.changedFields
      .filter((change): change is { path: string; before?: unknown; after?: unknown } => typeof change?.path === "string")
      .map((change, index) => ({
        id: `${log.id}-${index}`,
        at: log.createdAt,
        applicationId: log.applicationId,
        applicationNumber: log.applicationNumber,
        field: fieldLabel(change.path),
        before: display(change.path, change.before),
        after: display(change.path, change.after),
        by: log.actorName,
        source: trailSourceOf(log.action, log.actorRole),
      }));
  }).sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id));
}

export type LineageRow = { field: string; source: WorkspaceKey; sourceLabel: string; document: string; data: string; evidence: Evidence | null; step: number; ready: boolean };

/** Where each LHVIU field comes from: field → source workspace → source document → recorded data. */
export function buildLineage(input: CaseDetailInput): LineageRow[] {
  const { row } = input;
  const ready = (source: WorkspaceKey) => row.workspaces[source] === "COMPLETED";
  const doc = (label: string) => input.legal.documents.find((document) => document.label === label) ?? null;
  const locations = (type: string) => input.locations.filter((location) => location.type === type);
  const hsCodes = [...new Set(input.products.map((product) => product.hsCode).filter(Boolean))];
  const entry = (field: string, source: WorkspaceKey, document: string, data: string, evidence: Evidence | null, step: number): LineageRow => ({
    field,
    source,
    sourceLabel: WORKSPACE_LABELS[source],
    document,
    data: ready(source) ? data || "—" : "Menunggu handover",
    evidence: ready(source) ? evidence : null,
    step,
    ready: ready(source),
  });
  return [
    entry("Nama Perusahaan", "CR", "Formulir Permohonan", row.companyName, null, 1),
    entry("NIB", "CR", "NIB", input.legal.nib ?? row.nib, doc("NIB"), 2),
    entry("NPWP", "VF", "NPWP", input.legal.npwp ?? "—", doc("NPWP"), 2),
    entry("Alamat Kantor", "SV", "Survey Report", locations("Kantor").map((location) => location.address).join("; "), locations("Kantor")[0]?.documents[0] ?? null, 3),
    entry("Alamat Gudang", "SV", "Survey Report", locations("Gudang").map((location) => location.address).join("; "), locations("Gudang")[0]?.documents[0] ?? null, 3),
    entry("Merek", "VF", "Verification Report", input.brands.map((brand) => brand.name).join(", "), input.brands.flatMap((brand) => brand.documents)[0] ?? null, 4),
    entry("HS Code", "VF", "Verification Report", hsCodes.length ? `${hsCodes.length} HS: ${hsCodes.join(", ")}` : "", null, 5),
    entry("Modal Kerja", "VF", "Surat Pernyataan Modal Kerja", input.workingCapital.amount ?? "", input.workingCapital.statement, 9),
    entry("Approval", "PM", "Approval Record", input.pmReviews.map((review) => `${review.report}: ${review.status ?? "belum direview"}`).join("; "), null, 10),
    entry("Nomor LHVIU", "PM", "LHVIU", input.lhviu.number ?? "", input.lhviu.file, 11),
  ];
}
