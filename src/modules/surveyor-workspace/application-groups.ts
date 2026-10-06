import {
  assignmentLocations,
  groupVisitsByLocation,
  locationKey,
  type SurveyPayloadLocation,
  type SurveyVisit,
} from "@/modules/shared/survey-visit-scope";

import type { AssignmentPriorityValue, AssignmentStatusValue } from "./status";

/**
 * "My Assignments" is organised per application (one card per company/application), not per
 * assignment: an application with several locations has one survey assignment per location, and
 * the surveyor wants one place showing the company, all its locations and where each one stands.
 */

export type GroupableAssignment = {
  id: string;
  assignmentNumber: string;
  status: AssignmentStatusValue;
  priority: AssignmentPriorityValue;
  surveyorId: string | null;
  locationId: string | null;
  location: string | null;
  pmReviewStatus: string | null;
  createdAt: Date | string;
  applicationId: string;
  locationVisits: SurveyVisit[];
};

export type ApplicationGroupInfo = {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  importTypes: string[];
  locations: SurveyPayloadLocation[];
};

export type GroupLocationRow = {
  locationKey: string;
  locationType: string;
  address: string;
  city: string | null;
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED";
  /** Active survey result for this location, null while it has none. */
  visitId: string | null;
  /** The viewing surveyor's own assignment covering this location, if any. */
  myAssignmentNumber: string | null;
  /** The assignment (anyone's) responsible for this location, if any. */
  assignmentNumber: string | null;
};

export type ApplicationGroup = {
  applicationId: string;
  applicationNumber: string;
  companyName: string;
  verificationType: string;
  importTypes: string[];
  priority: AssignmentPriorityValue;
  status: AssignmentStatusValue;
  /** The viewer's own assignments for this application, newest first. */
  assignmentNumbers: string[];
  /** Where "View Assignment" goes: the assignment that most needs attention. */
  primaryAssignmentNumber: string;
  createdAt: string;
  locationSummary: { total: number; completed: number };
  locations: GroupLocationRow[];
};

const PRIORITY_RANK: Record<AssignmentPriorityValue, number> = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };

/** Combined status of several assignments: whatever still needs the surveyor wins. */
const STATUS_PRECEDENCE: AssignmentStatusValue[] = ["IN_PROGRESS", "RETURNED", "ASSIGNED", "SCHEDULED", "SUBMITTED", "COMPLETED"];

export function combineAssignmentStatuses(statuses: AssignmentStatusValue[]): AssignmentStatusValue {
  return STATUS_PRECEDENCE.find((candidate) => statuses.includes(candidate)) ?? "ASSIGNED";
}

export function highestPriority(priorities: AssignmentPriorityValue[]): AssignmentPriorityValue {
  return priorities.reduce<AssignmentPriorityValue>((best, p) => (PRIORITY_RANK[p] > PRIORITY_RANK[best] ? p : best), "LOW");
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

/**
 * Builds one card per application the surveyor is assigned to. `siblings` are EVERY survey
 * assignment of those applications (also other surveyors'), so each location row shows the
 * application location's single survey result no matter who recorded it.
 */
export function buildApplicationGroups(
  surveyorId: string,
  siblings: GroupableAssignment[],
  applications: Map<string, ApplicationGroupInfo>,
): ApplicationGroup[] {
  const mine = siblings.filter((assignment) => assignment.surveyorId === surveyorId);
  const applicationIds = [...new Set(mine.map((assignment) => assignment.applicationId))];

  const groups: ApplicationGroup[] = [];
  for (const applicationId of applicationIds) {
    const info = applications.get(applicationId);
    if (!info) continue;
    const myAssignments = mine
      .filter((assignment) => assignment.applicationId === applicationId)
      .sort((a, b) => Date.parse(toIso(b.createdAt)) - Date.parse(toIso(a.createdAt)));
    const applicationAssignments = siblings.filter((assignment) => assignment.applicationId === applicationId);

    const candidates = applicationAssignments.flatMap((assignment) =>
      assignment.locationVisits.map((visit) => ({ ...visit, pmApproved: assignment.pmReviewStatus === "APPROVED" })),
    );
    const { groups: byLocation } = groupVisitsByLocation(candidates, info.locations);

    const rows: GroupLocationRow[] = info.locations.flatMap((location) => {
      const key = locationKey(location);
      if (!key) return [];
      const active = byLocation.find((group) => group.key === key)?.active ?? null;
      const covering = (assignment: GroupableAssignment) => assignmentLocations(assignment, info.locations).some((loc) => locationKey(loc) === key);
      const own = myAssignments.find(covering) ?? null;
      const responsible =
        applicationAssignments.find((assignment) => assignment.locationId && covering(assignment)) ?? applicationAssignments.find(covering) ?? null;
      const address = [location.address, location.addressDesa, location.addressKecamatan].filter(Boolean).join(", ");
      return [
        {
          locationKey: key,
          locationType: location.locationType,
          address,
          city: (location as { city?: string }).city ?? null,
          status: (active?.status as GroupLocationRow["status"] | undefined) ?? "NOT_STARTED",
          visitId: active?.id ?? null,
          myAssignmentNumber: own?.assignmentNumber ?? null,
          assignmentNumber: responsible?.assignmentNumber ?? null,
        },
      ];
    });

    const needsAttention = (assignment: GroupableAssignment) => (assignment.status === "COMPLETED" || assignment.status === "SUBMITTED" ? 1 : 0);
    const primary = [...myAssignments].sort((a, b) => needsAttention(a) - needsAttention(b))[0];

    groups.push({
      applicationId,
      applicationNumber: info.applicationNumber,
      companyName: info.companyName,
      verificationType: info.verificationType,
      importTypes: info.importTypes,
      priority: highestPriority(myAssignments.map((assignment) => assignment.priority)),
      status: combineAssignmentStatuses(myAssignments.map((assignment) => assignment.status)),
      assignmentNumbers: myAssignments.map((assignment) => assignment.assignmentNumber),
      primaryAssignmentNumber: primary.assignmentNumber,
      createdAt: toIso(myAssignments[0].createdAt),
      locationSummary: { total: rows.length, completed: rows.filter((row) => row.status === "COMPLETED").length },
      locations: rows,
    });
  }
  return groups.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
