import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export async function GET() {
  const session = await getServerSession();
  const surveyorId = session?.user.id;

  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await db.assignment.findMany({
    where: { surveyorId },
    include: { application: true, report: true },
    orderBy: { scheduledDate: "asc" },
  });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  function toListItem(assignment: (typeof assignments)[number]) {
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
    };
  }

  const todaysAssignments = assignments
    .filter(
      (a) =>
        a.scheduledDate && a.scheduledDate >= todayStart && a.scheduledDate <= todayEnd,
    )
    .map(toListItem);

  const upcomingSchedule = assignments
    .filter((a) => a.scheduledDate && a.scheduledDate > todayEnd)
    .slice(0, 5)
    .map(toListItem);

  const pendingReports = assignments
    .filter((a) => a.report && a.report.status === "DRAFT")
    .map(toListItem);

  const returnedReports = assignments
    .filter((a) => a.report && a.report.status === "RETURNED")
    .map(toListItem);

  const activeCount = assignments.filter((a) =>
    ["ASSIGNED", "SCHEDULED", "IN_PROGRESS"].includes(a.status),
  ).length;

  const recentActivities = [...assignments]
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, 6)
    .map(toListItem);

  return NextResponse.json({
    totalCount: assignments.length,
    activeCount,
    todaysAssignments,
    upcomingSchedule,
    pendingReports,
    returnedReports,
    recentActivities,
  });
}
