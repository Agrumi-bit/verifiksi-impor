import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { updateUserStatusSchema } from "@/modules/users/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  if (id === session.user.id) {
    return NextResponse.json({ error: "Tidak bisa mengubah status akun sendiri" }, { status: 400 });
  }

  if (session.user.role !== "SUPER_ADMIN") {
    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Hanya Super Admin yang bisa mengubah status akun Super Admin lain" },
        { status: 403 },
      );
    }
  }

  const body = await request.json();
  const parsed = updateUserStatusSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    const requestHeaders = await headers();
    if (parsed.data.banned) {
      await auth.api.banUser({
        body: { userId: id, banReason: parsed.data.banReason || undefined },
        headers: requestHeaders,
      });
    } else {
      await auth.api.unbanUser({
        body: { userId: id },
        headers: requestHeaders,
      });
    }
    return NextResponse.json({ data: { status: true } });
  } catch (statusError) {
    return NextResponse.json(
      { error: statusError instanceof Error ? statusError.message : "Gagal mengubah status pengguna" },
      { status: 400 },
    );
  }
}
