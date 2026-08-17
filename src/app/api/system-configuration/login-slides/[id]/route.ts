import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { LOGIN_SLIDE_STATUSES } from "@/modules/system-configuration/login-slides";

const patchSchema = z.object({
  imagePath: z.string().trim().min(1).optional(),
  label: z.string().trim().optional(),
  title: z.string().trim().min(1).optional(),
  description: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  ctaUrl: z.string().trim().optional(),
  status: z.enum(LOGIN_SLIDE_STATUSES).optional(),
  startDate: z.string().trim().nullable().optional(),
  endDate: z.string().trim().nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const existing = await db.loginSlide.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Slide tidak ditemukan" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const { startDate, endDate, ...rest } = parsed.data;
  const slide = await db.loginSlide.update({
    where: { id },
    data: {
      ...rest,
      ...(startDate !== undefined ? { startDate: startDate ? new Date(startDate) : null } : {}),
      ...(endDate !== undefined ? { endDate: endDate ? new Date(endDate) : null } : {}),
      updatedByName: session.user.name,
    },
  });

  return NextResponse.json({ data: slide });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const existing = await db.loginSlide.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Slide tidak ditemukan" }, { status: 404 });
  }

  await db.loginSlide.delete({ where: { id } });
  return NextResponse.json({ data: { id } });
}
