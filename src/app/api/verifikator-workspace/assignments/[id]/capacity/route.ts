import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { updateApplicationPayload } from "@/lib/application-payload";

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

const capacityDataSchema = z.object({
  jenisProduk: z.string().trim().optional(),
  kbliCode: z.string().trim().optional(),
  kbliDescription: z.string().trim().optional(),
  berdasarkanIzin: z.string().trim().optional(),
  kapasitasTerpasang: z.string().trim().optional(),
  satuan: z.string().trim().optional(),
});

/**
 * "Kapasitas Produksi Berdasarkan Perizinan" used to be auto-seeded 1:1 with each product,
 * keyed off HS Code — wrong on both counts: perizinan (izin usaha) is granted per KBLI, and one
 * KBLI (e.g. a textile spinning license) commonly covers several product variants at once. It's
 * now a free-standing list verifikator manages directly: add a row here, edit its fields via
 * /production-data (source: "capacity"), remove it via DELETE below.
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
      { error: "Kapasitas hanya dapat ditambahkan saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = capacityDataSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }

  const newRow = { id: randomUUID(), ...parsed.data };
  await updateApplicationPayload(assignment.applicationId, (payload) => {
    const capacity = [...(payload.capacity ?? []), newRow];
    return { payload: { ...payload, capacity }, result: undefined };
  });

  return NextResponse.json({ data: newRow }, { status: 201 });
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
      { error: "Kapasitas hanya dapat dihapus saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const { searchParams } = new URL(request.url);
  const capacityId = searchParams.get("capacityId");
  const legacy = searchParams.get("legacy") === "true";

  if (legacy) {
    // Bulk-clear rows left over from the old 1:1-per-product auto-seed system — they carry no
    // kbliCode of their own (KBLI was never a field back then) and now just clutter the list
    // this section was reworked to be: a manually managed set of real KBLI-based entries.
    const cleared = await updateApplicationPayload<{ removed: number }>(assignment.applicationId, (payload) => {
      const before = payload.capacity ?? [];
      const capacity = before.filter((c) => c.kbliCode);
      return { payload: { ...payload, capacity }, result: { removed: before.length - capacity.length } };
    });
    return NextResponse.json({ data: { removed: cleared.removed } });
  }

  if (!capacityId) {
    return NextResponse.json({ error: "capacityId wajib diisi" }, { status: 400 });
  }

  const result = await updateApplicationPayload<{ ok: boolean }>(assignment.applicationId, (payload) => {
    // Legacy rows (created before capacity had its own id) fall back to productId — same
    // identity buildCapacityRows/production-data already use.
    const rowId = (c: { id?: string; productId?: string }) => c.id ?? c.productId;
    const exists = (payload.capacity ?? []).some((c) => rowId(c) === capacityId);
    if (!exists) return { payload, result: { ok: false } };
    const capacity = (payload.capacity ?? []).filter((c) => rowId(c) !== capacityId);
    return { payload: { ...payload, capacity }, result: { ok: true } };
  });

  if (!result.ok) {
    return NextResponse.json({ error: "Data kapasitas tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: { id: capacityId } });
}
