import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { effectiveAssignmentVisits, mergeVisitsByLocation, type ScopablePayloadLocation } from "@/modules/shared/survey-visit-scope";

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
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id }, include: { application: true } });
  if (!assignment || assignment.verifikatorId !== verifikatorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  // Survey Lapangan spans the whole application, not just this one
  // assignment — an application can have a separate "survey" assignment
  // (surveyor's field visit) alongside this "dokumen"/"technical" one, and
  // the location visits live on that sibling assignment's own row. Pull
  // every visit across every assignment tied to the same application so a
  // document-only verifikator still sees the surveyor's completed report.
  const siblingAssignments = await db.assignment.findMany({
    where: { applicationId: assignment.applicationId },
    include: { locationVisits: true },
  });
  const payloadLocations =
    (assignment.application.payload as { locations?: ScopablePayloadLocation[] } | null)?.locations ?? [];
  // Each survey assignment only owns its own scheduled location — count a sibling's visit for any
  // other location only if the surveyor actually filled it in there — then keep the most advanced
  // copy per physical location (a re-schedule can leave the same location on two assignments).
  const allVisits = siblingAssignments.flatMap((a) => effectiveAssignmentVisits(a, a.locationVisits, payloadLocations));
  const locationVisits = mergeVisitsByLocation(allVisits, payloadLocations);

  const data = locationVisits.map((visit) => ({
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
