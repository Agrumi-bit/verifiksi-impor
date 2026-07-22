import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { merkWizardSchema } from "@/modules/merk/schema";

export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ data: [] });
  }

  const brands = await db.merk.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: brands });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const body = await request.json();
  const parsed = merkWizardSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }
  const values = parsed.data;

  const brand = await db.merk.create({
    data: {
      brandName: values.brandName,
      productCategory: values.productCategory,
      countryOfOrigin: values.countryOfOrigin,
      registrationNumber: values.registrationNumber,
      registrationDocumentPath: values.registrationDocumentPath,
      ownershipType: values.ownershipType,
      brandOwnerName: values.brandOwnerName,
      licenseAgreementNumber: values.licenseAgreementNumber || null,
      licenseStartDate: values.licenseStartDate ? new Date(values.licenseStartDate) : null,
      licenseEndDate: values.licenseEndDate ? new Date(values.licenseEndDate) : null,
      licenseDocumentPath: values.licenseDocumentPath || null,
      companyId,
    },
  });

  return NextResponse.json({ data: brand }, { status: 201 });
}
