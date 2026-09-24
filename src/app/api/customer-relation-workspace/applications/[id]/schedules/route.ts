import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";
import { createScheduleSchema } from "@/modules/customer-relation-workspace/schema";
import { SCHEDULE_TYPE_DEFS } from "@/modules/customer-relation-workspace/status";

function generateAssignmentNumber(scheduleType: string): string {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const suffix = randomUUID().split("-")[0].toUpperCase();
  return `ASG-${scheduleType.toUpperCase()}-${datePart}-${suffix}`;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id } = await params;
  const parsed = createScheduleSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const application = await db.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const { scheduleType, facility, date, personId } = parsed.data;
  const person = await db.user.findUnique({ where: { id: personId } });
  if (!person) {
    return NextResponse.json({ error: "Orang yang dipilih tidak ditemukan" }, { status: 404 });
  }
  const requiredRole = SCHEDULE_TYPE_DEFS[scheduleType].role;
  if (person.role !== requiredRole) {
    return NextResponse.json(
      { error: `Orang yang dipilih harus memiliki role ${requiredRole}` },
      { status: 400 },
    );
  }

  const roleField =
    scheduleType === "survey"
      ? { surveyorId: personId }
      : scheduleType === "dokumen"
        ? { verifikatorId: personId }
        : { technicalReviewerId: personId };

  const assignment = await db.assignment.create({
    data: {
      assignmentNumber: generateAssignmentNumber(scheduleType),
      applicationId: id,
      scheduleType,
      location: facility || null,
      scheduledDate: new Date(date),
      ...roleField,
    },
  });

  const def = SCHEDULE_TYPE_DEFS[scheduleType];
  const messageText = `Jadwal ditambahkan: ${def.label}${facility ? " — " + facility : ""} pada ${date} oleh ${person.name}`;
  await db.applicationMessage.create({
    data: { applicationId: id, direction: "SYSTEM", text: messageText },
  });

  return NextResponse.json({ data: assignment }, { status: 201 });
}
