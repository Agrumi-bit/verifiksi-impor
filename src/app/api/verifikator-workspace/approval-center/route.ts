import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET(request: Request) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim().toLowerCase() ?? "";

  // The approval queue is the shared inbox of everything a surveyor has
  // finished reporting on: unclaimed submissions plus anything this
  // verifikator has already started reviewing but not yet decided.
  const assignments = await db.assignment.findMany({
    where: {
      status: "SUBMITTED",
      OR: [{ verifikatorId: null }, { verifikatorId }],
    },
    include: { application: true },
    orderBy: { updatedAt: "asc" },
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

  const data = filtered.map((assignment) => {
    const payload = assignment.application.payload as { companyName?: string } | null;
    return {
      id: assignment.id,
      assignmentNumber: assignment.assignmentNumber,
      applicationNumber: assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: assignment.application.verificationType,
      priority: assignment.priority,
      claimedByMe: assignment.verifikatorId === verifikatorId,
      submittedAt: assignment.updatedAt,
      dueDate: assignment.dueDate,
    };
  });

  return NextResponse.json({
    data,
    stats: {
      total: data.length,
      unclaimed: data.filter((a) => !a.claimedByMe).length,
      inReview: data.filter((a) => a.claimedByMe).length,
    },
  });
}
