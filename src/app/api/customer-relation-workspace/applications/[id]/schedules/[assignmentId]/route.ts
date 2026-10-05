import { NextResponse } from "next/server";
import { z } from "zod";

import { assignmentDateFromInput, assignmentDateKey, formatAssignmentDate } from "@/lib/assignment-date";
import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";

const patchSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
  reason: z.string().trim().max(500).optional(),
});

const REPORT_JSON_FIELDS = ["officeVerification", "warehouseVerification", "factoryVerification"] as const;

/**
 * Changes an assignment's Tanggal Penugasan (`scheduledDate`) — allowed until the assignment is
 * COMPLETED; past dates are fine (backdated assignments). The change is kept in the application's
 * history (audit log "SCHEDULE_DATE") and announced as a system message. Location visits and the
 * surveyor's report drafts that still carried the old date follow the new one.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { session, error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id, assignmentId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Tanggal tidak valid" }, { status: 400 });
  }
  const assignment = await db.assignment.findUnique({
    where: { id: assignmentId },
    include: { locationVisits: true },
  });
  if (!assignment || assignment.applicationId !== id) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status === "COMPLETED") {
    return NextResponse.json({ error: "Penugasan sudah selesai; tanggalnya tidak dapat diubah." }, { status: 409 });
  }

  const { date, reason } = parsed.data;
  const oldKey = assignmentDateKey(assignment.scheduledDate);
  if (oldKey === date) {
    return NextResponse.json({ data: { unchanged: true } });
  }
  const newDate = assignmentDateFromInput(date);
  const user = session!.user;
  const notice = `Tanggal penugasan ${assignment.assignmentNumber} diubah dari ${oldKey ? formatAssignmentDate(oldKey, "long") : "(belum ada)"} menjadi ${formatAssignmentDate(date, "long")} oleh ${user.name}`;

  await db.$transaction([
    db.assignment.update({ where: { id: assignmentId }, data: { scheduledDate: newDate } }),
    ...assignment.locationVisits.map((visit) => {
      const data: Record<string, unknown> = {};
      if (!visit.scheduledDate || assignmentDateKey(visit.scheduledDate) === oldKey) data.scheduledDate = newDate;
      for (const field of REPORT_JSON_FIELDS) {
        const report = visit[field] as { assignedDate?: string } | null;
        if (report && (!report.assignedDate || report.assignedDate === oldKey)) data[field] = { ...report, assignedDate: date };
      }
      return db.locationVisit.update({ where: { id: visit.id }, data });
    }),
    db.applicationAuditLog.create({
      data: {
        applicationId: id,
        action: "SCHEDULE_DATE",
        actorId: user.id,
        actorName: user.name,
        actorRole: user.role ?? null,
        reason: reason ? `${notice}. Alasan: ${reason}` : notice,
        changedFields: [{ path: `assignments.${assignment.assignmentNumber}.scheduledDate`, before: oldKey || null, after: date }],
      },
    }),
    db.applicationMessage.create({
      data: { applicationId: id, direction: "SYSTEM", text: reason ? `${notice}. Alasan: ${reason}` : notice },
    }),
  ]);

  return NextResponse.json({ data: { scheduledDate: newDate.toISOString() } });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; assignmentId: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id, assignmentId } = await params;
  const assignment = await db.assignment.findUnique({ where: { id: assignmentId } });
  if (!assignment || assignment.applicationId !== id) {
    return NextResponse.json({ error: "Jadwal tidak ditemukan" }, { status: 404 });
  }

  await db.assignment.delete({ where: { id: assignmentId } });
  return NextResponse.json({ data: null });
}
