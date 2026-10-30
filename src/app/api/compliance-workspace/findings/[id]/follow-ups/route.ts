import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireComplianceSession } from "@/lib/require-compliance-session";
import { FINDING_KINDS, clarificationRequest, validateFollowUp } from "@/modules/compliance-workspace/finding-rules";
import { complianceUserName } from "@/modules/compliance-workspace/server/findings";
import { WORKSPACE_LABELS, type WorkspaceKey } from "@/modules/compliance-workspace/workspace-status";
import type { FindingKind } from "@/modules/compliance-workspace/consolidation";

const followUpSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("follow-up"),
    kind: z.enum(FINDING_KINDS as [FindingKind, ...FindingKind[]]),
    ownerId: z.string().min(1).nullable(),
    note: z.string().max(2000).default(""),
  }),
  z.object({ action: z.literal("clarify") }),
]);

/**
 * Tindak lanjut of a finding: a status/owner change and/or a note ("follow-up"), or a clarification
 * request to the source workspace ("clarify") — recorded here only, never pushed to that workspace.
 * Appends to the follow-up history and the application's audit log.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireComplianceSession();
  if (error) return error;

  const parsed = followUpSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });

  const { id } = await params;
  const finding = await db.complianceIssue.findUnique({
    where: { id },
    select: { id: true, issueNumber: true, applicationId: true, kind: true, ownerId: true, sourceWorkspace: true, owner: { select: { name: true } } },
  });
  if (!finding) return NextResponse.json({ error: "Temuan tidak ditemukan." }, { status: 404 });

  const current = { kind: finding.kind, ownerId: finding.ownerId, ownerName: finding.owner?.name ?? null };
  let next = current;
  let text: string;
  if (parsed.data.action === "clarify") {
    const source = WORKSPACE_LABELS[finding.sourceWorkspace as WorkspaceKey] ?? finding.sourceWorkspace;
    const result = clarificationRequest(finding.kind, source);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    next = { ...current, kind: result.kind };
    text = result.text;
  } else {
    const { kind, ownerId, note } = parsed.data;
    const ownerName = ownerId ? await complianceUserName(ownerId) : null;
    if (ownerId && !ownerName) return NextResponse.json({ error: "Owner harus user Compliance yang aktif." }, { status: 400 });
    next = { kind, ownerId, ownerName };
    const result = validateFollowUp({ current, next, note });
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    text = result.text;
  }

  await db.$transaction([
    db.complianceIssue.update({ where: { id: finding.id }, data: { kind: next.kind, ownerId: next.ownerId } }),
    db.complianceIssueFollowUp.create({
      data: { issueId: finding.id, status: next.kind, note: text, actorId: session.user.id, actorName: session.user.name },
    }),
    db.applicationAuditLog.create({
      data: {
        applicationId: finding.applicationId,
        action: "COMPLIANCE_FINDING_FOLLOW_UP",
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        reason: `${finding.issueNumber}: ${text}`,
        changedFields: current.kind !== next.kind ? [{ path: `compliance.finding.${finding.issueNumber}.status`, before: current.kind, after: next.kind }] : undefined,
      },
    }),
  ]);
  return NextResponse.json({ data: { kind: next.kind, text } });
}
