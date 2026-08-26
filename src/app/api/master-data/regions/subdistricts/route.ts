import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/**
 * Keyed by the row's own `id`, not `subdistrictId` — a small number of subdistricts (~160)
 * legitimately have more than one postal code, so `subdistrictId` alone isn't unique enough
 * to pick a single option in a form that also needs to auto-fill a postal code.
 *
 * Pass `?distinct=1` to instead get one option per `subdistrictId` (no postal code) — used by
 * the Data Wilayah admin filter, which only ever needs to filter *by* subdistrict, not resolve
 * a single postal code for it.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const districtId = Number(url.searchParams.get("districtId"));
  if (!districtId) {
    return NextResponse.json({ error: "districtId wajib diisi" }, { status: 400 });
  }

  if (url.searchParams.get("distinct")) {
    const rows = await db.indonesiaRegion.findMany({
      where: { districtId },
      distinct: ["subdistrictId"],
      select: { subdistrictId: true, subdistrictName: true },
      orderBy: { subdistrictName: "asc" },
    });
    return NextResponse.json({ data: rows.map((r) => ({ id: r.subdistrictId, name: r.subdistrictName })) });
  }

  const rows = await db.indonesiaRegion.findMany({
    where: { districtId },
    select: { id: true, subdistrictName: true, postalCode: true },
    orderBy: { subdistrictName: "asc" },
  });

  return NextResponse.json({ data: rows.map((r) => ({ id: r.id, name: r.subdistrictName, postalCode: r.postalCode })) });
}
