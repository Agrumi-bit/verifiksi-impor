import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireVerifikatorSession } from "@/lib/require-verifikator-session";
import { isKnownDocumentFieldKey, parseTaxProofYear } from "@/modules/company/document-fields";
import { getVersionHistory, recordDocumentVersion, resolveCurrentDocumentPath } from "@/modules/company/document-versions";
import type { TaxProofEntryValues } from "@/modules/company/schema";

export async function GET(_request: Request, { params }: { params: Promise<{ companyId: string; fieldKey: string }> }) {
  const { error } = await requireVerifikatorSession();
  if (error) return error;

  const { companyId, fieldKey } = await params;
  if (!isKnownDocumentFieldKey(fieldKey)) {
    return NextResponse.json({ error: "Field dokumen tidak dikenali" }, { status: 400 });
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const currentPath = resolveCurrentDocumentPath(company, fieldKey);
  const history = await getVersionHistory(companyId, fieldKey, currentPath, company.createdAt);

  return NextResponse.json({ data: history });
}

const patchSchema = z.object({ path: z.string().trim().min(1, "Path dokumen wajib diisi") });

export async function PATCH(request: Request, { params }: { params: Promise<{ companyId: string; fieldKey: string }> }) {
  const { session, error } = await requireVerifikatorSession();
  if (error) return error;

  const { companyId, fieldKey } = await params;
  if (!isKnownDocumentFieldKey(fieldKey)) {
    return NextResponse.json({ error: "Field dokumen tidak dikenali" }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const { path } = parsed.data;

  const company = await db.company.findUnique({ where: { id: companyId } });
  if (!company) {
    return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
  }

  const previousPath = resolveCurrentDocumentPath(company, fieldKey);
  if (previousPath === path) {
    return NextResponse.json({ error: "Dokumen tidak berubah" }, { status: 400 });
  }

  const year = parseTaxProofYear(fieldKey);
  if (!year) {
    await db.company.update({ where: { id: companyId }, data: { [fieldKey]: path } });
  } else {
    const taxProofs = (company.taxProofs as TaxProofEntryValues[] | null) ?? [];
    const updated = taxProofs.map((tp) => (tp.year === year ? { ...tp, docPath: path } : tp));
    await db.company.update({ where: { id: companyId }, data: { taxProofs: updated } });
  }

  await recordDocumentVersion(
    companyId,
    fieldKey,
    path,
    session.user.id,
    previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
  );

  const history = await getVersionHistory(companyId, fieldKey, path, company.createdAt);
  return NextResponse.json({ data: history });
}
