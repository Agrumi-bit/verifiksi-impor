import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  const [applications, companies, partnerIndustri, partnerNonIndustri] =
    await Promise.all([
      db.application.count(),
      db.company.count(),
      db.partner.count({ where: { type: "INDUSTRI" } }),
      db.partner.count({ where: { type: "NON_INDUSTRI" } }),
    ]);

  return NextResponse.json({
    data: { applications, companies, partnerIndustri, partnerNonIndustri },
  });
}
