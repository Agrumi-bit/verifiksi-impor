import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

const rawMaterialDataSchema = z.object({
  jenis: z.string().trim().optional(),
  hsCode: z.string().trim().optional(),
  hsDesc: z.string().trim().optional(),
  deskripsi: z.string().trim().optional(),
  photoPath: z.string().trim().optional(),
});

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

/**
 * A raw material the applicant never listed but verifikator finds tied to a product during
 * review — added directly to Application.payload.rawMaterials, same source array every other
 * workspace reads from. No Assignment field tracks a per-raw-material verification decision
 * (unlike products/machines) — this is master data only, linked to products via the existing
 * rawMaterialConversions endpoint.
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
      { error: "Bahan baku hanya dapat ditambahkan saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = rawMaterialDataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const newRawMaterial = { id: randomUUID(), ...parsed.data };
  const rawMaterials = [...(payload.rawMaterials ?? []), newRawMaterial];

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, rawMaterials } },
  });

  return NextResponse.json({ data: newRawMaterial }, { status: 201 });
}

const patchSchema = z.object({
  id: z.string().min(1),
  rawMaterialData: rawMaterialDataSchema,
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
      { error: "Bahan baku hanya dapat diubah saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const exists = (payload.rawMaterials ?? []).some((rm) => rm.id === parsed.data.id);
  if (!exists) {
    return NextResponse.json({ error: "Bahan baku tidak ditemukan" }, { status: 404 });
  }

  const rawMaterials = (payload.rawMaterials ?? []).map((rm) =>
    rm.id === parsed.data.id ? { ...rm, ...parsed.data.rawMaterialData } : rm,
  );

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, rawMaterials } },
  });

  return NextResponse.json({ data: rawMaterials.find((rm) => rm.id === parsed.data.id) });
}

/**
 * Removes a raw material verifikator added by mistake (or corrects the applicant's own list) —
 * cascades to rawMaterialConversions and rawMaterialUsage, the two arrays keyed by
 * rawMaterialId, so nothing orphaned lingers.
 */
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
      { error: "Bahan baku hanya dapat dihapus saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const rawMaterialId = searchParams.get("rawMaterialId");
  if (!rawMaterialId) {
    return NextResponse.json({ error: "rawMaterialId wajib diisi" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const exists = (payload.rawMaterials ?? []).some((rm) => rm.id === rawMaterialId);
  if (!exists) {
    return NextResponse.json({ error: "Bahan baku tidak ditemukan" }, { status: 404 });
  }

  const rawMaterials = (payload.rawMaterials ?? []).filter((rm) => rm.id !== rawMaterialId);
  const rawMaterialConversions = (payload.rawMaterialConversions ?? []).filter(
    (c) => c.rawMaterialId !== rawMaterialId,
  );
  const rawMaterialUsage = (payload.rawMaterialUsage ?? []).filter((u) => u.rawMaterialId !== rawMaterialId);

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, rawMaterials, rawMaterialConversions, rawMaterialUsage } },
  });

  return NextResponse.json({ data: { id: rawMaterialId } });
}
