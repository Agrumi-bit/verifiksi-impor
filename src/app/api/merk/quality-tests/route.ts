import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { mapPrismaWriteError } from "@/modules/merk/prisma-error-message";
import { qualityTestCreateSchema } from "@/modules/merk/schema";
import { validateQualityTestReferences } from "@/modules/merk/server-validation";

type KonsumsiApplicationPayload = {
  importTypes?: string[];
  brandQualityTests?: {
    brandId: string;
    commodityName?: string;
    certificateNumber?: string;
    laboratoryName?: string;
    issueDate?: string;
    expiryDate?: string;
  }[];
};

/**
 * VIU Konsumsi's own Hasil Uji Mutu entries (`brandQualityTests`, Step "Dokumen Pendukung
 * Merek") live only as JSON on `Application.payload` — a deliberately separate store from
 * `BrandQualityTest` (see that schema's own comment: per-application test data, not a permanent
 * Brand Master record) — and are never copied into `BrandQualityTest` at submit. Without this,
 * this page could never show a certificate the applicant actually brought with their
 * application, so read-only aggregation is required for this page to be meaningfully
 * "platform-wide" the way its own heading claims — same reasoning as
 * `getDocumentsMonitoringSummary`'s own Konsumsi aggregation. Synthetic rows use an
 * `application`-prefixed id (never a real BrandQualityTest id) since there is no row to
 * edit/delete; this table is read-only display plus a separate "Tambah Dokumen" create flow that
 * only ever writes real BrandQualityTest rows, so the two never collide.
 */
async function konsumsiQualityTestRows() {
  const applications = await db.application.findMany({
    where: { verificationType: "VIU", status: { not: "DRAFT" } },
    select: { id: true, applicationNumber: true, company: { select: { companyName: true } }, payload: true },
  });

  const relevant: { id: string; applicationNumber: string; companyName: string | null; payload: KonsumsiApplicationPayload }[] = [];
  const brandIds = new Set<string>();
  for (const application of applications) {
    const payload = application.payload as KonsumsiApplicationPayload | null;
    if (!payload?.importTypes?.includes("BARANG_KONSUMSI")) continue;
    for (const qt of payload.brandQualityTests ?? []) brandIds.add(qt.brandId);
    relevant.push({
      id: application.id,
      applicationNumber: application.applicationNumber,
      companyName: application.company?.companyName ?? null,
      payload,
    });
  }
  if (relevant.length === 0) return [];

  const brands = brandIds.size > 0
    ? await db.merk.findMany({ where: { id: { in: [...brandIds] } }, select: { id: true, brandName: true } })
    : [];
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.brandName]));

  return relevant.flatMap((application) =>
    (application.payload.brandQualityTests ?? []).map((qt, index) => ({
      id: `application:${application.id}:${index}`,
      brandId: qt.brandId,
      brandName: brandNameById.get(qt.brandId) ?? "Merek tidak ditemukan",
      companyName: application.companyName,
      commodityName: qt.commodityName ?? "—",
      // Konsumsi's own hierarchy has no third "Komoditas" (CommoditySubGroup) level — only
      // Kelompok Komoditas/Sub Kelompok Komoditas (see applicationBrandQualityTestEntrySchema).
      // Reuses this column to show which application this row traces back to, since there's no
      // real CommoditySubGroup for it and the admin otherwise has no way to tell these synthetic
      // rows apart from one another or find the source application.
      commoditySubGroupName: `Permohonan ${application.applicationNumber}`,
      certificateNumber: qt.certificateNumber ?? "",
      laboratoryName: qt.laboratoryName ?? "",
      issueDate: qt.issueDate ?? null,
      expiryDate: qt.expiryDate ?? null,
    })),
  );
}

/** Platform-level structured Quality Test monitoring — flattens
 * `BrandQualityTest` across every brand, plus every submitted VIU Konsumsi application's own
 * Hasil Uji Mutu entries (see `konsumsiQualityTestRows`'s own comment). Kept as its own
 * structured record (commodity/lab/certificate/dates), not reduced to a generic attachment. */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const [qualityTests, konsumsiRows] = await Promise.all([
    db.brandQualityTest.findMany({
      orderBy: { issueDate: "desc" },
      include: {
        merk: { select: { id: true, brandName: true, company: { select: { companyName: true } } } },
        commodityGroup: { select: { name: true } },
        commoditySubGroup: { select: { name: true } },
      },
    }),
    konsumsiQualityTestRows(),
  ]);

  return NextResponse.json({
    data: [
      ...qualityTests.map((qt) => ({
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
      ...konsumsiRows,
    ],
  });
}

export async function POST(request: Request) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = qualityTestCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const merk = await db.merk.findUnique({ where: { id: parsed.data.merkId } });
  if (!merk) {
    return NextResponse.json({ error: "Merek tidak ditemukan" }, { status: 404 });
  }

  const referenceError = await validateQualityTestReferences([parsed.data]);
  if (referenceError) {
    return NextResponse.json({ error: referenceError }, { status: 400 });
  }

  try {
    const qualityTest = await db.brandQualityTest.create({
      data: {
        merkId: parsed.data.merkId,
        commodityGroupId: parsed.data.commodityGroupId,
        commoditySubGroupId: parsed.data.commoditySubGroupId || null,
        certificateNumber: parsed.data.certificateNumber,
        laboratoryName: parsed.data.laboratoryName,
        issueDate: new Date(parsed.data.issueDate),
        expiryDate: parsed.data.expiryDate ? new Date(parsed.data.expiryDate) : null,
        filePath: parsed.data.filePath,
        fileName: parsed.data.fileName,
      },
    });
    return NextResponse.json({ data: qualityTest }, { status: 201 });
  } catch (err) {
    const message = mapPrismaWriteError(err);
    if (message) return NextResponse.json({ error: message }, { status: 400 });
    console.error("POST /api/merk/quality-tests failed:", err);
    return NextResponse.json({ error: "Gagal menyimpan dokumen hasil uji mutu, coba lagi." }, { status: 500 });
  }
}
