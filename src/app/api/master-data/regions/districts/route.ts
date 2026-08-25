import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cityId = Number(new URL(request.url).searchParams.get("cityId"));
  if (!cityId) {
    return NextResponse.json({ error: "cityId wajib diisi" }, { status: 400 });
  }

  const rows = await db.indonesiaRegion.findMany({
    where: { cityId },
    distinct: ["districtId"],
    select: { districtId: true, districtName: true },
    orderBy: { districtName: "asc" },
  });

  return NextResponse.json({ data: rows.map((r) => ({ id: r.districtId, name: r.districtName })) });
}
