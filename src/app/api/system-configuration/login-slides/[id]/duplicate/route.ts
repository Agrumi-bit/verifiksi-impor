import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error, session } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const source = await db.loginSlide.findUnique({ where: { id } });
  if (!source) {
    return NextResponse.json({ error: "Slide tidak ditemukan" }, { status: 404 });
  }

  const maxOrder = await db.loginSlide.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const duplicate = await db.loginSlide.create({
    data: {
      imagePath: source.imagePath,
      label: source.label,
      title: `${source.title} (Copy)`,
      description: source.description,
      ctaLabel: source.ctaLabel,
      ctaUrl: source.ctaUrl,
      // A duplicate always starts as DRAFT — publishing it live is a deliberate
      // admin action, never an accidental side effect of "Duplicate".
      status: "DRAFT",
      startDate: source.startDate,
      endDate: source.endDate,
      order: nextOrder,
      updatedByName: session.user.name,
    },
  });

  return NextResponse.json({ data: duplicate }, { status: 201 });
}
