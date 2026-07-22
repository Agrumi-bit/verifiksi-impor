import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const verifikatorId = session?.user.id;
  if (!verifikatorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    include: { locationVisits: true },
  });
  if (!assignment || assignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const data = assignment.locationVisits.map((visit) => ({
    id: visit.id,
    locationType: visit.locationType,
    address: visit.address,
    city: visit.city,
    status: visit.status,
    scheduledDate: visit.scheduledDate,
    scheduledTime: visit.scheduledTime,
    submittedAt: visit.submittedAt,
    checklist: visit.checklist ?? [],
    findings: visit.findings ?? [],
    reportSummary: visit.reportSummary,
    fieldObservationNotes: visit.fieldObservationNotes,
    officeVerification: visit.officeVerification,
    warehouseVerification: visit.warehouseVerification,
    factoryVerification: visit.factoryVerification,
  }));

  return NextResponse.json({ data });
}
