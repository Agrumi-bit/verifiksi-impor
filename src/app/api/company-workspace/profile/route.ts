import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { locationsSchema } from "@/modules/shared/schema";
import {
  companyContactsSchema,
  companyDataSchema,
  companyLegalSchema,
  companyTaxSchema,
  type TaxProofEntryValues,
} from "@/modules/company/schema";
import { getDocumentMeta, recordDocumentVersion } from "@/modules/company/document-versions";

const LEGAL_TAX_DOCUMENT_FIELD_KEYS = [
  "nibDocumentPath",
  "kbliDocumentPath",
  "notarialDocumentPath",
  "notarialAmendmentDocPath",
  "skDocumentPath",
  "npwpDocumentPath",
  "sktDocumentPath",
] as const;

export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const taxProofs = (company.taxProofs as TaxProofEntryValues[] | null) ?? [];
  const fieldKeys = [
    ...LEGAL_TAX_DOCUMENT_FIELD_KEYS.filter((key) => Boolean(company[key])),
    ...taxProofs.filter((tp) => tp.docPath).map((tp) => `taxProof:${tp.year}`),
  ];
  const documentMeta = await getDocumentMeta(companyId, fieldKeys, company.createdAt);

  return NextResponse.json({ data: { ...company, documentMeta } });
}

const SECTIONS = ["data", "contacts", "legal", "tax", "facilities"] as const;
type Section = (typeof SECTIONS)[number];

function isSection(value: unknown): value is Section {
  return typeof value === "string" && (SECTIONS as readonly string[]).includes(value);
}

function invalidResponse(error: z.ZodError) {
  return NextResponse.json(
    { error: "Data tidak valid", issues: z.treeifyError(error) },
    { status: 400 },
  );
}

export async function PATCH(request: Request) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json(
      { error: "Akun Anda belum terhubung dengan perusahaan manapun." },
      { status: 404 },
    );
  }

  const body = await request.json().catch(() => null);
  const section = (body as { section?: unknown })?.section;
  if (!isSection(section)) {
    return NextResponse.json({ error: "Bagian formulir tidak valid" }, { status: 400 });
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  if (section === "data") {
    const parsed = companyDataSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        logoPath: v.logoPath || null,
        apiType: v.apiType,
        companyName: v.companyName,
        companyType: v.companyType,
        investmentStatus: v.investmentStatus,
        addressJalan: v.addressJalan,
        addressDesa: v.addressDesa,
        addressKecamatan: v.addressKecamatan,
        addressKota: v.addressKota,
        addressProvinsi: v.addressProvinsi,
        addressKodePos: v.addressKodePos,
        companyEmail: v.companyEmail,
        companyPhone: v.companyPhone,
        companyWebsite: v.companyWebsite || null,
      },
    });
  } else if (section === "contacts") {
    const parsed = companyContactsSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    const firstContact = v.contacts[0];
    await db.company.update({
      where: { id: companyId },
      data: {
        contacts: v.contacts,
        // Legacy singular columns — no other reader left in the codebase
        // besides `/api/companies` POST, but kept mirrored for safety.
        contactFullName: firstContact.name,
        contactDesignation: firstContact.jabatan,
        contactEmail: firstContact.email,
        contactPhone: firstContact.whatsapp,
      },
    });
  } else if (section === "legal") {
    const parsed = companyLegalSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        nibNumber: v.nibNumber,
        nibIssueDate: new Date(v.nibIssueDate),
        nibDocumentPath: v.nibDocumentPath,
        kbliEntries: v.kbliEntries,
        kbliDocumentPath: v.kbliDocumentPath,
        notarialDeedNumber: v.notarialDeedNumber,
        notarialDeedIssueDate: new Date(v.notarialDeedIssueDate),
        notarialIssuingAuthority: v.notarialIssuingAuthority,
        notarialDocumentPath: v.notarialDocumentPath,
        notarialAmendmentNumber: v.hasAmendment ? v.notarialAmendmentNumber || null : null,
        notarialAmendmentDate: v.hasAmendment && v.notarialAmendmentDate ? new Date(v.notarialAmendmentDate) : null,
        notarialAmendmentAuthority: v.hasAmendment ? v.notarialAmendmentAuthority || null : null,
        notarialAmendmentDocPath: v.hasAmendment ? v.notarialAmendmentDocPath || null : null,
        skNumber: v.skNumber,
        skDate: new Date(v.skDate),
        skDocumentPath: v.skDocumentPath,
      },
    });

    const newLegalDocs: Record<string, string | null> = {
      nibDocumentPath: v.nibDocumentPath,
      kbliDocumentPath: v.kbliDocumentPath,
      notarialDocumentPath: v.notarialDocumentPath,
      notarialAmendmentDocPath: v.hasAmendment ? v.notarialAmendmentDocPath || null : null,
      skDocumentPath: v.skDocumentPath,
    };
    await Promise.all(
      Object.entries(newLegalDocs)
        .filter(([key, path]) => path && path !== company[key as keyof typeof company])
        .map(([key, path]) => {
          const previousPath = company[key as keyof typeof company] as string | null;
          return recordDocumentVersion(
            companyId,
            key,
            path!,
            session.user.id,
            previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
          );
        }),
    );
  } else if (section === "tax") {
    const parsed = companyTaxSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: {
        npwpNumber: v.npwpNumber,
        npwpDocumentPath: v.npwpDocumentPath,
        companyAge: v.companyAge,
        taxProofs: v.companyAge === "OVER_3" ? v.taxProofs : [],
        sktNumber: v.companyAge === "UNDER_3" ? v.sktNumber || null : null,
        sktIssuer: v.companyAge === "UNDER_3" ? v.sktIssuer || null : null,
        sktDate: v.companyAge === "UNDER_3" && v.sktDate ? new Date(v.sktDate) : null,
        sktDocumentPath: v.companyAge === "UNDER_3" ? v.sktDocumentPath || null : null,
      },
    });

    const newTaxDocs: Record<string, string | null> = {
      npwpDocumentPath: v.npwpDocumentPath,
      sktDocumentPath: v.companyAge === "UNDER_3" ? v.sktDocumentPath || null : null,
    };
    await Promise.all(
      Object.entries(newTaxDocs)
        .filter(([key, path]) => path && path !== company[key as keyof typeof company])
        .map(([key, path]) => {
          const previousPath = company[key as keyof typeof company] as string | null;
          return recordDocumentVersion(
            companyId,
            key,
            path!,
            session.user.id,
            previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
          );
        }),
    );
    if (v.companyAge === "OVER_3") {
      const oldTaxProofs = (company.taxProofs as TaxProofEntryValues[] | null) ?? [];
      const oldByYear = new Map(oldTaxProofs.map((tp) => [tp.year, tp.docPath]));
      await Promise.all(
        v.taxProofs
          .filter((tp) => tp.docPath && tp.docPath !== oldByYear.get(tp.year))
          .map((tp) => {
            const previousPath = oldByYear.get(tp.year);
            return recordDocumentVersion(
              companyId,
              `taxProof:${tp.year}`,
              tp.docPath!,
              session.user.id,
              previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
            );
          }),
      );
    }
  } else {
    const parsed = locationsSchema.safeParse(body);
    if (!parsed.success) return invalidResponse(parsed.error);
    const v = parsed.data;
    await db.company.update({
      where: { id: companyId },
      data: { locations: v.locations },
    });
  }

  const updated = await db.company.findUnique({ where: { id: companyId } });
  return NextResponse.json({ data: updated });
}
