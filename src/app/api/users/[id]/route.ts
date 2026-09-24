import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { ADMIN_ROLES, requireAdminSession } from "@/lib/require-admin-session";
import { updateUserProfileSchema } from "@/modules/users/schema";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const user = await db.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      banned: true,
      banReason: true,
      companyId: true,
      company: { select: { companyName: true } },
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateUserProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;

  if (id === session.user.id && values.role && !ADMIN_ROLES.includes(values.role)) {
    return NextResponse.json(
      { error: "Tidak bisa mengubah role akun sendiri keluar dari Admin/Super Admin" },
      { status: 400 },
    );
  }

  // SUPER_ADMIN is a strictly higher trust tier than ADMIN: only a SUPER_ADMIN
  // may promote someone to SUPER_ADMIN or modify an existing SUPER_ADMIN account.
  if (session.user.role !== "SUPER_ADMIN") {
    if (values.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Hanya Super Admin yang bisa menetapkan role Super Admin" },
        { status: 403 },
      );
    }
    const target = await db.user.findUnique({ where: { id }, select: { role: true } });
    if (target?.role === "SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Hanya Super Admin yang bisa mengubah akun Super Admin lain" },
        { status: 403 },
      );
    }
  }

  // Distinguish "field omitted" (undefined -> leave untouched) from
  // "field explicitly cleared" (empty string -> null) for optional columns.
  const nullableOrUndefined = (value: string | undefined) =>
    value === undefined ? undefined : value || null;

  try {
    const user = await db.user.update({
      where: { id },
      data: {
        name: values.name,
        username: nullableOrUndefined(values.username),
        email: values.email,
        // Changing the email invalidates the previous verification — a
        // reassigned address hasn't actually been confirmed by its new owner.
        emailVerified: values.email ? false : undefined,
        phone: nullableOrUndefined(values.phone),
        companyId: nullableOrUndefined(values.companyId),
        role: values.role,
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        phone: true,
        role: true,
        companyId: true,
      },
    });
    return NextResponse.json({ data: user });
  } catch (updateError) {
    if (updateError instanceof Prisma.PrismaClientKnownRequestError) {
      if (updateError.code === "P2002") {
        return NextResponse.json({ error: "Email atau username sudah digunakan" }, { status: 409 });
      }
      if (updateError.code === "P2025") {
        return NextResponse.json({ error: "Pengguna tidak ditemukan" }, { status: 404 });
      }
      if (updateError.code === "P2003") {
        return NextResponse.json({ error: "Perusahaan yang dipilih tidak valid" }, { status: 400 });
      }
    }
    return NextResponse.json({ error: "Gagal menyimpan perubahan" }, { status: 400 });
  }
}
