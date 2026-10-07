import { NextResponse } from "next/server";
import { summarizeApplicationLocations } from "@/modules/shared/location-meta";
import type { LocationValues } from "@/modules/shared/schema";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { normalizeKonsumsiPayload } from "@/modules/applications/viu-schemes/konsumsi/normalize";
import { resyncKonsumsiProductCommodities } from "@/modules/applications/viu-schemes/konsumsi/server/backfill-hs-codes";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { EDIT_REASON_MIN_LENGTH, getAdminEditBlockReason } from "@/modules/applications/edit-rules";
import { diffApplicationPayload } from "@/modules/applications/payload-diff";
import { prepareApplicationSubmission, runApplicationSubmissionSyncs } from "@/modules/applications/server/submission";
import { submissionDateToDb } from "@/modules/applications/submission-date";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const application = await db.application.findUnique({
    where: { id },
    include: {
      assignments: { select: { status: true } },
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!application) {
    return NextResponse.json(
      { error: "Permohonan tidak ditemukan" },
      { status: 404 },
    );
  }

  // Loaded into the wizard (draft resume, Admin edit): regroup products by the CURRENT HS Code
  // master data, exactly as the server will at submit/save — see resyncKonsumsiProductCommodities.
  const payload = await resyncKonsumsiProductCommodities(normalizeKonsumsiPayload(application.payload as ApplicationWizardValues));
  const company = application.companyId
    ? await db.company.findUnique({ where: { id: application.companyId }, select: { locations: true } })
    : null;
  const locationSummaries = summarizeApplicationLocations(payload.locations, company?.locations as LocationValues[] | null);

  return NextResponse.json({ data: { ...application, payload, locationSummaries } });
}

const editRequestSchema = z.object({
  values: z.unknown(),
  reason: z.string().trim().min(EDIT_REASON_MIN_LENGTH, `Alasan perubahan minimal ${EDIT_REASON_MIN_LENGTH} karakter.`),
});

/**
 * Admin "Simpan Perubahan" — rewrites a non-draft application's payload in place. Same
 * validation and side effects as a submit (prepareApplicationSubmission /
 * runApplicationSubmissionSyncs); status and application number are left alone. The "Tanggal
 * Pengajuan" can be changed here (and is how an Admin fills it in for an application that predates
 * the field); `createdAt` is never touched. Records the change set in ApplicationAuditLog (EDIT) and tells the company via a
 * SYSTEM message. The company and verification type can't be swapped out by an edit.
 */
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const parsed = editRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { id } = await params;
  const application = await db.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }
  const blockReason = getAdminEditBlockReason(application.status);
  if (blockReason) {
    return NextResponse.json({ error: blockReason }, { status: 400 });
  }

  const prepared = await prepareApplicationSubmission(parsed.data.values, (values) => {
    if (values.verificationType !== application.verificationType) {
      return NextResponse.json({ error: "Jenis verifikasi permohonan tidak dapat diubah." }, { status: 400 });
    }
    if ((values.companyId ?? null) !== application.companyId) {
      return NextResponse.json({ error: "Perusahaan pemohon tidak dapat diubah." }, { status: 400 });
    }
    return null;
  });
  if (!prepared.ok) return prepared.response;
  const values = prepared.values;

  const changes = diffApplicationPayload(application.payload, values);
  if (changes.length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan data." }, { status: 400 });
  }

  const reason = parsed.data.reason;
  await db.$transaction([
    db.application.update({
      where: { id: application.id },
      data: {
        payload: values,
        applicationCategory: values.applicationCategory,
        submissionDate: submissionDateToDb(values.submissionDate),
      },
    }),
    db.applicationAuditLog.create({
      data: {
        applicationId: application.id,
        action: "EDIT",
        actorId: session.user.id,
        actorName: session.user.name,
        actorRole: session.user.role ?? null,
        reason,
        changedFields: changes,
      },
    }),
    db.applicationMessage.create({
      data: {
        applicationId: application.id,
        direction: "SYSTEM",
        text: `Data permohonan diperbarui oleh Admin — alasan: ${reason}`,
      },
    }),
  ]);
  await runApplicationSubmissionSyncs(application.id, values);

  return NextResponse.json({ data: { changedCount: changes.length } });
}
