import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireVerifikatorSession } from "@/lib/require-verifikator-session";
import { DOCUMENT_FIELD_KEYS, documentFieldCategory, documentFieldTitle } from "@/modules/company/document-fields";
import { getDocumentMeta, resolveCurrentDocumentPath, setDocumentVerificationStatus } from "@/modules/company/document-versions";
import type { TaxProofEntryValues } from "@/modules/company/schema";

function taxProofFieldKeys(taxProofs: unknown): string[] {
  const entries = (taxProofs as TaxProofEntryValues[] | null) ?? [];
  return entries.filter((entry) => entry.year).map((entry) => `taxProof:${entry.year}`);
}

export async function GET(_request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { error } = await requireVerifikatorSession();
  if (error) return error;

  const { companyId } = await params;
  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  // Every known/expected field is listed here regardless of whether the
  // company has actually uploaded it yet — a missing supporting document is
  // still something a verifikator needs to see and act on (mark it N/A, or
  // upload it on the company's behalf), not something that should silently
  // vanish from the list.
  const fieldKeys = [...DOCUMENT_FIELD_KEYS, ...taxProofFieldKeys(company.taxProofs)];

  const meta = await getDocumentMeta(companyId, fieldKeys, company.createdAt);

  const data = fieldKeys.map((fieldKey) => ({
    fieldKey,
    title: documentFieldTitle(fieldKey),
    category: documentFieldCategory(fieldKey),
    path: resolveCurrentDocumentPath(company, fieldKey),
    ...meta[fieldKey],
  }));

  return NextResponse.json({ data, companyName: company.companyName });
}

const patchSchema = z.object({
  fieldKey: z.string(),
  status: z.enum(["VERIFIED", "REJECTED", "NOT_APPLICABLE"]),
  rejectionNote: z.string().trim().optional(),
});

export async function PATCH(request: Request, { params }: { params: Promise<{ companyId: string }> }) {
  const { session, error } = await requireVerifikatorSession();
  if (error) return error;

  const { companyId } = await params;
  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const { fieldKey, status, rejectionNote } = parsed.data;

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  // No early-return when the field has never been uploaded — a verifikator
  // must be able to mark a missing *supporting* document N/A (or reject it,
  // asking the company to provide it) without a file existing yet.
  const currentPath = resolveCurrentDocumentPath(company, fieldKey);

  await setDocumentVerificationStatus(
    companyId,
    fieldKey,
    currentPath,
    company.createdAt,
    status,
    session.user.id,
    rejectionNote ?? null,
    "VERIFIKATOR",
  );

  const meta = await getDocumentMeta(companyId, [fieldKey], company.createdAt);

  return NextResponse.json({
    data: {
      fieldKey,
      title: documentFieldTitle(fieldKey),
      category: documentFieldCategory(fieldKey),
      path: currentPath,
      ...meta[fieldKey],
    },
  });
}
