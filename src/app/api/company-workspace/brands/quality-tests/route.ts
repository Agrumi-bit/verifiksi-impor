import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/** Company-scoped counterpart to /api/merk/quality-tests. */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const qualityTests = await db.brandQualityTest.findMany({
    where: { merk: { companyId } },
    orderBy: { issueDate: "desc" },
    include: {
      merk: { select: { id: true, brandName: true } },
      commodityGroup: { select: { name: true } },
      commoditySubGroup: { select: { name: true } },
    },
  });

  return NextResponse.json({
    data: qualityTests.map((qt) => ({
      id: qt.id,
      brandId: qt.merk.id,
      brandName: qt.merk.brandName,
      commodityName: qt.commodityGroup.name,
      commoditySubGroupName: qt.commoditySubGroup?.name ?? null,
      certificateNumber: qt.certificateNumber,
      laboratoryName: qt.laboratoryName,
      issueDate: qt.issueDate,
      expiryDate: qt.expiryDate,
    })),
  });
}
