import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  const [applications, companies, mitraIndustri, mitraNonIndustri] =
    await Promise.all([
      db.application.count(),
      db.company.count(),
      db.mitra.count({ where: { type: "INDUSTRI" } }),
      db.mitra.count({ where: { type: "NON_INDUSTRI" } }),
    ]);

  return NextResponse.json({
    data: { applications, companies, mitraIndustri, mitraNonIndustri },
  });
}
