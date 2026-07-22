import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const report = await db.surveyReport.findUnique({
    where: { id },
    include: { assignment: { include: { application: true } } },
  });

  if (!report || report.assignment.surveyorId !== surveyorId) {
    return NextResponse.json({ error: "Report tidak ditemukan" }, { status: 404 });
  }

  return NextResponse.json({
    data: {
      ...report,
      checklist: report.checklist ?? [],
      evidence: report.evidence ?? [],
      findings: report.findings ?? [],
    },
  });
}
