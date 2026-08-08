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
  const assignment = await db.assignment.findUnique({ where: { assignmentNumber: id } });
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
  const allVisits = siblingAssignments.flatMap((a) => a.locationVisits);

  // If the same location ended up with more than one visit row (e.g. a
  // survey re-assignment), keep the most advanced one per locationType so
  // the tab shows one row per physical location, not one per assignment.
  const STATUS_RANK: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 };
  const byLocationType = new Map<string, (typeof allVisits)[number]>();
  for (const visit of allVisits) {
    const existing = byLocationType.get(visit.locationType);
    if (!existing || STATUS_RANK[visit.status] > STATUS_RANK[existing.status]) {
      byLocationType.set(visit.locationType, visit);
    }
  }
  const locationVisits = [...byLocationType.values()];

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
