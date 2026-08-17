import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { isLoginSlideCurrentlyVisible, LOGIN_SLIDE_STATUSES } from "@/modules/system-configuration/login-slides";

/**
 * GET is deliberately public (no session check) — the login page itself needs the slide
 * list before any user is authenticated. Only slides currently visible (ACTIVE + inside
 * any schedule window) are returned, already sorted by admin-defined order.
 */
export async function GET() {
  const slides = await db.loginSlide.findMany({ orderBy: { order: "asc" } });
  const visible = slides.filter((s) => isLoginSlideCurrentlyVisible(s));
  return NextResponse.json({
    data: visible.map((s) => ({
      id: s.id,
      imagePath: s.imagePath,
      label: s.label,
      title: s.title,
      description: s.description,
      ctaLabel: s.ctaLabel,
      ctaUrl: s.ctaUrl,
    })),
  });
}

const createSchema = z.object({
  imagePath: z.string().trim().min(1, "Gambar wajib diunggah"),
  label: z.string().trim().optional(),
  title: z.string().trim().min(1, "Judul wajib diisi"),
  description: z.string().trim().optional(),
  ctaLabel: z.string().trim().optional(),
  ctaUrl: z.string().trim().optional(),
  status: z.enum(LOGIN_SLIDE_STATUSES).optional(),
  startDate: z.string().trim().optional(),
  endDate: z.string().trim().optional(),
});

export async function POST(request: Request) {
  const { error, session } = await requireAdminSession();
  if (error) return error;

  const parsed = createSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const maxOrder = await db.loginSlide.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;

  const slide = await db.loginSlide.create({
    data: {
      imagePath: parsed.data.imagePath,
      label: parsed.data.label ?? "",
      title: parsed.data.title,
      description: parsed.data.description ?? "",
      ctaLabel: parsed.data.ctaLabel ?? "",
      ctaUrl: parsed.data.ctaUrl ?? "",
      status: parsed.data.status ?? "DRAFT",
      startDate: parsed.data.startDate ? new Date(parsed.data.startDate) : null,
      endDate: parsed.data.endDate ? new Date(parsed.data.endDate) : null,
      order: nextOrder,
      updatedByName: session.user.name,
    },
  });

  return NextResponse.json({ data: slide }, { status: 201 });
}
