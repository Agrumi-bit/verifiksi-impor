import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { APPROVAL_CATEGORIES } from "@/modules/project-manager-workspace/status";

const patchSchema = z.object({
  category: z.enum(APPROVAL_CATEGORIES),
  decision: z.enum(["APPROVED", "REJECTED"]),
  note: z.string().trim().optional(),
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
  const { error } = await requireProjectManagerSession();
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
    include: { locationVisits: { select: { status: true } } },
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
  const isReady =
    category === "laporanSurvey"
      ? assignment.locationVisits.length > 0 && assignment.locationVisits.every((v) => v.status === "COMPLETED")
      : assignment.status === "COMPLETED";
  if (!isReady) {
    return NextResponse.json({ error: "Laporan ini belum siap untuk direview." }, { status: 400 });
  }

  const updated = await db.assignment.update({
    where: { id: assignmentId },
    data: { pmReviewStatus: decision, pmReviewNote: note ?? null, pmReviewedAt: new Date() },
  });

  return NextResponse.json({ data: { pmReviewStatus: updated.pmReviewStatus, pmReviewNote: updated.pmReviewNote } });
}
