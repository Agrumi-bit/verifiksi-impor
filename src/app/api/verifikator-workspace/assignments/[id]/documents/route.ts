import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { getApplicationDocumentMeta, setApplicationDocumentVerificationStatus } from "@/modules/applications/document-versions";
import { getDocumentMeta, setDocumentVerificationStatus } from "@/modules/company/document-versions";
import { DOC_VERIFICATION_STATUSES } from "@/modules/verifikator-workspace/status";
import {
  buildDocumentChecklist,
  COMPANY_MAPPED_DOCUMENT_KEYS,
  fromChecklistStatus,
  toChecklistStatus,
} from "@/modules/verifikator-workspace/schema";
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
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;

  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;

  const checklist = buildDocumentChecklist(payload, toChecklistCompanyContext(company));

  const companyKeys = checklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const appOnlyKeys = checklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);

  const companyMeta = company
    ? await getDocumentMeta(
        company.id,
        companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]),
        company.createdAt,
      )
    : {};
  const appMeta = await getApplicationDocumentMeta(assignment.application.id, appOnlyKeys, assignment.application.createdAt);

  const data = checklist.map((item) => {
    const meta = item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : appMeta[item.key];
    return {
      ...item,
      status: meta ? toChecklistStatus(meta.verificationStatus) : "PENDING",
      note: meta?.rejectionNote ?? "",
      verifiedAt: meta?.verifiedAt ?? null,
      version: meta?.version ?? 1,
      uploadedByName: meta?.uploadedByName ?? null,
      uploadedAt: meta?.uploadedAt ?? null,
      checklistResult: meta?.checklistResult ?? null,
    };
  });

  return NextResponse.json({ data });
}

const patchSchema = z.object({
  key: z.string().min(1),
  status: z.enum(DOC_VERIFICATION_STATUSES),
  note: z.string().trim().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await findOwnedAssignment(id, verifikatorId);
  if (!assignment) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }
  if (assignment.status !== "SUBMITTED") {
    return NextResponse.json(
      { error: "Dokumen hanya dapat diverifikasi saat assignment berstatus Submitted." },
      { status: 400 },
    );
  }

  const parsed = patchSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Data tidak valid" }, { status: 400 });
  }
  if (parsed.data.status === "PENDING") {
    return NextResponse.json({ error: "Status tidak valid" }, { status: 400 });
  }

  const payload = assignment.application.payload as ApplicationWizardValues;
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId } })
    : null;
  const checklist = buildDocumentChecklist(payload, toChecklistCompanyContext(company));
  const item = checklist.find((c) => c.key === parsed.data.key);
  if (!item) {
    return NextResponse.json({ error: "Dokumen tidak dikenali" }, { status: 400 });
  }
  if (!item.documentPath && parsed.data.status !== "NOT_APPLICABLE") {
    return NextResponse.json({ error: "Dokumen belum diunggah oleh perusahaan" }, { status: 400 });
  }

  const status = fromChecklistStatus(parsed.data.status);
  const note = parsed.data.note ?? null;

  if (item.key in COMPANY_MAPPED_DOCUMENT_KEYS) {
    if (!company) {
      return NextResponse.json({ error: "Perusahaan tidak ditemukan" }, { status: 404 });
    }
    const fieldKey = COMPANY_MAPPED_DOCUMENT_KEYS[item.key];
    await setDocumentVerificationStatus(company.id, fieldKey, company[fieldKey] ?? item.documentPath, company.createdAt, status, verifikatorId, note, "VERIFIKATOR");
  } else {
    await setApplicationDocumentVerificationStatus(
      assignment.application.id,
      item.key,
      item.documentPath,
      assignment.application.createdAt,
      status,
      verifikatorId,
      note,
      "VERIFIKATOR",
    );
  }

  return NextResponse.json({ data: { key: item.key, status: parsed.data.status } });
}
