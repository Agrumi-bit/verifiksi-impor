import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

const reorderSchema = z.object({
  // Full ordered list of slide ids — index in the array becomes the new `order` value.
  ids: z.array(z.string().trim().min(1)).min(1),
});

export async function PATCH(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const parsed = reorderSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const existingCount = await db.loginSlide.count({ where: { id: { in: parsed.data.ids } } });
  if (existingCount !== parsed.data.ids.length) {
    return NextResponse.json({ error: "Daftar slide tidak sesuai" }, { status: 400 });
  }

  await db.$transaction(
    parsed.data.ids.map((id, index) => db.loginSlide.update({ where: { id }, data: { order: index } })),
  );

  return NextResponse.json({ data: { ok: true } });
}
