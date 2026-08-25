import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const provinceId = Number(new URL(request.url).searchParams.get("provinceId"));
  if (!provinceId) {
    return NextResponse.json({ error: "provinceId wajib diisi" }, { status: 400 });
  }

  const rows = await db.indonesiaRegion.findMany({
    where: { provinceId },
    distinct: ["cityId"],
    select: { cityId: true, cityName: true },
    orderBy: { cityName: "asc" },
  });

  return NextResponse.json({ data: rows.map((r) => ({ id: r.cityId, name: r.cityName })) });
}
