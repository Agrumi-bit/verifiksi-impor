import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireCompanyAccess } from "@/lib/require-company-access";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Read by the application wizard (Admin, and the applicant's own company account) — was open
  // to anyone before.
  const { error } = await requireCompanyAccess(id);
  if (error) return error;

  const company = await db.company.findUnique({
    where: { id },
    include: {
      applications: {
        select: { id: true, applicationNumber: true, verificationType: true, status: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({ data: company });
}
