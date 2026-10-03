import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

/**
 * Existing `BrandQualityTest` rows for the "Pilih sertifikat yang sudah ada" option in VIU
 * Konsumsi's Step "Product Information" certificate panel — scoped to one (merkId,
 * commodityGroupId) pair at a time. `/api/merk/quality-tests` (admin-only, platform-wide) can't be
 * used here: this is called by a company applicant mid-wizard, same access-pattern relaxation as
 * `/api/applications/brand-options` (any authenticated session, no admin/company-ownership gate —
 * brand usage in an application is deliberately separate from brand ownership). Only not-yet-
 * expired rows are returned (`expiryDate` null or in the future) — an expired certificate is never
 * a valid pick, same rule `validateProductGroupCertificates` enforces server-side at submit.
 */
export async function GET(request: Request) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const merkId = searchParams.get("merkId");
  const commodityGroupId = searchParams.get("commodityGroupId");
  if (!merkId || !commodityGroupId) {
    return NextResponse.json({ error: "merkId dan commodityGroupId wajib diisi" }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows = await db.brandQualityTest.findMany({
    where: {
      merkId,
      commodityGroupId,
      OR: [{ expiryDate: null }, { expiryDate: { gte: today } }],
    },
    orderBy: { issueDate: "desc" },
  });

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      certificateNumber: row.certificateNumber,
      laboratoryName: row.laboratoryName,
      issueDate: row.issueDate.toISOString(),
      expiryDate: row.expiryDate?.toISOString() ?? null,
      fileName: row.fileName,
      filePath: row.filePath,
    })),
  });
}
