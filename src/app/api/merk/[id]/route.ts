import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const merk = await db.merk.findUnique({ where: { id } });

  if (!merk) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: merk });
}
