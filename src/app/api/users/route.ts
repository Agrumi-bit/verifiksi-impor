import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createUserSchema } from "@/modules/users/schema";

export async function GET() {
  const users = await db.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      emailVerified: true,
      createdAt: true,
    },
  });
  return NextResponse.json({ data: users });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const { name, email, password, role } = parsed.data;

  try {
    const result = await auth.api.signUpEmail({
      body: { name, email, password },
    });
    const user = await db.user.update({
      where: { id: result.user.id },
      data: { role },
      select: { id: true, name: true, email: true, role: true },
    });
    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Gagal membuat pengguna baru",
      },
      { status: 400 },
    );
  }
}
