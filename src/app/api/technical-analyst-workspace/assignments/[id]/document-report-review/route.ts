import { writePmReviewedByName } from "@/modules/verifikator-workspace/report-signoff";
import { NextResponse } from "next/server";
import { notifyReportReturned } from "@/modules/notifications/server/events";
import { z } from "zod";

import { db } from "@/lib/db";
import { isAssignmentReviewable } from "@/modules/applications/assignment-review-state";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import {
  DOCUMENT_REPORT_REVIEW_ITEMS,
  type DocumentReportReview,
} from "@/modules/technical-analyst-workspace/document-report-review";
import { readDocumentReportReview, writeDocumentReportReview } from "@/modules/technical-analyst-workspace/document-report-review-store";

/** Technical assignment owned by this analyst, plus the application's completed dokumen report (if any). */
async function loadContext(assignmentNumber: string, technicalAnalystId: string) {
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber } });
  if (!assignment || assignment.technicalReviewerId !== technicalAnalystId) return null;
  // Same rule as the TA document-report route: a reschedule can leave several dokumen rows — the
  // completed one is the real report.
  const dokumen = await db.assignment.findFirst({
    where: { applicationId: assignment.applicationId, verifikatorId: { not: null }, status: "COMPLETED" },
    select: { id: true, assignmentNumber: true, validatedAt: true },
  });
  return { assignment, dokumen };
}

/**
 * The analyst may (re)review the Laporan Verifikasi Dokumen while the technical assignment is
 * reviewable — and also whenever the verifikator has (re)submitted the report after the analyst's
 * last review (e.g. after a PM revision), even if the analysis itself is already decided. Otherwise
 * a resubmitted report could never be reviewed again.
 */
function reviewState(ctx: NonNullable<Awaited<ReturnType<typeof loadContext>>>, review: DocumentReportReview | null) {
  const submittedAt = ctx.dokumen?.validatedAt ?? null;
  const reviewedAt = review?.decidedAt ? new Date(review.decidedAt) : null;
  const resubmitted = Boolean(ctx.dokumen && submittedAt && (!review?.decision || !reviewedAt || submittedAt > reviewedAt));
  return { resubmitted, canEdit: Boolean(ctx.dokumen) && (isAssignmentReviewable(ctx.assignment) || resubmitted) };
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const { id } = await params;
  const ctx = await loadContext(id, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });

  const review = await readDocumentReportReview(ctx.assignment.id);
  const state = reviewState(ctx, review);
  return NextResponse.json({
    data: {
      review,
      reportAvailable: Boolean(ctx.dokumen),
      canEdit: state.canEdit,
      /** The verifikator (re)submitted the report after the analyst's last review. */
      resubmitted: state.resubmitted && Boolean(review?.decision),
      assignmentStatus: ctx.assignment.status,
    },
  });
}

const itemKeys = DOCUMENT_REPORT_REVIEW_ITEMS.map((item) => item.key) as [string, ...string[]];

const patchSchema = z.object({
  items: z.record(
    z.enum(itemKeys),
    z.object({ result: z.enum(["PASS", "FAIL"]).nullable(), note: z.string().trim().max(2000).nullable().optional() }),
  ),
  decision: z.enum(["VERIFIED", "REVISION", "REJECTED"]),
  note: z.string().trim().max(4000).optional(),
  verifiedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal diperiksa tidak valid"),
  confirmed: z.literal(true, { message: "Centang konfirmasi terlebih dahulu" }),
});

/** Saves the analyst's review in one go (checklist + decision) — mirrors the verifikator's field-report review submit. */
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const { id } = await params;
  const ctx = await loadContext(id, session.user.id);
  if (!ctx) return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  if (!ctx.dokumen) {
    return NextResponse.json({ error: "Laporan Verifikasi Dokumen belum disubmit verifikator." }, { status: 400 });
  }
  if (!reviewState(ctx, await readDocumentReportReview(ctx.assignment.id)).canEdit) {
    return NextResponse.json(
      { error: "Review hanya dapat dilakukan saat assignment berstatus Submitted, atau setelah verifikator mensubmit ulang laporan." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  const body = parsed.data;
  const missing = DOCUMENT_REPORT_REVIEW_ITEMS.filter((item) => !body.items[item.key]?.result);
  if (missing.length > 0) {
    return NextResponse.json({ error: `Lengkapi penilaian checklist: ${missing.map((m) => m.label).join(", ")}.` }, { status: 400 });
  }
  if (body.decision === "VERIFIED" && DOCUMENT_REPORT_REVIEW_ITEMS.some((item) => body.items[item.key]?.result === "FAIL")) {
    return NextResponse.json({ error: "Laporan tidak dapat dinyatakan Verified selama ada checklist yang Tidak Sesuai." }, { status: 400 });
  }
  if (body.decision !== "VERIFIED" && !body.note) {
    return NextResponse.json({ error: "Catatan wajib diisi untuk keputusan Revisi atau Reject." }, { status: 400 });
  }

  const review: DocumentReportReview = {
    items: Object.fromEntries(
      DOCUMENT_REPORT_REVIEW_ITEMS.map((item) => [item.key, { result: body.items[item.key]!.result, note: body.items[item.key]!.note || null }]),
    ),
    decision: body.decision,
    note: body.note || null,
    verifiedAt: body.verifiedAt,
    verifiedByName: session.user.name ?? null,
    decidedAt: new Date().toISOString(),
  };
  await writeDocumentReportReview(ctx.assignment.id, review);

  // Revisi/Reject sends the report back: reopen the verifikator's dokumen assignment (SUBMITTED =
  // editable again) with the analyst's note, and clear any PM decision on the old report. The
  // verifikator fixes the documents and re-submits; the analyst then reviews again.
  if (body.decision !== "VERIFIED") {
    await db.assignment.update({
      where: { id: ctx.dokumen.id },
      data: {
        status: "SUBMITTED",
        validatedAt: null,
        pmReviewStatus: null,
        pmReviewNote: null,
        pmReviewedAt: null,
      },
    });
    await writePmReviewedByName(ctx.dokumen.id, null);
    await notifyReportReturned(ctx.dokumen.id, session.user.name ?? "Technical Analyst", body.note, session.user.id);
  }
  return NextResponse.json({ data: review });
}
