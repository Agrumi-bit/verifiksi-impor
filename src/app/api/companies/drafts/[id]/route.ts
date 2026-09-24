import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

async function findOwnedDraft(id: string, userId: string) {
  const draft = await db.companyDraft.findUnique({ where: { id } });
  if (!draft || draft.createdById !== userId) return null;
  return draft;
}

/** Loads one draft's full payload — used to resume a specific "Tambah Perusahaan" wizard. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const draft = await findOwnedDraft(id, userId);
  if (!draft) {
    return NextResponse.json({ error: "Draft tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: draft });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const draft = await findOwnedDraft(id, userId);
  if (!draft) {
    return NextResponse.json({ error: "Draft tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json();
  const payload = body?.payload;
  const currentStep = Number(body?.currentStep) || 1;
  if (typeof payload !== "object" || payload === null) {
    return NextResponse.json({ error: "Data draft tidak valid" }, { status: 400 });
  }

  const updated = await db.companyDraft.update({
    where: { id },
    data: { payload, currentStep },
  });

  return NextResponse.json({ data: updated });
}

/** Discards one draft — either an explicit "Hapus" from the Company List, or after successful submission. */
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  const userId = session?.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const draft = await findOwnedDraft(id, userId);
  if (!draft) {
    return NextResponse.json({ error: "Draft tidak ditemukan" }, { status: 404 });
  }

  await db.companyDraft.delete({ where: { id } });
  return NextResponse.json({ data: null });
}
