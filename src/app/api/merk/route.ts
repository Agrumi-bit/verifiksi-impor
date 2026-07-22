import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { merkWizardSchema } from "@/modules/merk/schema";

export async function GET() {
  const merkList = await db.merk.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ data: merkList });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = merkWizardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;

  const merk = await db.merk.create({
    data: {
      brandName: values.brandName,
      productCategory: values.productCategory,
      countryOfOrigin: values.countryOfOrigin,
      registrationNumber: values.registrationNumber,
      registrationDocumentPath: values.registrationDocumentPath,
      ownershipType: values.ownershipType,
      brandOwnerName: values.brandOwnerName,
      licenseAgreementNumber: values.licenseAgreementNumber || null,
      licenseStartDate: values.licenseStartDate
        ? new Date(values.licenseStartDate)
        : null,
      licenseEndDate: values.licenseEndDate
        ? new Date(values.licenseEndDate)
        : null,
      licenseDocumentPath: values.licenseDocumentPath || null,
    },
  });

  return NextResponse.json({ data: merk }, { status: 201 });
}
