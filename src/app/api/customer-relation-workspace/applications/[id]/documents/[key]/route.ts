import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireCustomerRelationSession } from "@/lib/require-customer-relation-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { setApplicationDocumentVerificationStatus } from "@/modules/applications/document-versions";
import { setDocumentVerificationStatus } from "@/modules/company/document-versions";
import { buildDocumentChecklist, COMPANY_MAPPED_DOCUMENT_KEYS, fromChecklistStatus } from "@/modules/verifikator-workspace/schema";
import { crDocumentRequestsSchema, verifyDocumentSchema } from "@/modules/customer-relation-workspace/schema";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; key: string }> },
) {
  const { session, error } = await requireCustomerRelationSession();
  if (error) return error;

  const { id, key } = await params;
  const parsed = verifyDocumentSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Data tidak valid", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const application = await db.application.findUnique({ where: { id } });
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const payload = application.payload as ApplicationWizardValues;
  const checklist = buildDocumentChecklist(payload);
  const doc = checklist.find((d) => d.key === key);
  if (!doc) {
    return NextResponse.json({ error: "Dokumen tidak dikenali" }, { status: 400 });
  }

  const { action, note } = parsed.data;

  if (action === "check") {
    const { status } = parsed.data;
    if (!doc.documentPath && status !== "NOT_APPLICABLE") {
      return NextResponse.json({ error: "Dokumen belum diunggah oleh perusahaan" }, { status: 400 });
    }

    const targetStatus = fromChecklistStatus(status);
    if (key in COMPANY_MAPPED_DOCUMENT_KEYS) {
      if (!application.companyId) {
        return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
      }
      const company = await db.company.findUnique({ where: { id: application.companyId } });
      if (!company) {
        return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
      }
      const fieldKey = COMPANY_MAPPED_DOCUMENT_KEYS[key];
      await setDocumentVerificationStatus(company.id, fieldKey, company[fieldKey] ?? doc.documentPath, company.createdAt, targetStatus, session.user.id, note ?? null, "CR");
    } else {
      await setApplicationDocumentVerificationStatus(id, key, doc.documentPath, application.createdAt, targetStatus, session.user.id, note ?? null, "CR");
    }

    return NextResponse.json({ data: { key, status } });
  }

  // action === "request" — Customer-Relation-only memo asking the company to upload a missing document.
  const requests = crDocumentRequestsSchema.parse(application.crDocumentVerifications ?? {});
  requests[key] = { requestNote: note || "" };
  await db.application.update({ where: { id }, data: { crDocumentVerifications: requests } });
  await db.applicationMessage.create({
    data: { applicationId: id, direction: "SYSTEM", text: `Dokumen diminta: ${doc.label}${note ? " — " + note : ""}` },
  });

  return NextResponse.json({ data: requests[key] });
}
