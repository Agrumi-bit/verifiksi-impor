import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const application = await db.application.findUnique({ where: { id } });

  if (!application) {
    return NextResponse.json(
      { error: "Permohonan tidak ditemukan" },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: application });
}
