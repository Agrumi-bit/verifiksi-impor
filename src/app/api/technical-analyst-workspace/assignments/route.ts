import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { requireTechnicalAnalystSession } from "@/lib/require-technical-analyst-session";
import { overallTechnicalStatus, technicalAnalysisDataSchema } from "@/modules/technical-analyst-workspace/schema";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_STATUSES,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
} from "@/modules/technical-analyst-workspace/status";

export async function GET(request: Request) {
  const { session, error } = await requireTechnicalAnalystSession();
  if (error) return error;
  const technicalAnalystId = session.user.id;

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

  const assignments = await db.assignment.findMany({
    where: {
      technicalReviewerId: technicalAnalystId,
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
    },
    include: { application: true },
    orderBy: { updatedAt: sort },
  });

  const rows = assignments.map((assignment) => {
    const payload = assignment.application.payload as { companyName?: string } | null;
    const technicalAnalysisData = technicalAnalysisDataSchema.parse(assignment.technicalAnalysisData ?? {});
    return {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: assignment.application.verificationType,
      status: assignment.status,
      priority: assignment.priority,
      createdAt: assignment.createdAt,
      dueDate: assignment.dueDate,
      validatedAt: assignment.validatedAt,
      overallStatus: overallTechnicalStatus(assignment.application.verificationType, technicalAnalysisData),
    };
  });

  const filtered = q
    ? rows.filter(
        (row) =>
          row.assignmentNumber.toLowerCase().includes(q) ||
          row.applicationNumber.toLowerCase().includes(q) ||
          row.companyName.toLowerCase().includes(q),
      )
    : rows;

  const stats = {
    total: rows.length,
    belumDianalisis: rows.filter((r) => r.overallStatus === "PENDING").length,
    sesuai: rows.filter((r) => r.overallStatus === "SESUAI").length,
    tidakSesuai: rows.filter((r) => r.overallStatus === "TIDAK_SESUAI").length,
  };

  const total = filtered.length;
  const start = (page - 1) * pageSize;
  const data = filtered.slice(start, start + pageSize);

  return NextResponse.json({ data, total, page, pageSize, stats });
}
