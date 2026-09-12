import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { computeBrandCompleteness } from "@/modules/merk/compute-brand-completeness";

const EXPIRY_WINDOW_DAYS = 30;

/** Company-scoped counterpart to /api/merk/dashboard — same KPI shape,
 * restricted to the signed-in user's own company. */
export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const now = new Date();
  const horizon = new Date(now.getTime() + EXPIRY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const expiryWhere = { expiryDate: { gte: now, lte: horizon }, merk: { companyId } };

  const [totalMerek, aktif, draft, dokumenAkanKedaluwarsa, hasilUjiMutuAkanKedaluwarsa, recentBrands, brandsForCompleteness] =
    await Promise.all([
      db.merk.count({ where: { companyId } }),
      db.merk.count({ where: { companyId, status: "ACTIVE" } }),
      db.merk.count({ where: { companyId, status: "DRAFT" } }),
      db.brandDocument.count({ where: expiryWhere }),
      db.brandQualityTest.count({ where: expiryWhere }),
      db.merk.findMany({
        where: { companyId },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: { id: true, brandName: true, status: true, createdAt: true },
      }),
      db.merk.findMany({
        where: { companyId, status: { not: "DRAFT" } },
        select: {
          id: true,
          certificateType: true,
          ownership: {
            select: {
              ownerLocation: true,
              relationshipWithApiu: true,
              representationType: true,
              appointmentSource: true,
              agreementType: true,
            },
          },
          documents: { select: { documentType: true, filePath: true } },
        },
      }),
    ]);

  const dokumenTidakLengkap = brandsForCompleteness.filter(
    (brand) => computeBrandCompleteness(brand).percent < 100,
  ).length;

  return NextResponse.json({
    data: {
      kpis: { totalMerek, merekAktif: aktif, draft, dokumenTidakLengkap, dokumenAkanKedaluwarsa, hasilUjiMutuAkanKedaluwarsa },
      recentBrands,
    },
  });
}
