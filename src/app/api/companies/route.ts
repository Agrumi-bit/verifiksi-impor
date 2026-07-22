import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { companyWizardSchema } from "@/modules/company/schema";

export async function GET() {
  const companies = await db.company.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ data: companies });
}

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = companyWizardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;

  const company = await db.company.create({
    data: {
      companyName: values.companyName,
      companyType: values.companyType,
      investmentStatus: values.investmentStatus,
      companyEmail: values.companyEmail,
      companyPhone: values.companyPhone,
      companyWebsite: values.companyWebsite || null,
      contactFullName: values.contactFullName,
      contactDesignation: values.contactDesignation,
      contactEmail: values.contactEmail,
      contactPhone: values.contactPhone,
      nibNumber: values.nibNumber,
      nibIssueDate: new Date(values.nibIssueDate),
      nibDocumentPath: values.nibDocumentPath,
      kbliEntries: values.kbliEntries,
      kbliDocumentPath: values.kbliDocumentPath,
      notarialDeedNumber: values.notarialDeedNumber,
      notarialDeedIssueDate: new Date(values.notarialDeedIssueDate),
      notarialIssuingAuthority: values.notarialIssuingAuthority,
      notarialAmendmentInfo: values.notarialAmendmentInfo || null,
      notarialDocumentPath: values.notarialDocumentPath,
      locations: values.locations,
    },
  });

  return NextResponse.json({ data: company }, { status: 201 });
}
