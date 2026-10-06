import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { composeLocationAddress, matchLocationTypeLabel } from "@/modules/shared/schema";
import {
  isAssignmentScoped,
  locationsInAssignmentScope,
  visitHasData,
  type ScopablePayloadLocation,
} from "@/modules/shared/survey-visit-scope";

type PayloadLocation = ScopablePayloadLocation & { address: string; city?: string };

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

  // A survey assignment is scheduled for ONE location (`locationId`) — only that location (plus
  // any found in the field on this assignment) gets a visit here. Assignments without a
  // resolvable locationId keep the legacy "every payload location" behaviour.
  const inScopeLocations = locationsInAssignmentScope(assignment, payloadLocations) as PayloadLocation[];
  const isScoped = isAssignmentScoped(assignment, payloadLocations);

  const existingByKey = new Map(
    assignment.locationVisits.map((visit) => [`${visit.locationType}::${visit.address}`, visit]),
  );
  // Visits are tied to the company location id when known (so an edited address doesn't spawn a
  // second visit); type + address is the fallback for visits created before that link existed.
  const existingByCompanyLocationId = new Map(
    assignment.locationVisits.filter((visit) => visit.companyLocationId).map((visit) => [visit.companyLocationId as string, visit]),
  );

  const visits = [];
  for (const loc of inScopeLocations) {
    const fullAddress = composeLocationAddress(loc);
    const key = `${loc.locationType}::${fullAddress}`;
    const companyLocationId = loc.companyLocationId || loc.id || null;
    let visit = (companyLocationId ? existingByCompanyLocationId.get(companyLocationId) : undefined) ?? existingByKey.get(key);
    if (!visit) {
      visit = await db.locationVisit.create({
        data: {
          assignmentId: assignment.id,
          locationType: loc.locationType,
          address: fullAddress,
          city: loc.city ?? null,
          companyLocationId,
        },
      });
    } else if (!visit.companyLocationId && companyLocationId) {
      visit = await db.locationVisit.update({ where: { id: visit.id }, data: { companyLocationId } });
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
  if (!isScoped && intendedType && !hasIntendedType && assignment.application.companyId) {
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

  // Visits this assignment already holds for ANOTHER location (surveyor work saved before visits
  // were scoped) are never dropped — shown, flagged, so the data stays reachable. Empty ones are
  // just leftovers of the old create-a-visit-for-every-location behaviour and stay hidden.
  const shownIds = new Set(visits.map((visit) => visit.id));
  const otherLocationVisitIds = new Set<string>();
  if (isScoped) {
    for (const visit of assignment.locationVisits) {
      if (shownIds.has(visit.id) || !visitHasData(visit)) continue;
      visits.push(visit);
      otherLocationVisitIds.add(visit.id);
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
    // Filled in on this assignment although the location belongs to a sibling assignment.
    belongsToOtherAssignmentLocation: otherLocationVisitIds.has(visit.id),
  }));

  return NextResponse.json({ data });
}
