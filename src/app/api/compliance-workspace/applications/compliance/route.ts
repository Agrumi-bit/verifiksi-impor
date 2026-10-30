import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireComplianceSession } from "@/lib/require-compliance-session";
import { KONSUMSI_SCHEME } from "@/modules/compliance-workspace/server/load-cases";
import { applicationMatchesViuScheme } from "@/modules/project-manager-workspace/viu-schemes";

/** Bulk actions are capped so one request can't touch an unbounded number of cases. */
const MAX_APPLICATIONS = 200;

const patchSchema = z
  .object({
    applicationIds: z.array(z.string().min(1)).min(1, "Pilih minimal satu permohonan.").max(MAX_APPLICATIONS),
    // null clears the PIC; absent leaves it unchanged.
    picUserId: z.string().min(1).nullable().optional(),
    reviewFlag: z.boolean().optional(),
  })
  .refine((value) => value.picUserId !== undefined || value.reviewFlag !== undefined, "Tidak ada perubahan.");

/**
 * Compliance's own case fields only: PIC Compliance and the "Mark for Review" flag. Creates the
 * ComplianceCase on first use and writes one audit-log entry per application that actually changed.
 * Never touches the application, its assignments or evidence.
 */
export async function PATCH(request: Request) {
  const { session, error } = await requireComplianceSession();
  if (error) return error;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid." }, { status: 400 });
  const { applicationIds, picUserId, reviewFlag } = parsed.data;

  let picName: string | null = null;
  if (picUserId) {
    const pic = await db.user.findFirst({ where: { id: picUserId, role: "COMPLIANCE", NOT: { banned: true } }, select: { name: true } });
    if (!pic) return NextResponse.json({ error: "PIC Compliance tidak ditemukan." }, { status: 400 });
    picName = pic.name;
  }

  const applications = await db.application.findMany({
    where: { id: { in: [...new Set(applicationIds)] } },
    select: {
      id: true,
      verificationType: true,
      payload: true,
      complianceCase: { select: { picUserId: true, reviewFlag: true, picUser: { select: { name: true } } } },
    },
  });
  const inScope = applications.filter((app) =>
    applicationMatchesViuScheme(app.verificationType, (app.payload as { importTypes?: string[] } | null)?.importTypes, KONSUMSI_SCHEME),
  );
  if (inScope.length !== new Set(applicationIds).size) {
    return NextResponse.json({ error: "Sebagian permohonan tidak ditemukan atau bukan VIU Barang Konsumsi." }, { status: 400 });
  }

  const now = new Date();
  const actor = { actorId: session.user.id, actorName: session.user.name, actorRole: session.user.role ?? null };
  const writes = inScope.flatMap((app) => {
    const current = app.complianceCase;
    const changes: { path: string; before: string | boolean | null; after: string | boolean | null }[] = [];
    const data: Record<string, unknown> = {};
    if (picUserId !== undefined && (current?.picUserId ?? null) !== picUserId) {
      data.picUserId = picUserId;
      changes.push({ path: "compliance.pic", before: current?.picUser?.name ?? null, after: picName });
    }
    if (reviewFlag !== undefined && (current?.reviewFlag ?? false) !== reviewFlag) {
      Object.assign(data, reviewFlag
        ? { reviewFlag: true, reviewFlaggedAt: now, reviewFlaggedByName: session.user.name }
        : { reviewFlag: false, reviewFlaggedAt: null, reviewFlaggedByName: null });
      changes.push({ path: "compliance.reviewFlag", before: current?.reviewFlag ?? false, after: reviewFlag });
    }
    if (changes.length === 0) return [];
    return [
      db.complianceCase.upsert({ where: { applicationId: app.id }, create: { applicationId: app.id, ...data }, update: data }),
      db.applicationAuditLog.create({
        data: {
          applicationId: app.id,
          action: picUserId !== undefined && changes.some((c) => c.path === "compliance.pic") ? "COMPLIANCE_ASSIGN_PIC" : "COMPLIANCE_REVIEW_FLAG",
          ...actor,
          changedFields: changes,
        },
      }),
    ];
  });

  if (writes.length > 0) await db.$transaction(writes);
  return NextResponse.json({ data: { updated: writes.length / 2 } });
}
