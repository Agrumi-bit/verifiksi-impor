import { NextResponse } from "next/server";

import { db } from "@/lib/db";
import { getServerSession } from "@/lib/get-session";
import { loadAssignmentVisit } from "@/modules/surveyor-workspace/server/load-assignment-visit";
import {
  collectApplicationVisits,
  isAssignmentSurveyComplete,
  type SurveyPayloadLocation,
} from "@/modules/shared/survey-visit-scope";

const LOCATION_TYPE_LABEL: Record<string, string> = { KANTOR: "Kantor", GUDANG: "Gudang", PABRIK: "Pabrik" };

/**
 * Submits the location's survey report — and, once every location of THIS assignment has a
 * completed result, the assignment itself. A location whose survey was already completed under
 * another assignment of the same application is not re-submitted (its original result and
 * timestamp stay); the surveyor just submits their own assignment.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string; locationId: string }> },
) {
  const session = await getServerSession();
  const surveyorId = session?.user.id;
  if (!surveyorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, locationId } = await params;
  const visit = await loadAssignmentVisit(id, locationId, surveyorId);
  if (!visit) {
    return NextResponse.json({ error: "Lokasi tidak ditemukan" }, { status: 404 });
  }
  const assignment = visit.requestingAssignment;
  const assignmentAlreadySubmitted = assignment.status === "SUBMITTED" || assignment.status === "COMPLETED";
  if (visit.status === "COMPLETED" && assignmentAlreadySubmitted) {
    return NextResponse.json({ error: "Verifikasi lokasi ini sudah selesai." }, { status: 400 });
  }

  let result = visit;
  if (visit.status !== "COMPLETED") {
    const updated = await db.locationVisit.update({
      where: { id: locationId },
      data: { status: "COMPLETED", submittedAt: new Date() },
    });
    result = { ...visit, ...updated };

    const locationLabel = LOCATION_TYPE_LABEL[visit.locationType] ?? visit.locationType;
    await db.applicationMessage.create({
      data: {
        applicationId: assignment.applicationId,
        direction: "SYSTEM",
        text: `Laporan survei lokasi ${locationLabel} telah diselesaikan oleh ${session.user.name}.`,
      },
    });
  }

  const siblings = await db.assignment.findMany({
    where: { applicationId: assignment.applicationId },
    select: { assignmentNumber: true, pmReviewStatus: true, locationVisits: true },
  });
  const payloadLocations = (assignment.application.payload as { locations?: SurveyPayloadLocation[] } | null)?.locations ?? [];
  if (!assignmentAlreadySubmitted && isAssignmentSurveyComplete(assignment, collectApplicationVisits(siblings), payloadLocations)) {
    await db.assignment.update({ where: { id: assignment.id }, data: { status: "SUBMITTED" } });
    await db.applicationMessage.create({
      data: {
        applicationId: assignment.applicationId,
        direction: "SYSTEM",
        text: `Seluruh lokasi telah selesai disurvei oleh ${session.user.name}. Permohonan memasuki tahap berikutnya.`,
      },
    });
  }

  return NextResponse.json({ data: result });
}
