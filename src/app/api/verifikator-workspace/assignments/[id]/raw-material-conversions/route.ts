import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { RAW_MATERIAL_CONVERSION_KATEGORI, type ApplicationWizardValues } from "@/modules/applications/schema";

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

const conversionDataSchema = z.object({
  productId: z.string().trim().min(1, "Produk wajib dipilih"),
  rawMaterialId: z.string().trim().min(1, "Bahan baku wajib dipilih"),
  kategori: z.enum(RAW_MATERIAL_CONVERSION_KATEGORI).optional(),
  volumeProduksiJumlah: z.string().trim().optional(),
  volumeProduksiSatuan: z.string().trim().optional(),
  volumeKebutuhanJumlah: z.string().trim().optional(),
  volumeKebutuhanSatuan: z.string().trim().optional(),
  rasioKonversi: z.string().trim().optional(),
  keterangan: z.string().trim().optional(),
});

/**
 * The applicant fills raw material master data (payload.rawMaterials) and the older
 * per-material usage table (payload.rawMaterialUsage), but linking each raw material to a
 * specific product with a conversion ratio (payload.rawMaterialConversions) is a step many
 * already-submitted applications never had — and Company can't revise anything post-submit.
 * Verifikator fills this gap directly here since it's real technical data they can observe
 * from the survey/product data on hand, not a fabricated figure.
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
      { error: "Rasio konversi hanya dapat diisi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = conversionDataSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const productExists = (payload.products ?? []).some((p) => p.id === parsed.data.productId);
  const rawMaterialExists = (payload.rawMaterials ?? []).some((r) => r.id === parsed.data.rawMaterialId);
  if (!productExists || !rawMaterialExists) {
    return NextResponse.json({ error: "Produk atau bahan baku tidak dikenali" }, { status: 400 });
  }

  const newEntry = { id: randomUUID(), ...parsed.data };
  const rawMaterialConversions = [...(payload.rawMaterialConversions ?? []), newEntry];

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, rawMaterialConversions } },
  });

  return NextResponse.json({ data: newEntry }, { status: 201 });
}

const patchSchema = conversionDataSchema.partial().extend({
  id: z.string().trim().min(1),
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
      { error: "Rasio konversi hanya dapat diubah saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const existing = (payload.rawMaterialConversions ?? []).find((c) => c.id === parsed.data.id);
  if (!existing) {
    return NextResponse.json({ error: "Data konversi tidak ditemukan" }, { status: 404 });
  }

  const rawMaterialConversions = (payload.rawMaterialConversions ?? []).map((c) =>
    c.id === parsed.data.id ? { ...c, ...parsed.data } : c,
  );

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, rawMaterialConversions } },
  });

  return NextResponse.json({ data: { ...existing, ...parsed.data } });
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
      { error: "Rasio konversi hanya dapat dihapus saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const conversionId = searchParams.get("conversionId");
  if (!conversionId) {
    return NextResponse.json({ error: "conversionId wajib diisi" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const rawMaterialConversions = (payload.rawMaterialConversions ?? []).filter((c) => c.id !== conversionId);

  await db.application.update({
    where: { id: assignment.applicationId },
    data: { payload: { ...payload, rawMaterialConversions } },
  });

  return NextResponse.json({ data: { id: conversionId } });
}
