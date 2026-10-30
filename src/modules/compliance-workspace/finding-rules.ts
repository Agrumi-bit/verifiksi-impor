import { validateResolutionNote, type FindingKind } from "./consolidation";

/**
 * Temuan & Exception rules (pure): issue numbering, follow-up validation and the clarification
 * request. Compliance records status and follow-ups here; correcting the data stays with the
 * source workspace.
 */

export const FINDING_KINDS: FindingKind[] = ["OPEN", "KLARIFIKASI", "CONFLICT", "RESOLVED"];
export const FINDING_KIND_LABELS: Record<FindingKind, string> = {
  OPEN: "Open Issue",
  KLARIFIKASI: "Perlu Klarifikasi",
  CONFLICT: "Conflict Data",
  RESOLVED: "Resolved",
};

export type FindingSeverity = "RENDAH" | "SEDANG" | "TINGGI";
export const FINDING_SEVERITIES: FindingSeverity[] = ["TINGGI", "SEDANG", "RENDAH"];
export const FINDING_SEVERITY_LABELS: Record<FindingSeverity, string> = { TINGGI: "Tinggi", SEDANG: "Sedang", RENDAH: "Rendah" };

/** ISS-0001, ISS-0002, … — the next number after the highest one in use. */
export function nextIssueNumber(existing: string[]): string {
  const highest = existing.reduce((max, number) => {
    const match = /^ISS-(\d+)$/.exec(number);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);
  return `ISS-${String(highest + 1).padStart(4, "0")}`;
}

export type FollowUpInput = {
  current: { kind: FindingKind; ownerId: string | null; ownerName: string | null };
  next: { kind: FindingKind; ownerId: string | null; ownerName: string | null };
  note: string;
};

export type FollowUpResult = { ok: true; text: string; kindChanged: boolean; ownerChanged: boolean } | { ok: false; error: string };

/**
 * A follow-up must change something or add a note, and moving to Resolved needs a note of at least
 * 10 characters explaining the basis. Returns the history text ("Status A → B · Owner → X · Catatan: …").
 */
export function validateFollowUp({ current, next, note }: FollowUpInput): FollowUpResult {
  const trimmed = note.trim();
  const kindChanged = current.kind !== next.kind;
  const ownerChanged = (current.ownerId ?? null) !== (next.ownerId ?? null);
  if (next.kind === "RESOLVED" && kindChanged) {
    const error = validateResolutionNote(trimmed);
    if (error) return { ok: false, error: "Catatan dasar penyelesaian wajib diisi (min. 10 karakter) sebelum menandai Resolved." };
  }
  if (!kindChanged && !ownerChanged && !trimmed) return { ok: false, error: "Tidak ada perubahan untuk disimpan." };
  const parts: string[] = [];
  if (kindChanged) parts.push(`Status ${FINDING_KIND_LABELS[current.kind]} → ${FINDING_KIND_LABELS[next.kind]}`);
  if (ownerChanged) parts.push(`Owner → ${next.ownerName ?? "—"}`);
  if (trimmed) parts.push(`Catatan: ${trimmed}`);
  return { ok: true, text: parts.join(" · "), kindChanged, ownerChanged };
}

/**
 * "Minta klarifikasi": recorded in Compliance only (not pushed to the source workspace). A conflict
 * stays a conflict; anything else becomes Perlu Klarifikasi. A resolved finding can't be asked about.
 */
export function clarificationRequest(kind: FindingKind, sourceLabel: string): { ok: true; kind: FindingKind; text: string } | { ok: false; error: string } {
  if (kind === "RESOLVED") return { ok: false, error: "Temuan sudah Resolved." };
  return { ok: true, kind: kind === "CONFLICT" ? "CONFLICT" : "KLARIFIKASI", text: `Permintaan klarifikasi ke ${sourceLabel} dicatat.` };
}

/** The tab "Lihat Issue" opens for a case: its most serious active kind, else Resolved. */
export function issueTabFor(kinds: FindingKind[]): FindingKind {
  if (kinds.includes("CONFLICT")) return "CONFLICT";
  if (kinds.includes("OPEN")) return "OPEN";
  if (kinds.includes("KLARIFIKASI")) return "KLARIFIKASI";
  return "RESOLVED";
}
