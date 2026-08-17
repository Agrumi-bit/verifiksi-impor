import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

/** Full slide list (any status) for the admin management table — distinct from the public GET on the parent route, which only returns currently-visible slides. */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const slides = await db.loginSlide.findMany({ orderBy: { order: "asc" } });
  return NextResponse.json({ data: slides });
}
