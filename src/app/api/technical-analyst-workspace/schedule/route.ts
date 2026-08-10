import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  const technicalAnalystId = session?.user.id;
  if (!technicalAnalystId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // scheduledDate is set by Customer Relation Workspace when the "technical"
  // assignment is scheduled — mirrors verifikator-workspace's schedule route.
  const assignments = await db.assignment.findMany({
    where: { technicalReviewerId: technicalAnalystId, scheduledDate: { not: null } },
    include: { application: true },
    orderBy: { scheduledDate: "asc" },
  });

  const data = assignments.map((assignment) => {
    const payload = assignment.application.payload as { companyName?: string } | null;
    return {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: assignment.application.verificationType,
      status: assignment.status,
      scheduledDate: assignment.scheduledDate,
      scheduledTime: assignment.scheduledTime,
      location: assignment.location,
    };
  });

  return NextResponse.json({ data });
}
