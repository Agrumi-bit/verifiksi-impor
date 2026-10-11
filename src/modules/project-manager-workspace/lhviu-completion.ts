import { db } from "@/lib/db";

/**
 * An application is finished once its Laporan Hasil VIU is issued: when the Project Manager has
 * recorded both the Nomor and the Tanggal Terbit of the uploaded LHVIU, Application.status becomes
 * COMPLETED (with an audit log entry and a system message). Draft, returned, rejected and withdrawn
 * applications are left alone, and clearing the nomor/tanggal later does not reopen the application.
 *
 * The Project Manager can cancel a completion ("Batalkan Completed", e.g. when the LHVIU was recorded
 * before the other reports were approved): the status goes back to what it was before, and opening
 * the LHVIU tab no longer completes it again — only saving the LHVIU nomor/tanggal or PDF again does.
 */
const NOT_COMPLETABLE = new Set(["DRAFT", "RETURNED", "REJECTED", "WITHDRAWN", "COMPLETED"]);

type Actor = { id: string; name?: string | null; role?: string | null };

export function lhviuIsIssued(document: { number?: string | null; issuedAt?: string | null } | null | undefined): boolean {
  return Boolean(document?.number?.trim() && document?.issuedAt && /^\d{4}-\d{2}-\d{2}$/.test(document.issuedAt));
}

/** Whether the latest completion event of the application is a cancellation. */
async function completionWasCancelled(applicationId: string): Promise<boolean> {
  const last = await db.applicationAuditLog.findFirst({
    where: { applicationId, action: { in: ["COMPLETE", "UNCOMPLETE"] } },
    orderBy: { createdAt: "desc" },
    select: { action: true },
  });
  return last?.action === "UNCOMPLETE";
}

export async function completeApplicationOnLhviu(
  applicationId: string,
  document: { number?: string | null; issuedAt?: string | null } | null | undefined,
  actor: Actor,
  /** Set for the automatic sync on opening the LHVIU tab: a cancelled completion stays cancelled. */
  options: { respectCancel?: boolean } = {},
): Promise<boolean> {
  if (!lhviuIsIssued(document)) return false;
  const application = await db.application.findUnique({ where: { id: applicationId }, select: { status: true } });
  if (!application || NOT_COMPLETABLE.has(application.status)) return false;
  if (options.respectCancel && (await completionWasCancelled(applicationId))) return false;

  const number = document!.number!.trim();
  const issuedAt = document!.issuedAt!;
  await db.$transaction([
    db.application.update({ where: { id: applicationId }, data: { status: "COMPLETED" } }),
    db.applicationAuditLog.create({
      data: {
        applicationId,
        action: "COMPLETE",
        actorId: actor.id,
        actorName: actor.name ?? null,
        actorRole: actor.role ?? "PROJECT_MANAGER",
        reason: `LHVIU Nomor ${number}, tanggal terbit ${issuedAt}`,
        // The status before completion, so a cancellation can restore it.
        changedFields: [{ path: "status", before: application.status, after: "COMPLETED" }],
      },
    }),
    db.applicationMessage.create({
      data: {
        applicationId,
        direction: "SYSTEM",
        text: `Permohonan selesai — Laporan Hasil VIU Nomor ${number} tanggal terbit ${issuedAt} telah dicatat oleh Project Manager.`,
      },
    }),
  ]);
  return true;
}

/**
 * "Batalkan Completed": puts a COMPLETED application back to the status it had before completion
 * (SUBMITTED when that is unknown) so the remaining reports can still be reviewed. The LHVIU PDF,
 * nomor and tanggal stay recorded.
 */
export async function cancelApplicationCompletion(
  applicationId: string,
  actor: Actor,
  reason: string,
): Promise<{ ok: true; status: string } | { ok: false; error: string }> {
  const application = await db.application.findUnique({ where: { id: applicationId }, select: { status: true } });
  if (!application) return { ok: false, error: "Aplikasi tidak ditemukan" };
  if (application.status !== "COMPLETED") return { ok: false, error: "Permohonan tidak berstatus Completed." };

  const lastComplete = await db.applicationAuditLog.findFirst({
    where: { applicationId, action: "COMPLETE" },
    orderBy: { createdAt: "desc" },
    select: { changedFields: true },
  });
  const before = (lastComplete?.changedFields as { path?: string; before?: string }[] | null)?.find((c) => c.path === "status")?.before;
  const restored = before && !NOT_COMPLETABLE.has(before) ? before : "SUBMITTED";

  await db.$transaction([
    db.application.update({ where: { id: applicationId }, data: { status: restored as "SUBMITTED" } }),
    db.applicationAuditLog.create({
      data: {
        applicationId,
        action: "UNCOMPLETE",
        actorId: actor.id,
        actorName: actor.name ?? null,
        actorRole: actor.role ?? "PROJECT_MANAGER",
        reason,
        changedFields: [{ path: "status", before: "COMPLETED", after: restored }],
      },
    }),
    db.applicationMessage.create({
      data: {
        applicationId,
        direction: "SYSTEM",
        text: `Status Completed dibatalkan oleh Project Manager — alasan: ${reason}`,
      },
    }),
  ]);
  return { ok: true, status: restored };
}
