import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import type { SurveyPayloadLocation } from "@/modules/shared/survey-visit-scope";
import {
  buildApplicationGroups,
  type ApplicationGroupInfo,
  type GroupableAssignment,
} from "@/modules/surveyor-workspace/application-groups";
import {
  ASSIGNMENT_PRIORITIES,
  ASSIGNMENT_STATUSES,
  type AssignmentPriorityValue,
  type AssignmentStatusValue,
} from "@/modules/surveyor-workspace/status";

/**
 * "My Assignments", one entry per APPLICATION (company): the surveyor's assignments for an
 * application are folded into a single card listing every application location once, with that
 * location's survey result. Stats, filters, search and paging all work on those cards.
 */
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
    statusParam && ASSIGNMENT_STATUSES.includes(statusParam as AssignmentStatusValue) ? (statusParam as AssignmentStatusValue) : null;
  const priorityParam = searchParams.get("priority");
  const priority =
    priorityParam && ASSIGNMENT_PRIORITIES.includes(priorityParam as AssignmentPriorityValue)
      ? (priorityParam as AssignmentPriorityValue)
      : null;
  const oldestFirst = searchParams.get("sort") === "oldest";
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(searchParams.get("pageSize")) || 10));

  const mine = await db.assignment.findMany({ where: { surveyorId }, select: { applicationId: true } });
  const applicationIds = [...new Set(mine.map((assignment) => assignment.applicationId))];

  // Every survey assignment of those applications (also other surveyors') — each location row
  // shows the location's single survey result no matter who recorded it.
  const siblings = await db.assignment.findMany({
    where: { applicationId: { in: applicationIds }, OR: [{ scheduleType: "survey" }, { surveyorId: { not: null } }] },
    include: { locationVisits: true },
  });
  const applications = await db.application.findMany({
    where: { id: { in: applicationIds } },
    select: { id: true, applicationNumber: true, verificationType: true, payload: true },
  });
  const applicationInfo = new Map<string, ApplicationGroupInfo>(
    applications.map((application) => {
      const payload = application.payload as { companyName?: string; importTypes?: string[]; locations?: SurveyPayloadLocation[] } | null;
      return [
        application.id,
        {
          applicationId: application.id,
          applicationNumber: application.applicationNumber,
          companyName: payload?.companyName ?? "—",
          verificationType: application.verificationType,
          importTypes: payload?.importTypes ?? [],
          locations: payload?.locations ?? [],
        },
      ];
    }),
  );

  const groups = buildApplicationGroups(surveyorId, siblings as GroupableAssignment[], applicationInfo);

  const stats = {
    total: groups.length,
    assigned: groups.filter((group) => group.status === "ASSIGNED").length,
    inProgress: groups.filter((group) => group.status === "IN_PROGRESS").length,
    urgent: groups.filter((group) => group.priority === "HIGH" || group.priority === "CRITICAL").length,
    totalLocations: groups.reduce((sum, group) => sum + group.locationSummary.total, 0),
    completedLocations: groups.reduce((sum, group) => sum + group.locationSummary.completed, 0),
  };

  const filtered = groups.filter((group) => {
    if (status && group.status !== status) return false;
    if (priority && group.priority !== priority) return false;
    if (!q) return true;
    return (
      group.companyName.toLowerCase().includes(q) ||
      group.applicationNumber.toLowerCase().includes(q) ||
      group.assignmentNumbers.some((number) => number.toLowerCase().includes(q)) ||
      group.locations.some((row) => row.address.toLowerCase().includes(q))
    );
  });
  const ordered = oldestFirst ? [...filtered].reverse() : filtered;

  const total = ordered.length;
  const data = ordered.slice((page - 1) * pageSize, page * pageSize);
  return NextResponse.json({ data, total, page, pageSize, stats });
}
