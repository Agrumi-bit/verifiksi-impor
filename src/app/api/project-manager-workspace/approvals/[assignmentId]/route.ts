import { writePmReviewedByName } from "@/modules/verifikator-workspace/report-signoff";
import { NextResponse } from "next/server";
import { z } from "zod";

import { assignmentDateFromInput, assignmentDateKey } from "@/lib/assignment-date";
import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { APPROVAL_CATEGORIES } from "@/modules/project-manager-workspace/status";
import { collectApplicationVisits, isAssignmentSurveyComplete, type SurveyPayloadLocation } from "@/modules/shared/survey-visit-scope";

const patchSchema = z.object({
  category: z.enum(APPROVAL_CATEGORIES),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().optional(),
  /** "Tanggal Review" (YYYY-MM-DD) chosen by the PM — prints as the report's TANGGAL TERBIT.
   * Defaults to today; never in the future. */
  reviewedAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal review tidak valid")
    .optional(),
});

const CATEGORY_SCHEDULE_TYPE: Record<string, string> = {
  laporanSurvey: "survey",
  laporanVerifikasi: "dokumen",
  laporanTeknis: "technical",
};

/**
 * PM's Approve/Reject action on one of the 4 real approval categories. `assignmentId` is the
 * Assignment.id (not assignmentNumber — the dashboard already has the row loaded, no extra
 * lookup needed). Surat Tugas reuses the existing `letterStatus` enum (DRAFT/PENDING/APPROVED —
 * no REJECTED value, so a reject reverts to DRAFT and records why in `letterReviewNote`, kicking
 * the letter back to Customer Relation). The other 3 categories write the new
 * pmReviewStatus/pmReviewNote/pmReviewedAt fields, gated on the same readiness rule the dashboard
 * uses to decide an item is actually pending (never act on something not actually ready).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string }> },
) {
  const { session, error } = await requireProjectManagerSession();
  if (error) return error;

  const { assignmentId } = await params;
  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }
  if (parsed.data.decision === "REJECTED" && !parsed.data.note?.trim()) {
    return NextResponse.json({ error: "Catatan penolakan wajib diisi" }, { status: 400 });
  }

  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { application: { select: { payload: true } } },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const { category, decision, note } = parsed.data;

  if (category === "suratTugas") {
    if (assignment.letterStatus === "APPROVED") {
      return NextResponse.json({ error: "Surat Tugas ini sudah disetujui." }, { status: 400 });
    }
    // PM can approve directly from DRAFT (without waiting for Customer Relation's own
    // "Ajukan ke Project Manager" step) — mirrors the same fallback numbering scheme
    // `submit-letter` uses, so an approved letter always ends up with a real number.
    const letterNumber = assignment.letterNumber ?? `ST/${assignment.id.slice(-6).toUpperCase()}/${new Date().getFullYear()}`;
    const updated = await db.assignment.update({
      where: { id: assignmentId },
      data:
        decision === "APPROVED"
          ? { letterStatus: "APPROVED", letterNumber, letterReviewNote: null }
          : { letterStatus: "DRAFT", letterReviewNote: note },
    });
    return NextResponse.json({ data: { letterStatus: updated.letterStatus, letterNumber: updated.letterNumber, letterReviewNote: updated.letterReviewNote } });
  }

  const expectedScheduleType = CATEGORY_SCHEDULE_TYPE[category];
  if (assignment.scheduleType !== expectedScheduleType) {
    return NextResponse.json({ error: "Kategori tidak sesuai dengan jenis penugasan ini." }, { status: 400 });
  }
  if (assignment.pmReviewStatus) {
    return NextResponse.json({ error: "Laporan ini sudah direview." }, { status: 400 });
  }
  // Ready when this assignment's own location(s) each have a COMPLETED survey result — the result
  // belongs to the application location, whichever assignment recorded it.
  const siblings = category === "laporanSurvey"
    ? await db.assignment.findMany({
        where: { applicationId: assignment.applicationId },
        select: { assignmentNumber: true, pmReviewStatus: true, locationVisits: true },
      })
    : [];
  const isReady =
    category === "laporanSurvey"
      ? isAssignmentSurveyComplete(
          assignment,
          collectApplicationVisits(siblings),
          (assignment.application.payload as { locations?: SurveyPayloadLocation[] } | null)?.locations ?? [],
        )
      : assignment.status === "COMPLETED";
  if (!isReady) {
    return NextResponse.json({ error: "Laporan ini belum siap untuk direview." }, { status: 400 });
  }

  const reviewedAtKey = parsed.data.reviewedAt;
  if (reviewedAtKey && reviewedAtKey > assignmentDateKey(new Date())) {
    return NextResponse.json({ error: "Tanggal review tidak boleh melebihi hari ini." }, { status: 400 });
  }
  const reviewedAtDate = reviewedAtKey ? assignmentDateFromInput(reviewedAtKey) : new Date();

  const updated = await db.assignment.update({
    where: { id: assignmentId },
    data: { pmReviewStatus: decision, pmReviewNote: note ?? null, pmReviewedAt: reviewedAtDate },
  });

  await writePmReviewedByName(assignmentId, session.user.name ?? null);

  return NextResponse.json({ data: { pmReviewStatus: updated.pmReviewStatus, pmReviewNote: updated.pmReviewNote } });
}
