import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { MACHINE_KONDISI_VALUES, type ApplicationWizardValues } from "@/modules/applications/schema";
import { MACHINE_VERIFICATION_STATUSES } from "@/modules/verifikator-workspace/status";
import { buildMachineChecklist, machineVerificationsSchema } from "@/modules/verifikator-workspace/schema";

const machineDataSchema = z.object({
  nama: z.string().trim().optional(),
  proses: z.string().trim().optional(),
  merk: z.string().trim().optional(),
  model: z.string().trim().optional(),
  tahun: z.string().trim().optional(),
  jumlah: z.string().trim().optional(),
  kapasitas: z.string().trim().optional(),
  kapasitasSatuan: z.string().trim().optional(),
  kapasitasJam: z.string().trim().optional(),
  kapasitasJamSatuan: z.string().trim().optional(),
  waktuBeroperasi: z.string().trim().optional(),
  kondisi: z.enum(MACHINE_KONDISI_VALUES).optional(),
  power: z.string().trim().optional(),
  input: z.string().trim().optional(),
  output: z.string().trim().optional(),
});

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
  // Corrections to the applicant's own machine data — written back to
  // Application.payload.machines (the source of truth every other workspace
  // reads from via buildMachineChecklist), not to machineVerifications.
  machineData: machineDataSchema.optional(),
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

  if (parsed.data.machineData) {
    const machines = (payload.machines ?? []).map((m) =>
      m.id === parsed.data.id ? { ...m, ...parsed.data.machineData } : m,
    );
    await db.application.update({
      where: { id: assignment.applicationId },
      data: { payload: { ...payload, machines } },
    });
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

/**
 * A machine the surveyor found in the field but the applicant never listed — verifikator
 * adds it directly to Application.payload.machines (same source array as PATCH edits above),
 * starting blank so nothing is fabricated on the applicant's behalf.
 */
export async function POST(
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
      { error: "Mesin hanya dapat ditambahkan saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = machineDataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const newMachine = { id: randomUUID(), ...parsed.data };
  const machines = [...(payload.machines ?? []), newMachine];

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, machines } },
  });

  return NextResponse.json({ data: newMachine }, { status: 201 });
}

export async function DELETE(
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
      { error: "Mesin hanya dapat dihapus saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const machineId = searchParams.get("machineId");
  if (!machineId) {
    return NextResponse.json({ error: "machineId wajib diisi" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const machineExists = (payload.machines ?? []).some((m) => m.id === machineId);
  if (!machineExists) {
    return NextResponse.json({ error: "Mesin tidak ditemukan" }, { status: 404 });
  }

  const machines = (payload.machines ?? []).filter((m) => m.id !== machineId);
  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, machines } },
  });

  const decisions = machineVerificationsSchema.parse(assignment.machineVerifications ?? {});
  delete decisions[machineId];
  await db.assignment.update({
    where: { id: assignment.id },
    data: { machineVerifications: decisions },
  });

  return NextResponse.json({ data: { id: machineId } });
}
