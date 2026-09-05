import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await db.assignment.findMany({
    where: { surveyorId, scheduledDate: { not: null } },
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
      // Surveyors need to see a schedule the moment CR saves it — Surat Tugas approval (PM's
      // letterStatus) is a separate, slower-moving workflow layered on top, not a gate on
      // whether the assignment shows up here. Threaded through so the UI can flag it as still
      // a draft letter, rather than silently looking identical to a PM-approved one.
      letterStatus: assignment.letterStatus,
      scheduledDate: assignment.scheduledDate,
      scheduledTime: assignment.scheduledTime,
      location: assignment.location,
    };
  });

  return NextResponse.json({ data });
}
