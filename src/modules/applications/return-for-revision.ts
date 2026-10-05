import { db } from "@/lib/db";

import {
  getReturnEligibility,
  isKnownReturnSection,
  RETURN_REASON_MIN_LENGTH,
  returnSectionTitle,
  type ReturnSource,
} from "./return-rules";

type ReturnInput = {
  applicationId: string;
  source: ReturnSource;
  actor: { id: string; name?: string | null; role?: string | null };
  reason: string;
  /** Wizard step keys to fix — only offered to CR/Admin. */
  sections?: string[];
  /** Called from the Customer Relation Workspace — also moves crOutcome to "Menunggu Revisi". */
  fromCrWorkspace?: boolean;
};

type ReturnResult = { ok: true } | { ok: false; error: string; status: number };

const MESSAGE_PARTY: Record<ReturnSource, string> = {
  VERIFIKATOR: "verifikator",
  TECHNICAL_ANALYST: "technical analyst",
  CUSTOMER_RELATIONSHIP: "Customer Relationship",
  ADMIN: "Admin",
};

/**
 * The one place an application becomes RETURNED ("Kembalikan untuk Revisi"): sets the status,
 * records who/why/which sections on the Application row, posts the SYSTEM message the company
 * sees, and appends a RETURN entry to ApplicationAuditLog.
 *
 * Verifikator/Technical Analyst returns come from their own assignment decision, which already
 * validated everything it needs — those keep exactly their previous behavior (same message text,
 * no application-status or reason-length check). Customer Relationship/Admin returns are the new
 * direct action and are checked against `getReturnEligibility` + the minimum reason length.
 */
export async function returnApplicationForRevision(input: ReturnInput): Promise<ReturnResult> {
  const reason = input.reason.trim();
  const isDirectReturn = input.source === "CUSTOMER_RELATIONSHIP" || input.source === "ADMIN";
  const sections = isDirectReturn ? [...new Set(input.sections ?? [])] : [];

  const application = await db.application.findUnique({
    where: { id: input.applicationId },
    select: { id: true, status: true, assignments: { select: { status: true } } },
  });
  if (!application) return { ok: false, error: "Permohonan tidak ditemukan", status: 404 };

  if (isDirectReturn) {
    const eligibility = getReturnEligibility(
      application.status,
      application.assignments.map((a) => a.status),
    );
    if (!eligibility.allowed) return { ok: false, error: eligibility.reason, status: 400 };
    if (reason.length < RETURN_REASON_MIN_LENGTH) {
      return { ok: false, error: `Alasan pengembalian minimal ${RETURN_REASON_MIN_LENGTH} karakter.`, status: 400 };
    }
    const unknown = sections.find((key) => !isKnownReturnSection(key));
    if (unknown) return { ok: false, error: `Bagian "${unknown}" tidak dikenal.`, status: 400 };
  }

  const sectionText = sections.length > 0 ? ` (bagian: ${sections.map(returnSectionTitle).join(", ")})` : "";
  const returnedAt = new Date();

  await db.$transaction([
    db.application.update({
      where: { id: application.id },
      data: {
        status: "RETURNED",
        returnReason: reason,
        returnedAt,
        returnedById: input.actor.id,
        returnedByRole: input.source,
        returnSections: sections,
        ...(input.fromCrWorkspace ? { crOutcome: "Menunggu Revisi" } : {}),
      },
    }),
    db.applicationMessage.create({
      data: {
        applicationId: application.id,
        direction: "SYSTEM",
        text: `Permohonan dikembalikan oleh ${MESSAGE_PARTY[input.source]} untuk direvisi — alasan: ${reason}${sectionText}`,
      },
    }),
    db.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "RETURN",
        actorId: input.actor.id,
        actorName: input.actor.name ?? null,
        actorRole: input.actor.role ?? input.source,
        reason,
        sections,
        createdAt: returnedAt,
      },
    }),
  ]);

  return { ok: true };
}
