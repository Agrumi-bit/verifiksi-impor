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
import { toChecklistCompanyContext } from "@/modules/verifikator-workspace/company-context";

async function findOwnedAssignment(assignmentNumber: string, verifikatorId: string) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) return null;
  return assignment;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; key: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, key } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;
  const item = buildDocumentChecklist(payload, toChecklistCompanyContext(company)).find((c) => c.key === key);
  if (!item) {
    return NextResponse.json({ error: "Dokumen tidak dikenali" }, { status: 400 });
  }

  if (key in COMPANY_MAPPED_DOCUMENT_KEYS) {
    if (!company) {
      return NextResponse.json({ data: [] });
    }
    const fieldKey = COMPANY_MAPPED_DOCUMENT_KEYS[key];
    const history = await getVersionHistory(company.id, fieldKey, company[fieldKey] ?? item.documentPath, company.createdAt);
    return NextResponse.json({ data: history });
  }

  const history = await getApplicationDocumentVersionHistory(
    assignment.application.id,
    key,
    item.documentPath,
    assignment.application.createdAt,
  );
  return NextResponse.json({ data: history });
}

const patchSchema = z.object({ path: z.string().trim().min(1, "Path dokumen wajib diisi") });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; key: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, key } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  const { path } = parsed.data;

  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;
  const item = buildDocumentChecklist(payload, toChecklistCompanyContext(company)).find((c) => c.key === key);
  if (!item) {
    return NextResponse.json({ error: "Dokumen tidak dikenali" }, { status: 400 });
  }
  if (item.documentPath === path) {
    return NextResponse.json({ error: "Dokumen tidak berubah" }, { status: 400 });
  }

  const updatedPayload = applyChecklistDocumentPath(payload, key, path);
  await db.application.update({ where: { id: assignment.application.id }, data: { payload: updatedPayload } });

  if (key in COMPANY_MAPPED_DOCUMENT_KEYS) {
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
      verifikatorId,
      previousPath ? { previousPath, createdAt: company.createdAt } : undefined,
    );
    const history = await getVersionHistory(company.id, fieldKey, path, company.createdAt);
    return NextResponse.json({ data: history });
  }

  await recordApplicationDocumentVersion(
    assignment.application.id,
    key,
    path,
    verifikatorId,
    item.documentPath ? { previousPath: item.documentPath, createdAt: assignment.application.createdAt } : undefined,
  );
  const history = await getApplicationDocumentVersionHistory(assignment.application.id, key, path, assignment.application.createdAt);
  return NextResponse.json({ data: history });
}
