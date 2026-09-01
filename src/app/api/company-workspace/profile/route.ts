import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { TaxProofEntryValues } from "@/modules/company/schema";
import { getDocumentMeta } from "@/modules/company/document-versions";
import { LEGAL_TAX_DOCUMENT_FIELD_KEYS, isCompanyProfileSection, patchCompanyProfileSection } from "@/modules/company/profile-update";

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
  if (!isCompanyProfileSection(section)) {
    return NextResponse.json({ error: "Bagian formulir tidak valid" }, { status: 400 });
  }

  const result = await patchCompanyProfileSection(companyId, section, body, session.user.id);
  if ("error" in result) return result.error;
  return NextResponse.json({ data: result.data });
}
