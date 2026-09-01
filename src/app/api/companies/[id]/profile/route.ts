import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireAdminSession } from "@/lib/require-admin-session";
import { getDocumentMeta } from "@/modules/company/document-versions";
import type { TaxProofEntryValues } from "@/modules/company/schema";
import { LEGAL_TAX_DOCUMENT_FIELD_KEYS, isCompanyProfileSection, patchCompanyProfileSection } from "@/modules/company/profile-update";

/**
 * Admin-scoped mirror of `GET/PATCH /api/company-workspace/profile` — same `CompanyProfileData`
 * shape (`{ ...company, documentMeta }`) and the same section-based PATCH (via
 * `patchCompanyProfileSection`, shared with that route so the two never drift), consumed by
 * `CompanyProfileView`/`CompanyProfileTabsContent` for admin's Company Detail page. Keyed by the
 * `id` in the URL instead of the caller's own `session.user.companyId` — that route can only
 * ever read/write the logged-in company's own profile.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const company = await db.company.findUnique({ where: { id } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const taxProofs = (company.taxProofs as TaxProofEntryValues[] | null) ?? [];
  const fieldKeys = [
    ...LEGAL_TAX_DOCUMENT_FIELD_KEYS.filter((key) => Boolean(company[key])),
    ...taxProofs.filter((tp) => tp.docPath).map((tp) => `taxProof:${tp.year}`),
  ];
  const documentMeta = await getDocumentMeta(company.id, fieldKeys, company.createdAt);

  return NextResponse.json({ data: { ...company, documentMeta } });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdminSession();
  if (error) return error;

  const { id } = await params;
  const body = await request.json().catch(() => null);
  const section = (body as { section?: unknown })?.section;
  if (!isCompanyProfileSection(section)) {
    return NextResponse.json({ error: "Bagian formulir tidak valid" }, { status: 400 });
  }

  const result = await patchCompanyProfileSection(id, section, body, session.user.id);
  if ("error" in result) return result.error;
  return NextResponse.json({ data: result.data });
}
