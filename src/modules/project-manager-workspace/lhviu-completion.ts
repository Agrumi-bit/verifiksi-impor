import { db } from "@/lib/db";

/**
 * An application is finished once its Laporan Hasil VIU is issued: when the Project Manager has
 * recorded both the Nomor and the Tanggal Terbit of the uploaded LHVIU, Application.status becomes
 * COMPLETED (with an audit log entry and a system message). Draft, returned, rejected and withdrawn
 * applications are left alone, and clearing the nomor/tanggal later does not reopen the application.
 */
const NOT_COMPLETABLE = new Set(["DRAFT", "RETURNED", "REJECTED", "WITHDRAWN", "COMPLETED"]);

export function lhviuIsIssued(document: { number?: string | null; issuedAt?: string | null } | null | undefined): boolean {
  return Boolean(document?.number?.trim() && document?.issuedAt && /^\d{4}-\d{2}-\d{2}$/.test(document.issuedAt));
}

export async function completeApplicationOnLhviu(
  applicationId: string,
  document: { number?: string | null; issuedAt?: string | null } | null | undefined,
  actor: { id: string; name?: string | null; role?: string | null },
): Promise<boolean> {
  if (!lhviuIsIssued(document)) return false;
  const application = await db.application.findUnique({ where: { id: applicationId }, select: { status: true } });
  if (!application || NOT_COMPLETABLE.has(application.status)) return false;

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
