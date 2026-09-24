import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { MACHINE_VERIFICATION_STATUSES } from "@/modules/verifikator-workspace/status";
import { buildMachineChecklist, machineVerificationsSchema } from "@/modules/verifikator-workspace/schema";

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const checklist = buildMachineChecklist(payload);
  const decisions = machineVerificationsSchema.parse(assignment.machineVerifications ?? {});

  return NextResponse.json({
    data: checklist.map((item) => ({
      ...item,
      // Verifikator's own replacement photo takes precedence over the applicant's original —
      // `originalPhotoMesinPath` is kept separately so the UI can show it was replaced.
      photoMesinPath: decisions[item.id]?.photoPath || item.photoMesinPath,
      originalPhotoMesinPath: item.photoMesinPath,
      status: decisions[item.id]?.status ?? "PENDING",
      note: decisions[item.id]?.note ?? "",
      verifiedAt: decisions[item.id]?.verifiedAt ?? null,
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(MACHINE_VERIFICATION_STATUSES).optional(),
  note: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Mesin hanya dapat diverifikasi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const validIds = new Set(buildMachineChecklist(payload).map((item) => item.id));
  if (!validIds.has(parsed.data.id)) {
    return NextResponse.json({ error: "Mesin tidak dikenali" }, { status: 400 });
  }

  const decisions = machineVerificationsSchema.parse(assignment.machineVerifications ?? {});
  const existing = decisions[parsed.data.id];
  decisions[parsed.data.id] = {
    status: parsed.data.status ?? existing?.status ?? "PENDING",
    note: parsed.data.note ?? existing?.note,
    photoPath: parsed.data.photoPath ?? existing?.photoPath,
    verifiedAt: new Date().toISOString(),
  };

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: { machineVerifications: decisions },
  });

  return NextResponse.json({ data: updated.machineVerifications });
}
