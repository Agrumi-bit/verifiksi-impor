import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/**
 * Existing `BrandQualityTest` rows for the "Dari Hasil Uji Mutu" option in VIU Konsumsi's Step
 * "Product Information" certificate panel — every row of one Brand (merkId), across ALL its Sub
 * Kelompok Komoditas: one certificate may cover several groups. `commodityGroupId` (optional) only
 * marks whether each row's current scope already includes that group (`coversGroup`).
 * `/api/merk/quality-tests` (admin-only, platform-wide) can't be used here: this is called by a
 * company applicant mid-wizard, same access-pattern relaxation as `/api/applications/brand-options`
 * (any authenticated session — brand usage in an application is deliberately separate from brand
 * ownership). Only not-yet-expired rows are returned (`expiryDate` null or in the future) — an
 * expired certificate is never a valid pick, same rule `validateProductGroupCertificates`
 * enforces server-side at submit.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const merkId = searchParams.get("merkId");
  const commodityGroupId = searchParams.get("commodityGroupId");
  if (!merkId) {
    return NextResponse.json({ error: "merkId wajib diisi" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db.brandQualityTest.findMany({
    where: {
      merkId,
      OR: [{ expiryDate: null }, { expiryDate: { gte: today } }],
    },
    orderBy: { issueDate: "desc" },
    include: {
      commodityGroup: { select: { id: true, name: true } },
      coverages: { select: { commodityGroup: { select: { id: true, name: true } } } },
    },
  });

  return NextResponse.json({
    data: rows.map((row) => {
      const coverage = [row.commodityGroup, ...row.coverages.map((c) => c.commodityGroup)];
      return {
        id: row.id,
        certificateNumber: row.certificateNumber,
        laboratoryName: row.laboratoryName,
        issueDate: row.issueDate.toISOString(),
        expiryDate: row.expiryDate?.toISOString() ?? null,
        fileName: row.fileName,
        filePath: row.filePath,
        coverageNames: coverage.map((g) => g.name),
        coversGroup: commodityGroupId ? coverage.some((g) => g.id === commodityGroupId) : true,
      };
    }),
  });
}
