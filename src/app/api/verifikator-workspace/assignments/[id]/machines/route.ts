import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { updateApplicationPayload } from "@/lib/application-payload";
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
  jumlahSatuan: z.string().trim().optional(),
  kapasitas: z.string().trim().optional(),
  kapasitasSatuan: z.string().trim().optional(),
  kapasitasJam: z.string().trim().optional(),
  kapasitasJamSatuan: z.string().trim().optional(),
  waktuBeroperasi: z.string().trim().optional(),
  hariEfektifPerTahun: z.string().trim().optional(),
  kondisi: z.enum(MACHINE_KONDISI_VALUES).optional(),
  power: z.string().trim().optional(),
  powerSatuan: z.string().trim().optional(),
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
      // Extra photos the verifikator has added for this machine — the applicant's original
      // (`originalPhotoMesinPath`) is shown alongside these in the UI, not repeated in here.
      photoMesinPaths: decisions[item.id]?.photoPaths ?? [],
      status: decisions[item.id]?.status ?? "PENDING",
      note: decisions[item.id]?.note ?? "",
      jumlahTerpasang: decisions[item.id]?.jumlahTerpasang ?? "",
      jumlahTidakAktif: decisions[item.id]?.jumlahTidakAktif ?? "",
      keteranganJumlah: decisions[item.id]?.keteranganJumlah ?? "",
      verifiedAt: decisions[item.id]?.verifiedAt ?? null,
    })),
  });
}

const patchSchema = z.object({
  id: z.string().min(1),
  status: z.enum(MACHINE_VERIFICATION_STATUSES).optional(),
  note: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
  photoPaths: z.array(z.string().trim()).optional(),
  jumlahTerpasang: z.string().trim().optional(),
  jumlahTidakAktif: z.string().trim().optional(),
  keteranganJumlah: z.string().trim().optional(),
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
    // Read-modify-write under a row lock — two "Simpan Data Mesin ke Aplikasi" clicks (different
    // machines, or racing an add/delete/reorder) landing within milliseconds of each other used
    // to silently clobber one another: whichever write committed last overwrote the whole
    // payload.machines array from its own stale read, discarding the other's change.
    await updateApplicationPayload(assignment.applicationId, (freshPayload) => {
      const machines = (freshPayload.machines ?? []).map((m) =>
        m.id === parsed.data.id ? { ...m, ...parsed.data.machineData } : m,
      );
      return { payload: { ...freshPayload, machines }, result: undefined };
    });
  }

  const decisions = machineVerificationsSchema.parse(assignment.machineVerifications ?? {});
  const existing = decisions[parsed.data.id];
  decisions[parsed.data.id] = {
    status: parsed.data.status ?? existing?.status ?? "PENDING",
    note: parsed.data.note ?? existing?.note,
    photoPath: parsed.data.photoPath ?? existing?.photoPath,
    photoPaths: parsed.data.photoPaths ?? existing?.photoPaths,
    jumlahTerpasang: parsed.data.jumlahTerpasang ?? existing?.jumlahTerpasang,
    jumlahTidakAktif: parsed.data.jumlahTidakAktif ?? existing?.jumlahTidakAktif,
    keteranganJumlah: parsed.data.keteranganJumlah ?? existing?.keteranganJumlah,
    verifiedAt: new Date().toISOString(),
  };

  const updated = await db.assignment.update({
    where: { id: assignment.id },
    data: { machineVerifications: decisions },
  });

  return NextResponse.json({ data: updated.machineVerifications });
}

const reorderSchema = z.object({
  orderedIds: z.array(z.string().min(1)).min(1),
});

/**
 * Drag-to-reorder in the Verifikasi Mesin table — rewrites `payload.machines`' own array order
 * (the same array every workspace reads via `buildMachineChecklist`, which preserves array
 * order), so the new sequence sticks everywhere the list is shown, not just this session.
 */
export async function PUT(
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
      { error: "Urutan mesin hanya dapat diubah saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = reorderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const { orderedIds } = parsed.data;
  const reorderResult = await updateApplicationPayload<{ ok: boolean }>(assignment.applicationId, (freshPayload) => {
    const machines = freshPayload.machines ?? [];
    const byId = new Map(machines.map((m) => [m.id, m]));
    // Must be a full permutation of the current (fresh, not the pre-lock snapshot) machine ids —
    // never silently drop or invent one.
    if (orderedIds.length !== machines.length || !orderedIds.every((mid) => byId.has(mid))) {
      return { payload: freshPayload, result: { ok: false as const } };
    }
    const reordered = orderedIds.map((mid) => byId.get(mid)!);
    return { payload: { ...freshPayload, machines: reordered }, result: { ok: true as const } };
  });
  if (!reorderResult.ok) {
    return NextResponse.json({ error: "Urutan mesin tidak valid" }, { status: 400 });
  }

  return NextResponse.json({ data: { orderedIds } });
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

  const newMachine = { id: randomUUID(), ...parsed.data };
  await updateApplicationPayload(assignment.applicationId, (freshPayload) => {
    const machines = [...(freshPayload.machines ?? []), newMachine];
    return { payload: { ...freshPayload, machines }, result: undefined };
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

  const deleteResult = await updateApplicationPayload<{ ok: boolean }>(assignment.applicationId, (freshPayload) => {
    const exists = (freshPayload.machines ?? []).some((m) => m.id === machineId);
    if (!exists) return { payload: freshPayload, result: { ok: false as const } };
    const machines = (freshPayload.machines ?? []).filter((m) => m.id !== machineId);
    return { payload: { ...freshPayload, machines }, result: { ok: true as const } };
  });
  if (!deleteResult.ok) {
    return NextResponse.json({ error: "Mesin tidak ditemukan" }, { status: 404 });
  }

  const decisions = machineVerificationsSchema.parse(assignment.machineVerifications ?? {});
  delete decisions[machineId];
  await db.assignment.update({
    where: { id: assignment.id },
    data: { machineVerifications: decisions },
  });

  return NextResponse.json({ data: { id: machineId } });
}
