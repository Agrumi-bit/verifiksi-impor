import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const partner = await db.partner.findUnique({ where: { id }, include: { company: true } });

  if (!partner) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: partner });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const partner = await db.partner.findUnique({ where: { id } });
  if (!partner) {
    return NextResponse.json({ error: "Partner tidak ditemukan" }, { status: 404 });
  }

  await db.partner.delete({ where: { id } });
  return NextResponse.json({ data: null });
}
