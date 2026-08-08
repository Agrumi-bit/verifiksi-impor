import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

// Confirm-password matching is a client-side UX check only (resetPasswordSchema
// in the form) — the API itself only needs the new password value.
const setPasswordSchema = z.object({
  newPassword: z.string().min(8, "Password minimal 8 karakter"),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;

  if (session.user.role !== "SUPER_ADMIN") {
    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Hanya Super Admin yang bisa mereset password akun Super Admin lain" },
        { status: 403 },
      );
    }
  }

  const body = await request.json();
  const parsed = setPasswordSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  try {
    await auth.api.setUserPassword({
      body: { userId: id, newPassword: parsed.data.newPassword },
      headers: await headers(),
    });
    return NextResponse.json({ data: { status: true } });
  } catch (resetError) {
    return NextResponse.json(
      { error: resetError instanceof Error ? resetError.message : "Gagal mereset password" },
      { status: 400 },
    );
  }
}
