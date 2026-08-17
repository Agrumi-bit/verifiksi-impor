import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireProjectManagerSession } from "@/lib/require-project-manager-session";
import { SCHEDULE_TYPE_DEFS, type ScheduleType } from "@/modules/customer-relation-workspace/status";

const bodySchema = z.object({
  personId: z.string().trim().min(1, "Orang wajib dipilih"),
  date: z.string().trim().min(1).optional(),
});

/**
 * PM's own reassignment action — Customer Relation can only create/delete a schedule
 * (no PATCH exists there), so this is the one place personnel/date can be corrected
 * after the fact. `id` is the Assignment.id, matching the approvals route's convention.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireProjectManagerSession();
  if (error) return error;

  const { id } = await params;
  const parsed = bodySchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const assignment = await db.assignment.findUnique({ where: { id } });
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  const scheduleType = assignment.scheduleType as ScheduleType | null;
  if (!scheduleType || !(scheduleType in SCHEDULE_TYPE_DEFS)) {
    return NextResponse.json({ error: "Jenis penugasan tidak dikenali" }, { status: 400 });
  }

  const { personId, date } = parsed.data;
  const person = await db.user.findUnique({ where: { id: personId } });
  if (!person) {
    return NextResponse.json({ error: "Orang yang dipilih tidak ditemukan" }, { status: 404 });
  }
  const requiredRole = SCHEDULE_TYPE_DEFS[scheduleType].role;
  if (person.role !== requiredRole) {
    return NextResponse.json({ error: `Orang yang dipilih harus memiliki role ${requiredRole}` }, { status: 400 });
  }

  const roleField =
    scheduleType === "survey"
      ? { surveyorId: personId }
      : scheduleType === "dokumen"
        ? { verifikatorId: personId }
        : { technicalReviewerId: personId };

  const updated = await db.assignment.update({
    where: { id },
    data: { ...roleField, ...(date ? { scheduledDate: new Date(date) } : {}) },
  });

  await db.applicationMessage.create({
    data: {
      applicationId: assignment.applicationId,
      direction: "SYSTEM",
      text: `Penugasan ${SCHEDULE_TYPE_DEFS[scheduleType].label} dialihkan ke ${person.name} oleh Project Manager.`,
    },
  });

  return NextResponse.json({ data: { scheduledDate: updated.scheduledDate } });
}
