import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/**
 * Keyed by the row's own `id`, not `subdistrictId` — a small number of subdistricts (~160)
 * legitimately have more than one postal code, so `subdistrictId` alone isn't unique enough
 * to pick a single option in the UI.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const districtId = Number(new URL(request.url).searchParams.get("districtId"));
  if (!districtId) {
    return NextResponse.json({ error: "districtId wajib diisi" }, { status: 400 });
  }

  const rows = await db.indonesiaRegion.findMany({
    where: { districtId },
    select: { id: true, subdistrictName: true, postalCode: true },
    orderBy: { subdistrictName: "asc" },
  });

  return NextResponse.json({ data: rows.map((r) => ({ id: r.id, name: r.subdistrictName, postalCode: r.postalCode })) });
}
