import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import {
  SURVEY_REPORT_STATUSES,
  type SurveyReportStatusValue,
} from "@/modules/surveyor-workspace/status";

export async function GET(request: Request) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status =
    statusParam && SURVEY_REPORT_STATUSES.includes(statusParam as SurveyReportStatusValue)
      ? (statusParam as SurveyReportStatusValue)
      : null;

  const reports = await db.surveyReport.findMany({
    where: {
      assignment: { surveyorId },
      ...(status ? { status } : {}),
    },
    include: { assignment: { include: { application: true } } },
    orderBy: { updatedAt: "desc" },
  });

  const data = reports.map((report) => {
    const payload = report.assignment.application.payload as { companyName?: string } | null;
    return {
      id: report.id,
      assignmentId: report.assignmentId,
      status: report.status,
      applicationNumber: report.assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: report.assignment.application.verificationType,
      submittedAt: report.submittedAt,
      updatedAt: report.updatedAt,
    };
  });

  return NextResponse.json({ data });
}
