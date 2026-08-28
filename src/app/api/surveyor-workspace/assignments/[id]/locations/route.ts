import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { composeLocationAddress } from "@/modules/shared/schema";

type PayloadLocation = {
  locationType: string;
  address: string;
  addressDesa?: string;
  addressKecamatan?: string;
  city?: string;
};

function computeProgress(checklist: unknown): number {
  if (!Array.isArray(checklist) || checklist.length === 0) return 0;
  const answered = checklist.filter(
    (item) => item && typeof item === "object" && "result" in item && item.result != null,
  ).length;
  return Math.round((answered / checklist.length) * 100);
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber: id },
    include: { application: true, locationVisits: true },
  });
  if (!assignment || assignment.surveyorId !== surveyorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  const payloadLocations =
    ((assignment.application.payload as { locations?: PayloadLocation[] } | null)?.locations) ??
    [];

  const existingByKey = new Map(
    assignment.locationVisits.map((visit) => [`${visit.locationType}::${visit.address}`, visit]),
  );

  const visits = [];
  for (const loc of payloadLocations) {
    const fullAddress = composeLocationAddress(loc);
    const key = `${loc.locationType}::${fullAddress}`;
    let visit = existingByKey.get(key);
    if (!visit) {
      visit = await db.locationVisit.create({
        data: {
          assignmentId: assignment.id,
          locationType: loc.locationType,
          address: fullAddress,
          city: loc.city ?? null,
        },
      });
    }
    visits.push(visit);
  }

  const data = visits.map((visit) => ({
    id: visit.id,
    locationType: visit.locationType,
    address: visit.address,
    city: visit.city,
    status: visit.status,
    progress: computeProgress(visit.checklist),
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
    reportVerification: visit.reportVerification,
  }));

  return NextResponse.json({ data });
}
