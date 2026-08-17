import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getBrandingSettings, BRANDING_ID } from "@/lib/get-branding";
import { requireAdminSession } from "@/lib/require-admin-session";

/**
 * GET is deliberately public (no session check) — the login page needs the app
 * name/logo/color before any user is authenticated.
 */
export async function GET() {
  const branding = await getBrandingSettings();
  return NextResponse.json({ data: branding });
}

const hexColor = z.string().trim().regex(/^#[0-9a-fA-F]{6}$/, "Warna harus format hex, contoh #e0662e");

const patchSchema = z.object({
  appName: z.string().trim().min(1),
  appSubtitle: z.string().trim().min(1),
  sidebarBrandTitle: z.string().trim().min(1),
  sidebarBrandSubtitle: z.string().trim().min(1),
  logoPath: z.string().trim().min(1).nullable(),
  primaryColor: hexColor,
  primaryColorForeground: hexColor,
});

export async function PATCH(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Data tidak valid" }, { status: 400 });
  }

  const branding = await db.brandingSettings.upsert({
    where: { id: BRANDING_ID },
    update: parsed.data,
    create: { id: BRANDING_ID, ...parsed.data },
  });

  return NextResponse.json({ data: branding });
}
