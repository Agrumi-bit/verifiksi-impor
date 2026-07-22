import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [myAssignments, queue] = await Promise.all([
    db.assignment.findMany({
      where: { verifikatorId },
      include: { application: true },
      orderBy: { updatedAt: "desc" },
    }),
    db.assignment.findMany({
      where: { status: "SUBMITTED", verifikatorId: null },
      include: { application: true },
      orderBy: { updatedAt: "asc" },
    }),
  ]);

  function toListItem(assignment: (typeof myAssignments)[number]) {
    const payload = assignment.application.payload as { companyName?: string } | null;
    return {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: assignment.application.verificationType,
      status: assignment.status,
      dueDate: assignment.dueDate,
      updatedAt: assignment.updatedAt,
    };
  }

  const pendingReview = myAssignments.filter((a) => a.status === "SUBMITTED");
  const returned = myAssignments.filter((a) => a.status === "RETURNED");
  const completed = myAssignments.filter((a) => a.status === "COMPLETED");

  const now = new Date();
  const dueSoon = myAssignments.filter(
    (a) => a.status === "SUBMITTED" && a.dueDate && a.dueDate.getTime() - now.getTime() < 3 * 24 * 60 * 60 * 1000,
  );

  return NextResponse.json({
    unclaimedQueueCount: queue.length,
    myActiveCount: pendingReview.length,
    completedCount: completed.length,
    returnedCount: returned.length,
    pendingReview: pendingReview.slice(0, 5).map(toListItem),
    unclaimedQueue: queue.slice(0, 5).map(toListItem),
    dueSoon: dueSoon.slice(0, 5).map(toListItem),
    recentDecisions: [...returned, ...completed]
      .sort((a, b) => (b.validatedAt?.getTime() ?? 0) - (a.validatedAt?.getTime() ?? 0))
      .slice(0, 5)
      .map(toListItem),
  });
}
