import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { createUserSchema } from "@/modules/users/schema";

export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      emailVerified: true,
      banned: true,
      companyId: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ data: users });
}

export async function POST(request: Request) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { name, email, password, role } = parsed.data;

  if (role === "SUPER_ADMIN" && session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Hanya Super Admin yang bisa membuat akun Super Admin" },
      { status: 403 },
    );
  }

  try {
    // Goes through the admin plugin's createUser (not the public signUpEmail)
    // so the access-control role map in src/lib/auth.ts is actually consulted
    // and the role is set atomically at creation instead of a follow-up update.
    const result = await auth.api.createUser({
      body: { name, email, password, role },
      headers: await headers(),
    });
    return NextResponse.json(
      { data: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role } },
      { status: 201 },
    );
  } catch (signUpError) {
    return NextResponse.json(
      {
        error:
          signUpError instanceof Error
            ? signUpError.message
            : "Gagal membuat pengguna baru",
      },
      { status: 400 },
    );
  }
}
