import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mitra = await db.mitra.findUnique({ where: { id } });

  if (!mitra) {
    return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: mitra });
}
