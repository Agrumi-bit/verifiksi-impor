import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { companyWizardSchema, type TaxProofEntryValues } from "@/modules/company/schema";
import { recordDocumentVersion } from "@/modules/company/document-versions";
import { ACTIVE_STATUSES } from "@/modules/company-workspace/status";

export async function GET() {
  const companies = await db.company.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { applications: { where: { status: { in: ACTIVE_STATUSES } } } } } },
  });
  return NextResponse.json({ data: companies });
}

export async function POST(request: Request) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const body = await request.json();
  const parsed = companyWizardSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const values = parsed.data;
  const firstContact = values.contacts[0];

  const company = await db.company.create({
    data: {
      logoPath: values.logoPath || null,
      apiType: values.apiType,
      companyName: values.companyName,
      companyType: values.companyType,
      investmentStatus: values.investmentStatus,
      companyEmail: values.companyEmail,
      companyPhone: values.companyPhone,
      companyWebsite: values.companyWebsite || null,
      contactFullName: firstContact.name,
      contactDesignation: firstContact.jabatan,
      contactEmail: firstContact.email,
      contactPhone: firstContact.whatsapp,
      contacts: values.contacts,
      addressJalan: values.addressJalan,
      addressDesa: values.addressDesa,
      addressKecamatan: values.addressKecamatan,
      addressKota: values.addressKota,
      addressProvinsi: values.addressProvinsi,
      addressKodePos: values.addressKodePos,
      nibNumber: values.nibNumber,
      nibIssueDate: new Date(values.nibIssueDate),
      nibDocumentPath: values.nibDocumentPath,
      kbliEntries: values.kbliEntries,
      kbliDocumentPath: values.kbliDocumentPath,
      notarialDeedNumber: values.notarialDeedNumber,
      notarialDeedIssueDate: new Date(values.notarialDeedIssueDate),
      notarialIssuingAuthority: values.notarialIssuingAuthority,
      notarialDocumentPath: values.notarialDocumentPath,
      notarialAmendmentNumber: values.hasAmendment ? values.notarialAmendmentNumber || null : null,
      notarialAmendmentDate:
        values.hasAmendment && values.notarialAmendmentDate ? new Date(values.notarialAmendmentDate) : null,
      notarialAmendmentAuthority: values.hasAmendment ? values.notarialAmendmentAuthority || null : null,
      notarialAmendmentDocPath: values.hasAmendment ? values.notarialAmendmentDocPath || null : null,
      skNumber: values.skNumber,
      skDate: new Date(values.skDate),
      skDocumentPath: values.skDocumentPath,
      npwpNumber: values.npwpNumber,
      npwpIssuer: values.npwpIssuer,
      npwpDocumentPath: values.npwpDocumentPath,
      companyAge: values.companyAge,
      taxProofs: values.companyAge === "OVER_3" ? values.taxProofs : [],
      sktNumber: values.companyAge === "UNDER_3" ? values.sktNumber || null : null,
      sktIssuer: values.companyAge === "UNDER_3" ? values.sktIssuer || null : null,
      sktDate: values.companyAge === "UNDER_3" && values.sktDate ? new Date(values.sktDate) : null,
      sktDocumentPath: values.companyAge === "UNDER_3" ? values.sktDocumentPath || null : null,
      locations: values.locations,
    },
  });

  const uploadedById = session.user.id;
  const initialDocs: [string, string | null | undefined][] = [
    ["nibDocumentPath", company.nibDocumentPath],
    ["kbliDocumentPath", company.kbliDocumentPath],
    ["notarialDocumentPath", company.notarialDocumentPath],
    ["notarialAmendmentDocPath", company.notarialAmendmentDocPath],
    ["skDocumentPath", company.skDocumentPath],
    ["npwpDocumentPath", company.npwpDocumentPath],
    ["sktDocumentPath", company.sktDocumentPath],
  ];
  await Promise.all(
    initialDocs
      .filter((entry): entry is [string, string] => Boolean(entry[1]))
      .map(([fieldKey, path]) => recordDocumentVersion(company.id, fieldKey, path, uploadedById)),
  );
  const taxProofs = (company.taxProofs as TaxProofEntryValues[] | null) ?? [];
  await Promise.all(
    taxProofs
      .filter((tp) => tp.docPath)
      .map((tp) => recordDocumentVersion(company.id, `taxProof:${tp.year}`, tp.docPath!, uploadedById)),
  );

  return NextResponse.json({ data: company }, { status: 201 });
}
