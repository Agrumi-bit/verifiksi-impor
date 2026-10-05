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
      coverages: { select: { commodityGroup: { select: { name: true } } }, orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    data: qualityTests.map((qt) => ({
      id: qt.id,
      brandId: qt.merk.id,
      brandName: qt.merk.brandName,
      // Every Sub Kelompok the certificate covers (primary first) — one certificate shared by
      // several groups of a VIU Konsumsi application is one row here, not N copies.
      commodityName: [qt.commodityGroup.name, ...qt.coverages.map((c) => c.commodityGroup.name)].join(", "),
      coverageCount: 1 + qt.coverages.length,
      commoditySubGroupName: qt.commoditySubGroup?.name ?? null,
      certificateNumber: qt.certificateNumber,
      laboratoryName: qt.laboratoryName,
      issueDate: qt.issueDate,
      expiryDate: qt.expiryDate,
    })),
  });
}
