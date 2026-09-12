import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";

/** Platform-level structured Quality Test monitoring — flattens
 * `BrandQualityTest` across every brand. Kept as its own structured record
 * (commodity/lab/certificate/dates), not reduced to a generic attachment. */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const qualityTests = await db.brandQualityTest.findMany({
    orderBy: { issueDate: "desc" },
    include: {
      merk: { select: { id: true, brandName: true, company: { select: { companyName: true } } } },
      commodityGroup: { select: { name: true } },
      commoditySubGroup: { select: { name: true } },
    },
  });

  return NextResponse.json({
    data: qualityTests.map((qt) => ({
      id: qt.id,
      brandId: qt.merk.id,
      brandName: qt.merk.brandName,
      companyName: qt.merk.company?.companyName ?? null,
      commodityName: qt.commodityGroup.name,
      commoditySubGroupName: qt.commoditySubGroup?.name ?? null,
      certificateNumber: qt.certificateNumber,
      laboratoryName: qt.laboratoryName,
      issueDate: qt.issueDate,
      expiryDate: qt.expiryDate,
    })),
  });
}
