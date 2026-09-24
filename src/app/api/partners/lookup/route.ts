import { NextResponse } from "next/server";

import { db } from "@/lib/db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const nib = searchParams.get("nib")?.trim();
  const npwp = searchParams.get("npwp")?.trim();
  const sk = searchParams.get("sk")?.trim();

  if (!nib || !npwp || !sk) {
    return NextResponse.json({ error: "NIB, NPWP, dan SK Kemenkumham wajib diisi" }, { status: 400 });
  }

  const company = await db.company.findFirst({
    where: { nibNumber: nib, npwpNumber: npwp, skNumber: sk },
    select: { id: true, companyName: true, companyType: true, apiType: true },
  });

  return NextResponse.json({ data: company });
}
