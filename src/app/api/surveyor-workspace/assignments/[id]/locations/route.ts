import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { composeLocationAddress } from "@/modules/shared/schema";
import {
  assignmentLocations,
  collectApplicationVisits,
  findLocationAssignment,
  groupVisitsByLocation,
  locationKey,
  type SurveyPayloadLocation,
} from "@/modules/shared/survey-visit-scope";

type PayloadLocation = SurveyPayloadLocation & { address: string; city?: string };

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
    include: { application: true },
  });
  if (!assignment || assignment.surveyorId !== surveyorId) {
    return NextResponse.json({ error: "Penugasan tidak ditemukan" }, { status: 404 });
  }

  // The company's current locations win over the application's frozen snapshot, so an edited
  // address/city (e.g. a changed Gudang) shows here instead of the stale submitted one.
  const company = assignment.application.companyId
    ? await db.company.findUnique({ where: { id: assignment.application.companyId }, select: { locations: true } })
    : null;
  const liveLocations = (company?.locations as PayloadLocation[] | null) ?? [];
  const payloadLocations = (
    ((assignment.application.payload as { locations?: PayloadLocation[] } | null)?.locations) ?? []
  ).map((loc) => {
    const live = liveLocations.find((l) => l.id === (loc.companyLocationId || loc.id));
    return live ? { ...loc, address: live.address, addressDesa: live.addressDesa, addressKecamatan: live.addressKecamatan, city: live.city ?? loc.city } : loc;
  });

  // A survey result belongs to the application's location, not to this assignment: take the
  // location's active visit from EVERY assignment of the application. The tab lists ALL of the
  // application's locations; only this assignment's own location(s) are editable (and only those
  // get a visit created when they have none yet) — the others are read-only.
  const siblings = await db.assignment.findMany({
    where: { applicationId: assignment.applicationId },
    select: {
      id: true,
      assignmentNumber: true,
      pmReviewStatus: true,
      status: true,
      scheduleType: true,
      surveyorId: true,
      scheduledDate: true,
      locationId: true,
      location: true,
      surveyor: { select: { name: true } },
      locationVisits: true,
    },
  });
  const surveySiblings = siblings.filter((sibling) => sibling.scheduleType === "survey" || (!sibling.scheduleType && sibling.surveyorId));
  const applicationVisits = collectApplicationVisits(siblings);
  const { groups } = groupVisitsByLocation(applicationVisits, payloadLocations);
  const ownKeys = new Set(assignmentLocations(assignment, payloadLocations).map(locationKey));

  const data = [];
  for (const loc of payloadLocations as PayloadLocation[]) {
    const key = locationKey(loc);
    if (!key) continue;
    const canEdit = ownKeys.has(key);
    let visit = groups.find((group) => group.key === key)?.active ?? null;
    if (!visit && canEdit) {
      const created = await db.locationVisit.create({
        data: {
          assignmentId: assignment.id,
          applicationId: assignment.applicationId,
          locationType: loc.locationType,
          address: composeLocationAddress(loc),
          city: loc.city ?? null,
          companyLocationId: key,
        },
      });
      visit = { ...created, pmApproved: false, assignmentNumber: assignment.assignmentNumber };
    } else if (visit && canEdit && !visit.companyLocationId) {
      await db.locationVisit.update({ where: { id: visit.id }, data: { companyLocationId: key } });
    }

    const owner = findLocationAssignment(surveySiblings, loc, payloadLocations);
    const recordedBy = visit ? (visit as { assignmentNumber?: string }).assignmentNumber ?? assignment.assignmentNumber : null;
    // Surveyed under a different assignment of this application: shown as the location's result.
    const surveyedElsewhere = canEdit && visit?.status === "COMPLETED" && recordedBy !== assignment.assignmentNumber;
    data.push({
      locationKey: key,
      id: visit?.id ?? null,
      locationType: loc.locationType,
      address: composeLocationAddress(loc) || visit?.address || "",
      city: loc.city ?? visit?.city ?? null,
      status: visit?.status ?? "NOT_STARTED",
      progress: computeProgress(visit?.checklist),
      scheduledDate: visit?.scheduledDate ?? null,
      scheduledTime: visit?.scheduledTime ?? null,
      submittedAt: visit?.submittedAt ?? null,
      checklist: visit?.checklist ?? [],
      findings: visit?.findings ?? [],
      reportSummary: visit?.reportSummary ?? null,
      fieldObservationNotes: visit?.fieldObservationNotes ?? null,
      officeVerification: visit?.officeVerification ?? null,
      warehouseVerification: visit?.warehouseVerification ?? null,
      factoryVerification: visit?.factoryVerification ?? null,
      reportVerification: visit?.reportVerification ?? null,
      notInApplicationPayload: false,
      canEdit,
      owner: owner
        ? { assignmentNumber: owner.assignmentNumber, scheduledDate: owner.scheduledDate, surveyorName: owner.surveyor?.name ?? null }
        : null,
      surveyedElsewhere: surveyedElsewhere && recordedBy ? { assignmentNumber: recordedBy, surveyedAt: visit?.submittedAt ?? null } : null,
      assignmentStatus: assignment.status,
    });
  }

  return NextResponse.json({ data });
}
