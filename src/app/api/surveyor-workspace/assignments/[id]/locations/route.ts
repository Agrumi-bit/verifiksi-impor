import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { composeLocationAddress, matchLocationTypeLabel } from "@/modules/shared/schema";

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

  // Legacy safety net: a survey assignment created before `locationId` existed only has its old
  // free-text `location` label ("Kantor"/"Gudang") — if that type has no matching entry in the
  // application's own payload (the production bug this was built for: a company's profile
  // gained a Kantor location after the application was already submitted), fall back to the
  // live Company record so the surveyor still has something to work from, instead of a silently
  // missing location. New assignments (scheduled via the locationId-based picker) never hit this
  // branch — their chosen location always exists in the payload by construction.
  const intendedType = matchLocationTypeLabel(assignment.location);
  const hasIntendedType = visits.some((visit) => visit.locationType === intendedType);
  if (intendedType && !hasIntendedType && assignment.application.companyId) {
    const company = await db.company.findUnique({ where: { id: assignment.application.companyId } });
    const companyLocations = (company?.locations as PayloadLocation[] | null) ?? [];
    const fallbackLocation = companyLocations.find((loc) => loc.locationType === intendedType);
    if (fallbackLocation) {
      const fullAddress = composeLocationAddress(fallbackLocation);
      const key = `${fallbackLocation.locationType}::${fullAddress}`;
      let visit = existingByKey.get(key);
      if (!visit) {
        visit = await db.locationVisit.create({
          data: {
            assignmentId: assignment.id,
            locationType: fallbackLocation.locationType,
            address: fullAddress,
            city: fallbackLocation.city ?? null,
          },
        });
      }
      visits.push(visit);
    }
  }

  const payloadLocationTypes = new Set(payloadLocations.map((loc) => loc.locationType));

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
    // True when this location type has no entry in the application's current payload — either
    // the fallback-from-company case above, or a payload location that was removed after this
    // visit was first created. Surfaced as a warning badge, never used to hide the location.
    notInApplicationPayload: !payloadLocationTypes.has(visit.locationType),
  }));

  return NextResponse.json({ data });
}
