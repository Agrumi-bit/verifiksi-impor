import "server-only";

import { db } from "@/lib/db";

/*
 * In-app notifications (the bell in each workspace). A notification is one row per recipient; it never
 * blocks the action that raised it — a failure to notify is logged and swallowed.
 */

export type NotificationInput = {
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
  applicationId?: string | null;
};

/** The workspace roles a notification can be addressed to (admins see their own workspaces' bells too). */
export type WorkspaceRole = "CUSTOMER_RELATIONSHIP" | "SURVEYOR" | "VERIFIKATOR" | "TECHNICAL_ANALYST" | "PROJECT_MANAGER";

export async function notifyUsers(userIds: readonly (string | null | undefined)[], input: NotificationInput, options: { exclude?: string | null } = {}): Promise<void> {
  const recipients = [...new Set(userIds.filter((id): id is string => Boolean(id) && id !== options.exclude))];
  if (recipients.length === 0) return;
  try {
    await db.notification.createMany({
      data: recipients.map((userId) => ({
        userId,
        kind: input.kind,
        title: input.title,
        body: input.body ?? null,
        href: input.href ?? null,
        applicationId: input.applicationId ?? null,
      })),
    });
  } catch (error) {
    console.error("[notifications] failed to notify", input.kind, error);
  }
}

/** Every active user of the role(s) — for work waiting on a role rather than on one person. */
export async function notifyRoles(roles: readonly WorkspaceRole[], input: NotificationInput, options: { exclude?: string | null } = {}): Promise<void> {
  try {
    const users = await db.user.findMany({ where: { role: { in: [...roles] }, banned: { not: true } }, select: { id: true } });
    await notifyUsers(
      users.map((user) => user.id),
      input,
      options,
    );
  } catch (error) {
    console.error("[notifications] failed to resolve role recipients", roles, error);
  }
}
