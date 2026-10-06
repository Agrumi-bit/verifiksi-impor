import { db } from "@/lib/db";
import {
  assignmentLocations,
  locationKey,
  matchVisitLocation,
  type SurveyPayloadLocation,
} from "@/modules/shared/survey-visit-scope";

/**
 * Loads a survey visit for the surveyor working on `assignmentNumber`. A survey result belongs to
 * the application's location, not to the assignment that happened to create the row — so the visit
 * qualifies when it is for one of THIS assignment's own locations, even if another assignment of
 * the same application recorded it. `visit.assignment` is the assignment that RECORDED the visit (its
 * surveyor and PM decision describe the work that was done); `visit.requestingAssignment` is the one
 * being worked on, which is what status updates must target.
 *
 * `mode: "write"` (the default) only accepts this assignment's own locations — only the surveyor
 * assigned to a location may fill it in. `mode: "read"` accepts any location of the same
 * application, so the surveyor can open the other locations' reports read-only.
 */
export async function loadAssignmentVisit(
  assignmentNumber: string,
  visitId: string,
  surveyorId: string,
  mode: "read" | "write" = "write",
) {
  const assignment = await db.assignment.findUnique({
    where: { assignmentNumber },
    include: { application: true, surveyor: true },
  });
  if (!assignment || assignment.surveyorId !== surveyorId) return null;

  const visit = await db.locationVisit.findUnique({ where: { id: visitId } });
  if (!visit || visit.applicationId !== assignment.applicationId) return null;

  const payloadLocations = (assignment.application.payload as { locations?: SurveyPayloadLocation[] } | null)?.locations ?? [];
  const location = matchVisitLocation(visit, payloadLocations);
  const ownKeys = new Set(assignmentLocations(assignment, payloadLocations).map(locationKey));
  const key = location ? locationKey(location) : null;
  if (mode === "write" && (!key || !ownKeys.has(key))) return null;

  const owner =
    visit.assignmentId === assignment.id
      ? assignment
      : await db.assignment.findUnique({ where: { id: visit.assignmentId }, include: { application: true, surveyor: true } });
  if (!owner) return null;

  return { ...visit, assignment: owner, requestingAssignment: assignment };
}
