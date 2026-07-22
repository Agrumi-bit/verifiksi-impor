import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import {
  ACTIVE_STATUSES,
  REQUIRES_ACTION_STATUSES,
} from "@/modules/company-workspace/status";

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

  const requiredActions = applications
    .filter((application) => REQUIRES_ACTION_STATUSES.includes(application.status))
    .slice(0, 5)
    .map((application) => ({
      id: application.id,
      applicationNumber: application.applicationNumber,
      status: application.status,
      message:
        application.status === "DRAFT"
          ? "Lanjutkan pengisian formulir permohonan."
          : "Permohonan dikembalikan, mohon lengkapi perbaikan yang diminta.",
    }));

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
