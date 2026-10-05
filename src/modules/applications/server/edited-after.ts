import { db } from "@/lib/db";

export type ApplicationEditedNotice = { editedAt: string; editedByName: string | null; reason: string | null } | null;

/**
 * The latest Admin edit (ApplicationAuditLog EDIT) of an application made after an assignment was
 * created — drives the "Data permohonan diubah setelah penugasan dibuat" notice in the Surveyor,
 * Verifikator and Technical Analyst workspaces. Null when the data is unchanged since then.
 */
export async function findApplicationEditAfter(applicationId: string, since: Date): Promise<ApplicationEditedNotice> {
  const latest = await db.applicationAuditLog.findFirst({
    where: { applicationId, action: "EDIT", createdAt: { gt: since } },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true, actorName: true, reason: true },
  });
  return latest ? { editedAt: latest.createdAt.toISOString(), editedByName: latest.actorName, reason: latest.reason } : null;
}
