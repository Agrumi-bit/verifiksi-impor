import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { TERMINAL_STATUSES } from "@/modules/company-workspace/status";
import { getDocumentMeta } from "@/modules/company/document-versions";
import { getApplicationDocumentMeta } from "@/modules/applications/document-versions";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { buildDocumentChecklist, COMPANY_MAPPED_DOCUMENT_KEYS } from "@/modules/verifikator-workspace/schema";
import { computeDisplayStatus } from "@/modules/company-workspace/workflow-stage";

/**
 * `id` may be either the internal cuid (used by this workspace's own links)
 * or the human-readable applicationNumber (shown as "Nomor Permohonan" in
 * every workspace, including Verifikator's assignment header — users
 * naturally paste that instead of the opaque id when cross-checking).
 */
async function loadScopedApplication(id: string, companyId: string) {
  const application = await db.application.findFirst({
    where: { OR: [{ id }, { applicationNumber: id }] },
    include: {
      assignments: {
        orderBy: { createdAt: "desc" },
        include: {
          surveyor: { select: { name: true } },
          verifikator: { select: { name: true } },
          technicalReviewer: { select: { name: true } },
          locationVisits: true,
          report: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!application || application.companyId !== companyId) {
    return null;
  }
  return application;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const application = await loadScopedApplication(id, companyId);
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const company = await db.company.findUnique({ where: { id: companyId } });
  const payload = application.payload as ApplicationWizardValues;
  const checklist = buildDocumentChecklist(payload);
  const companyKeys = checklist.filter((item) => item.key in COMPANY_MAPPED_DOCUMENT_KEYS).map((item) => item.key);
  const appOnlyKeys = checklist.filter((item) => !(item.key in COMPANY_MAPPED_DOCUMENT_KEYS)).map((item) => item.key);
  const companyMeta = company
    ? await getDocumentMeta(companyId, companyKeys.map((key) => COMPANY_MAPPED_DOCUMENT_KEYS[key]), company.createdAt)
    : {};
  const appMeta = await getApplicationDocumentMeta(application.id, appOnlyKeys, application.createdAt);
  const documentStatuses = Object.fromEntries(
    checklist.map((item) => [
      item.key,
      item.key in COMPANY_MAPPED_DOCUMENT_KEYS ? companyMeta[COMPANY_MAPPED_DOCUMENT_KEYS[item.key]] : appMeta[item.key],
    ]),
  );

  const latestAssignment = application.assignments[0] ?? null;
  const displayStatus = computeDisplayStatus(application, application.assignments);

  return NextResponse.json({
    data: {
      ...application,
      displayStatus,
      assignedSurveyorName: latestAssignment?.surveyor?.name ?? null,
      surveyDate: latestAssignment?.scheduledDate ?? null,
      documentStatuses,
      company: company
        ? {
            companyName: company.companyName,
            apiType: company.apiType,
            companyType: company.companyType,
            investmentStatus: company.investmentStatus,
            companyPhone: company.companyPhone,
            companyEmail: company.companyEmail,
            companyWebsite: company.companyWebsite,
            addressJalan: company.addressJalan,
            addressDesa: company.addressDesa,
            addressKecamatan: company.addressKecamatan,
            addressKota: company.addressKota,
            addressProvinsi: company.addressProvinsi,
            addressKodePos: company.addressKodePos,
          }
        : null,
    },
  });
}

const patchSchema = z.object({
  action: z.literal("withdraw"),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const companyId = session?.user.companyId;
  if (!companyId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const application = await loadScopedApplication(id, companyId);
  if (!application) {
    return NextResponse.json({ error: "Permohonan tidak ditemukan" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Aksi tidak valid" }, { status: 400 });
  }

  if (TERMINAL_STATUSES.includes(application.status)) {
    return NextResponse.json(
      { error: "Permohonan ini sudah berada pada status akhir dan tidak dapat ditarik." },
      { status: 400 },
    );
  }

  const updated = await db.application.update({
    where: { id },
    data: { status: "WITHDRAWN" },
  });

  return NextResponse.json({ data: updated });
}
