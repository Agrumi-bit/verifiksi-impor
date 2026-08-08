import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { getAssignmentStatCounts } from "@/modules/verifikator-workspace/assignment-stats";

export async function GET() {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, recentAssignments] = await Promise.all([
    getAssignmentStatCounts(verifikatorId),
    db.assignment.findMany({
      where: { verifikatorId },
      include: { application: true },
      orderBy: { updatedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    stats,
    recentAssignments: recentAssignments.map((assignment) => {
      const payload = assignment.application.payload as { companyName?: string } | null;
      return {
        id: assignment.id,
        assignmentNumber: assignment.assignmentNumber,
        applicationNumber: assignment.application.applicationNumber,
        companyName: payload?.companyName ?? "—",
        verificationType: assignment.application.verificationType,
        status: assignment.status,
        dueDate: assignment.dueDate,
      };
    }),
  });
}
