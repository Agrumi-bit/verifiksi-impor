import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // A verifikator's "schedule" is desk-review work, not a field visit — the
  // meaningful date is the validation due date on assignments already
  // claimed by them, not the surveyor's on-site scheduledDate.
  const assignments = await db.assignment.findMany({
    where: { verifikatorId, dueDate: { not: null } },
    include: { application: true },
    orderBy: { dueDate: "asc" },
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
      dueDate: assignment.dueDate,
    };
  });

  return NextResponse.json({ data });
}
