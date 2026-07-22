import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });

  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: company });
}
