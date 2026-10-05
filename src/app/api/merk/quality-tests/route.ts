import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { mapPrismaWriteError } from "@/modules/merk/prisma-error-message";
import { qualityTestCreateSchema } from "@/modules/merk/schema";
import { validateQualityTestReferences } from "@/modules/merk/server-validation";

/**
 * Platform-level structured Quality Test monitoring — flattens `BrandQualityTest` across every
 * brand. VIU Konsumsi's own Hasil Uji Mutu entries (`productGroupCertificates`) sync into this
 * same table at submit — `sourceType = APPLICATION`, `sourceApplicationId` set — via
 * `syncQualityTestCertificatesForApplication` (application-relationship-sync.ts's sibling to its
 * Brand-relationship sync), so they show up here automatically with no separate
 * Application-payload aggregation. A certificate the applicant picked from an existing row
 * (`qualityTestId` set in the payload) is never duplicated into a second row by that sync — see
 * its own comment.
 */
export async function GET() {
  const { error } = await requireAdminSession();
  if (error) return error;

  const qualityTests = await db.brandQualityTest.findMany({
    orderBy: { issueDate: "desc" },
    include: {
      merk: { select: { id: true, brandName: true, company: { select: { companyName: true } } } },
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
      companyName: qt.merk.company?.companyName ?? null,
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
