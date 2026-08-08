import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import {
  applyChecklistDocumentPath,
  getApplicationDocumentVersionHistory,
  recordApplicationDocumentVersion,
} from "@/modules/applications/document-versions";
import { getVersionHistory, recordDocumentVersion } from "@/modules/company/document-versions";
import { buildDocumentChecklist, COMPANY_MAPPED_DOCUMENT_KEYS } from "@/modules/verifikator-workspace/schema";

/**
 * `id` accepts either the internal cuid or the human-readable applicationNumber
 * — same lookup as the parent `applications/[id]/route.ts`.
 */
async function findOwnedApplication(id: string, companyId: string) {
  const application = await db.application.findFirst({ where: { OR: [{ id }, { applicationNumber: id }] } });
  if (!application || application.companyId !== companyId) return null;
  return application;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; key: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, key } = await params;
  const application = await findOwnedApplication(id, companyId);
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const payload = application.payload as ApplicationWizardValues;
  const item = buildDocumentChecklist(payload).find((c) => c.key === key);
  if (!item) {
    return NextResponse.json({ error: "Dokumen tidak dikenali" }, { status: 400 });
  }

  if (key in COMPANY_MAPPED_DOCUMENT_KEYS) {
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
    }
    const fieldKey = COMPANY_MAPPED_DOCUMENT_KEYS[key];
    const history = await getVersionHistory(company.id, fieldKey, company[fieldKey] ?? item.documentPath, company.createdAt);
    return NextResponse.json({ data: history });
  }

  const history = await getApplicationDocumentVersionHistory(application.id, key, item.documentPath, application.createdAt);
  return NextResponse.json({ data: history });
}

const patchSchema = z.object({ path: z.string().trim().min(1, "Path dokumen wajib diisi") });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; key: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, key } = await params;
  const application = await findOwnedApplication(id, companyId);
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const { path } = parsed.data;

  const payload = application.payload as ApplicationWizardValues;
  const item = buildDocumentChecklist(payload).find((c) => c.key === key);
  if (!item) {
    return NextResponse.json({ error: "Dokumen tidak dikenali" }, { status: 400 });
  }
  if (item.documentPath === path) {
    return NextResponse.json({ error: "Dokumen tidak berubah" }, { status: 400 });
  }

  const updatedPayload = applyChecklistDocumentPath(payload, key, path);
  await db.application.update({ where: { id: application.id }, data: { payload: updatedPayload } });

  if (key in COMPANY_MAPPED_DOCUMENT_KEYS) {
    const company = await db.company.findUnique({ where: { id: companyId } });
    if (!company) {
      return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
    }
    const fieldKey = COMPANY_MAPPED_DOCUMENT_KEYS[key];
    const previousPath = company[fieldKey];
    await db.company.update({ where: { id: company.id }, data: { [fieldKey]: path } });
    await recordDocumentVersion(
      company.id,
      fieldKey,
      path,
      session.user.id,
      previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
    );
    const history = await getVersionHistory(company.id, fieldKey, path, company.createdAt);
    return NextResponse.json({ data: history });
  }

  await recordApplicationDocumentVersion(
    application.id,
    key,
    path,
    session.user.id,
    item.documentPath ? { previousPath: item.documentPath, createdAt: application.createdAt } : undefined,
  );
  const history = await getApplicationDocumentVersionHistory(application.id, key, path, application.createdAt);
  return NextResponse.json({ data: history });
}
