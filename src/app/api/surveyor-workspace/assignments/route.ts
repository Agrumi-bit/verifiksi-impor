import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_STATUSES,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
} from "@/modules/surveyor-workspace/status";

export async function GET(request: Request) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";
  const statusParam = searchParams.get("status");
  const status =
    statusParam && ASSIGNMENT_STATUSES.includes(statusParam as AssignmentStatusValue)
      ? (statusParam as AssignmentStatusValue)
      : null;
  const priorityParam = searchParams.get("priority");
  const priority =
    priorityParam && ASSIGNMENT_PRIORITIES.includes(priorityParam as AssignmentPriorityValue)
      ? (priorityParam as AssignmentPriorityValue)
      : null;
  const sort = searchParams.get("sort") === "oldest" ? "asc" : "desc";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

  const allForStats = await db.assignment.findMany({
    where: { surveyorId },
    select: { status: true, priority: true },
  });
  const stats = {
    total: allForStats.length,
    assigned: allForStats.filter((a) => a.status === "ASSIGNED").length,
    inProgress: allForStats.filter((a) => a.status === "IN_PROGRESS").length,
    urgent: allForStats.filter((a) => a.priority === "HIGH" || a.priority === "CRITICAL").length,
  };

  const assignments = await db.assignment.findMany({
    where: {
      surveyorId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
    include: { application: true, report: true },
    orderBy: { createdAt: sort },
  });

  const filtered = q
    ? assignments.filter((assignment) => {
        const payload = assignment.application.payload as { companyName?: string } | null;
        return (
          assignment.assignmentNumber.toLowerCase().includes(q) ||
          assignment.application.applicationNumber.toLowerCase().includes(q) ||
          (payload?.companyName ?? "").toLowerCase().includes(q)
        );
      })
    : assignments;

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const paged = filtered.slice(start, start + pageSize);

  const data = paged.map((assignment) => {
    const payload = assignment.application.payload as { companyName?: string } | null;
    return {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: assignment.application.verificationType,
      status: assignment.status,
      priority: assignment.priority,
      businessType: assignment.businessType,
      productCategory: assignment.productCategory,
      location: assignment.location,
      createdAt: assignment.createdAt,
      scheduledDate: assignment.scheduledDate,
      scheduledTime: assignment.scheduledTime,
      dueDate: assignment.dueDate,
      reportStatus: assignment.report?.status ?? null,
    };
  });

  return NextResponse.json({ data, total, page, pageSize, stats });
}
