import { NextResponse } from "next/server";
import { z } from "zod";

import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
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
  // Any logged-in user (admin or Company Workspace) can register a new company into the shared
  // Directory — e.g. a company registering a raw-material supplier it wants as a Partner but
  // that isn't in the system yet. This creates a new Company row, not anything scoped to the
  // caller's own company, so there's nothing tenant-specific being protected here beyond "must
  // be logged in".
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Anda harus login untuk mendaftarkan perusahaan." }, { status: 401 });
  }

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

  // Pre-check for a friendly message on the common case; the DB's own `@unique` constraint
  // (caught as P2002 below) is the real guarantee against a race between two concurrent
  // submissions with the same NIB.
  const existingByNib = await db.company.findUnique({
    where: { nibNumber: values.nibNumber },
    select: { id: true, companyName: true },
  });
  if (existingByNib) {
    return NextResponse.json(
      { error: `Nomor NIB ini sudah terdaftar atas nama "${existingByNib.companyName}".` },
      { status: 409 },
    );
  }

  let company;
  try {
    company = await db.company.create({
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
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "Nomor NIB ini sudah terdaftar." }, { status: 409 });
    }
    throw error;
  }

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
