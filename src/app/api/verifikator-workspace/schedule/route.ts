import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // scheduledDate is set by Customer Relation Workspace when the "dokumen"
  // assignment is scheduled — mirrors surveyor-workspace's schedule route.
  // (dueDate is never populated by any workflow, so filtering on it left
  // this page permanently empty.)
  const assignments = await db.assignment.findMany({
    where: { verifikatorId, scheduledDate: { not: null } },
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
