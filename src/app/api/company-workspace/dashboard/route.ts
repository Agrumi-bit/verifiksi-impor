import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import {
  ACTIVE_STATUSES,
  REQUIRES_ACTION_STATUSES,
} from "@/modules/company-workspace/status";
import { documentFieldTitle } from "@/modules/company/document-fields";
import { buildDocumentChecklist } from "@/modules/verifikator-workspace/schema";
import type { ApplicationWizardValues } from "@/modules/applications/schema";

export async function GET() {
  const session = await getServerSession();
  const companyId = session?.user.companyId;

  if (!companyId) {
    return NextResponse.json({
      totalCount: 0,
      activeCount: 0,
      statusCounts: {},
      requiredActions: [],
      recentActivities: [],
      latestApplication: null,
    });
  }

  const applications = await db.application.findMany({
    where: { companyId },
    orderBy: { updatedAt: "desc" },
  });

  const statusCounts: Record<string, number> = {};
  for (const application of applications) {
    statusCounts[application.status] = (statusCounts[application.status] ?? 0) + 1;
  }

  const activeCount = applications.filter((application) =>
    ACTIVE_STATUSES.includes(application.status),
  ).length;

  const statusRequiredActions = applications
    .filter((application) => REQUIRES_ACTION_STATUSES.includes(application.status))
    .map((application) => ({
      id: application.id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      message:
        application.status === "DRAFT"
          ? "Lanjutkan pengisian formulir permohonan."
          : "Permohonan dikembalikan, mohon lengkapi perbaikan yang diminta.",
      href: `/company-workspace/applications/${application.id}`,
    }));

  // Rejected documents (marked by Customer Relation or verifikator) — latest version per fieldKey only,
  // since an older REJECTED row can be superseded by a newer upload without ever changing `application.status`.
  const appIds = applications.map((application) => application.id);
  const appDocVersions = appIds.length
    ? await db.applicationDocumentVersion.findMany({
        where: { applicationId: { in: appIds } },
        orderBy: { version: "desc" },
        select: { applicationId: true, fieldKey: true, verificationStatus: true },
      })
    : [];
  const seenAppDocKeys = new Set<string>();
  const applicationById = new Map(applications.map((application) => [application.id, application]));
  const rejectedAppDocActions = [];
  for (const row of appDocVersions) {
    const dedupeKey = `${row.applicationId}:${row.fieldKey}`;
    if (seenAppDocKeys.has(dedupeKey)) continue;
    seenAppDocKeys.add(dedupeKey);
    if (row.verificationStatus !== "REJECTED") continue;
    const application = applicationById.get(row.applicationId);
    if (!application) continue;
    const payload = application.payload as ApplicationWizardValues;
    const label = buildDocumentChecklist(payload).find((item) => item.key === row.fieldKey)?.label ?? row.fieldKey;
    rejectedAppDocActions.push({
      id: `app-doc:${row.applicationId}:${row.fieldKey}`,
      applicationNumber: application.applicationNumber,
      status: "REJECTED_DOCUMENT",
      message: `Dokumen "${label}" ditolak, mohon unggah ulang.`,
      href: `/company-workspace/applications/${application.id}`,
    });
  }

  const companyDocVersions = await db.companyDocumentVersion.findMany({
    where: { companyId },
    orderBy: { version: "desc" },
    select: { fieldKey: true, verificationStatus: true },
  });
  const seenCompanyDocKeys = new Set<string>();
  const rejectedCompanyDocActions = [];
  for (const row of companyDocVersions) {
    if (seenCompanyDocKeys.has(row.fieldKey)) continue;
    seenCompanyDocKeys.add(row.fieldKey);
    if (row.verificationStatus !== "REJECTED") continue;
    rejectedCompanyDocActions.push({
      id: `company-doc:${row.fieldKey}`,
      applicationNumber: "",
      status: "REJECTED_DOCUMENT",
      message: `Dokumen "${documentFieldTitle(row.fieldKey)}" ditolak, mohon unggah ulang di Company Profile.`,
      href: "/company-workspace/profile",
    });
  }

  const requiredActions = [...rejectedCompanyDocActions, ...rejectedAppDocActions, ...statusRequiredActions].slice(0, 5);

  const recentActivities = applications.slice(0, 8).map((application) => ({
    id: application.id,
    applicationNumber: application.applicationNumber,
    status: application.status,
    updatedAt: application.updatedAt,
  }));

  const latestApplication = applications[0]
    ? {
        id: applications[0].id,
        applicationNumber: applications[0].applicationNumber,
        status: applications[0].status,
        verificationType: applications[0].verificationType,
        updatedAt: applications[0].updatedAt,
      }
    : null;

  return NextResponse.json({
    totalCount: applications.length,
    activeCount,
    statusCounts,
    requiredActions,
    recentActivities,
    latestApplication,
  });
}
