import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rows = await db.indonesiaRegion.findMany({
    distinct: ["provinceId"],
    select: { provinceId: true, provinceName: true },
    orderBy: { provinceName: "asc" },
  });

  return NextResponse.json({ data: rows.map((r) => ({ id: r.provinceId, name: r.provinceName })) });
}
