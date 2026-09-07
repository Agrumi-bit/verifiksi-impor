import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { merkStatusUpdateSchema } from "@/modules/merk/schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const { id } = await params;
  const existing = await db.merk.findFirst({ where: { id, companyId } });
  if (!existing) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  const parsed = merkStatusUpdateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const brand = await db.merk.update({
    where: { id },
    data: { status: parsed.data.status },
  });

  return NextResponse.json({ data: brand });
}
