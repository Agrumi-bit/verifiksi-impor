import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET() {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const visits = await db.locationVisit.findMany({
    where: {
      status: "COMPLETED",
      assignment: { verifikatorId },
    },
    include: { assignment: { include: { application: true } } },
    orderBy: { submittedAt: "desc" },
  });

  const data = visits.map((visit) => {
    const payload = visit.assignment.application.payload as { companyName?: string } | null;
    return {
      id: visit.id,
      assignmentNumber: visit.assignment.assignmentNumber,
      applicationNumber: visit.assignment.application.applicationNumber,
      companyName: payload?.companyName ?? "—",
      verificationType: visit.assignment.application.verificationType,
      locationType: visit.locationType,
      address: visit.address,
      city: visit.city,
      submittedAt: visit.submittedAt,
      isOfficeReport: visit.locationType === "KANTOR" && visit.officeVerification !== null,
      assignmentStatus: visit.assignment.status,
    };
  });

  return NextResponse.json({ data });
}
