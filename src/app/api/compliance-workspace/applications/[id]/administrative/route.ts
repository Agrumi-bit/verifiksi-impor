import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireComplianceSession } from "@/lib/require-compliance-session";
import { COMPLIANCE_STATUS_LABELS } from "@/modules/compliance-workspace/consolidation";
import { administrativeBlocker, buildDossier, nextComplianceStatus } from "@/modules/compliance-workspace/dossier";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";

const patchSchema = z.object({
  check: z.enum(["finalReviewDone", "dossierComplete"]),
  value: z.boolean(),
});

const CHECK_LABELS = { finalReviewDone: "Final Review Compliance", dossierComplete: "Dossier lengkap" } as const;

/**
 * The two administrative LPV checks (Final Review, Dossier lengkap) — Compliance's own record on its
 * ComplianceCase, never the application. Marking is guarded by the same rules the page shows
 * (administrativeBlocker); the compliance status follows (nextComplianceStatus). Audited.
 */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireComplianceSession();
  if (error) return error;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  const { check, value } = parsed.data;

  const { id } = await params;
  const detail = await loadCaseDetail(id);
  if (!detail) return NextResponse.json({ error: "Permohonan tidak ditemukan atau bukan VIU Barang Konsumsi." }, { status: 404 });

  if (value) {
    const blocker = administrativeBlocker(check, detail, buildDossier(detail));
    if (blocker) return NextResponse.json({ error: blocker }, { status: 400 });
  }

  const current = await db.complianceCase.findUnique({ where: { applicationId: id }, select: { finalReviewDone: true, dossierComplete: true, complianceStatus: true } });
  const before = { finalReviewDone: current?.finalReviewDone ?? false, dossierComplete: current?.dossierComplete ?? false };
  if (before[check] === value) return NextResponse.json({ data: { complianceStatus: current?.complianceStatus ?? "BELUM_DIREVIEW" } });

  const after = { ...before, [check]: value };
  const previousStatus = current?.complianceStatus ?? "BELUM_DIREVIEW";
  const complianceStatus = nextComplianceStatus(previousStatus, after, detail.row.lhviuIssued);
  const now = new Date();
  const stamp =
    check === "finalReviewDone"
      ? { finalReviewDone: value, finalReviewAt: value ? now : null, finalReviewByName: value ? session.user.name : null }
      : { dossierComplete: value, dossierCompleteAt: value ? now : null, dossierCompleteByName: value ? session.user.name : null };
  const data = { ...stamp, complianceStatus };

  const changedFields: { path: string; before: string | boolean; after: string | boolean }[] = [
    { path: `compliance.${check}`, before: before[check], after: value },
  ];
  if (complianceStatus !== previousStatus) {
    changedFields.push({ path: "compliance.status", before: COMPLIANCE_STATUS_LABELS[previousStatus], after: COMPLIANCE_STATUS_LABELS[complianceStatus] });
  }

  await db.$transaction([
    db.complianceCase.upsert({ where: { applicationId: id }, create: { applicationId: id, ...data }, update: data }),
    db.applicationAuditLog.create({
      data: {
        applicationId: id,
        action: "COMPLIANCE_ADMIN_CHECK",
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        reason: `${CHECK_LABELS[check]} ${value ? "ditandai" : "dibatalkan"}`,
        changedFields,
      },
    }),
  ]);
  return NextResponse.json({ data: { complianceStatus } });
}
