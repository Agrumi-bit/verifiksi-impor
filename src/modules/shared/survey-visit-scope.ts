import { composeLocationAddress, matchLocationTypeLabel } from "./schema";

/**
 * Survey results belong to the APPLICATION's locations: one LocationVisit per
 * (applicationId, application location). A survey assignment (one per location, scheduled by
 * Customer Relation via `Assignment.locationId`) only shows and works on its own location, but the
 * visit it works on is the application location's single "active" visit — even if another
 * assignment created it. Everything that reads survey results (surveyor, verifikator, technical
 * analyst, PM, company, reports, "ready for review" counts) goes through the helpers below, so
 * they all agree on one visit per location.
 */

export type SurveyPayloadLocation = {
  id?: string;
  companyLocationId?: string;
  locationType: string;
  address?: string;
  addressDesa?: string;
  addressKecamatan?: string;
  discoveredAssignmentId?: string;
};

export type SurveyAssignment = { id: string; locationId: string | null; location?: string | null };

export type SurveyVisit = {
  id: string;
  status: string;
  locationType: string;
  address: string;
  companyLocationId: string | null;
  submittedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  checklist?: unknown;
  photos?: unknown;
  interviews?: unknown;
  findings?: unknown;
  reportSummary?: string | null;
  fieldObservationNotes?: string | null;
  officeVerification?: unknown;
  warehouseVerification?: unknown;
  factoryVerification?: unknown;
  reportVerification?: unknown;
};

/** A visit plus what the selection rules need to know about the assignment that owns it. */
export type VisitCandidate = SurveyVisit & { pmApproved?: boolean };

/** The identity of an application location: the company-location id when known, else its own id. */
export function locationKey(loc: SurveyPayloadLocation): string | null {
  return loc.companyLocationId || loc.id || null;
}

function locationMatchesId(loc: SurveyPayloadLocation, id: string): boolean {
  return loc.id === id || loc.companyLocationId === id;
}

/** Which payload location a visit is for (by its company-location link, else type + address), or
 * null for a visit whose location is no longer in the application. */
export function matchVisitLocation(visit: SurveyVisit, payloadLocations: SurveyPayloadLocation[]): SurveyPayloadLocation | null {
  if (visit.companyLocationId) {
    const linked = payloadLocations.find((loc) => locationMatchesId(loc, visit.companyLocationId as string));
    if (linked) return linked;
  }
  return (
    payloadLocations.find((loc) => visit.locationType === loc.locationType && visit.address === composeLocationAddress(loc)) ?? null
  );
}

/** The payload locations a survey assignment is responsible for. */
export function assignmentLocations(assignment: SurveyAssignment, payloadLocations: SurveyPayloadLocation[]): SurveyPayloadLocation[] {
  if (assignment.locationId) {
    const scheduledId = assignment.locationId;
    const own = payloadLocations.filter((loc) => locationMatchesId(loc, scheduledId));
    if (own.length > 0) {
      // A facility the surveyor found in the field on this very assignment stays with it.
      return [...own, ...payloadLocations.filter((loc) => !own.includes(loc) && loc.discoveredAssignmentId === assignment.id)];
    }
    return payloadLocations;
  }
  // Older assignments only have the free-text label ("Kantor"/"Gudang"/"Factory"): trust it when it
  // names exactly one location, otherwise it is ambiguous and the assignment keeps every location.
  const type = matchLocationTypeLabel(assignment.location);
  if (type) {
    const ofType = payloadLocations.filter((loc) => loc.locationType === type);
    if (ofType.length === 1) return ofType;
  }
  return payloadLocations;
}

/**
 * The survey assignment responsible for a location, or null when none is assigned yet. An
 * assignment explicitly scheduled for the location (`locationId`) wins, then one that found it in
 * the field; only then an older assignment without `locationId` whose label narrows to it.
 */
export function findLocationAssignment<A extends SurveyAssignment>(
  assignments: A[],
  location: SurveyPayloadLocation,
  payloadLocations: SurveyPayloadLocation[],
): A | null {
  const explicit = assignments.find((assignment) => assignment.locationId && locationMatchesId(location, assignment.locationId));
  if (explicit) return explicit;
  const discovered = assignments.find((assignment) => location.discoveredAssignmentId === assignment.id);
  if (discovered) return discovered;
  // Legacy: no (resolvable) locationId — take the assignment whose label narrows to exactly this
  // location. An ambiguous legacy assignment (it would claim every location) is not an owner.
  return (
    assignments.find((assignment) => {
      if (assignment.locationId && payloadLocations.some((loc) => locationMatchesId(loc, assignment.locationId as string))) return false;
      const own = assignmentLocations(assignment, payloadLocations);
      return own.length === 1 && own[0] === location;
    }) ?? null
  );
}

function isFilled(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : value != null;
}

/** How much the surveyor actually entered — answered checklist rows, photos, interviews, findings,
 * and each filled verification form / note. */
export function visitFilledCount(visit: SurveyVisit): number {
  const answered = Array.isArray(visit.checklist)
    ? visit.checklist.filter((item) => item && typeof item === "object" && "result" in item && (item as { result: unknown }).result != null).length
    : 0;
  const lengthOf = (value: unknown) => (Array.isArray(value) ? value.length : 0);
  return (
    answered +
    lengthOf(visit.photos) +
    lengthOf(visit.interviews) +
    lengthOf(visit.findings) +
    [visit.officeVerification, visit.warehouseVerification, visit.factoryVerification].filter((v) => v != null).length +
    (visit.reportSummary ? 1 : 0) +
    (visit.fieldObservationNotes ? 1 : 0)
  );
}

export function visitHasData(visit: SurveyVisit): boolean {
  return (
    visit.status !== "NOT_STARTED" ||
    visitFilledCount(visit) > 0 ||
    isFilled(visit.checklist) ||
    isFilled(visit.photos) ||
    isFilled(visit.interviews) ||
    isFilled(visit.findings)
  );
}

function timestamp(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const time = value instanceof Date ? value.getTime() : Date.parse(value);
  return Number.isNaN(time) ? 0 : time;
}

function isVerified(visit: SurveyVisit): boolean {
  return (visit.reportVerification as { decision?: string | null } | null)?.decision === "VERIFIED";
}

/** Selection rules, strongest first. Each entry is also the human-readable reason it was chosen. */
const SELECTION_RULES: { reason: string; score: (visit: VisitCandidate) => number }[] = [
  { reason: "penugasannya sudah disetujui PM", score: (v) => (v.pmApproved ? 1 : 0) },
  { reason: "laporan sudah VERIFIED oleh verifikator", score: (v) => (isVerified(v) ? 1 : 0) },
  { reason: "sudah disubmit (submittedAt terisi)", score: (v) => (v.submittedAt ? 1 : 0) },
  { reason: "berstatus COMPLETED", score: (v) => (v.status === "COMPLETED" ? 1 : 0) },
  { reason: "IN_PROGRESS dengan isian terbanyak", score: (v) => (v.status === "IN_PROGRESS" ? 1 + visitFilledCount(v) : 0) },
  { reason: "paling baru", score: (v) => Math.max(timestamp(v.submittedAt), timestamp(v.updatedAt)) },
];

/** Ranks two candidates; > 0 means `a` should be kept over `b`. */
function compareCandidates(a: VisitCandidate, b: VisitCandidate): number {
  for (const rule of SELECTION_RULES) {
    const diff = rule.score(a) - rule.score(b);
    if (diff !== 0) return diff;
  }
  return 0;
}

/** The single visit to keep among visits for the same location, and why it won. */
export function pickActiveVisit<V extends VisitCandidate>(candidates: V[]): { visit: V; reason: string } | null {
  if (candidates.length === 0) return null;
  const ranked = [...candidates].sort((a, b) => compareCandidates(b, a) || a.id.localeCompare(b.id));
  const winner = ranked[0];
  if (ranked.length === 1) return { visit: winner, reason: "satu-satunya visit" };
  const runnerUp = ranked[1];
  const decisive = SELECTION_RULES.find((rule) => rule.score(winner) !== rule.score(runnerUp));
  return { visit: winner, reason: decisive ? `dipilih karena ${decisive.reason}` : "dipilih karena identik; diambil yang pertama" };
}

export type LocationGroup<V extends VisitCandidate> = {
  location: SurveyPayloadLocation;
  key: string;
  active: V | null;
  /** Every visit for this location, active one first. */
  visits: V[];
};

/** Groups visits by application location. Visits for locations missing from the payload come back
 * as `orphans` so callers can report them instead of silently losing them. */
export function groupVisitsByLocation<V extends VisitCandidate>(
  visits: V[],
  payloadLocations: SurveyPayloadLocation[],
): { groups: LocationGroup<V>[]; orphans: V[] } {
  const byKey = new Map<string, V[]>();
  const orphans: V[] = [];
  for (const visit of visits) {
    const loc = matchVisitLocation(visit, payloadLocations);
    const key = loc ? locationKey(loc) : null;
    if (!loc || !key) {
      orphans.push(visit);
      continue;
    }
    byKey.set(key, [...(byKey.get(key) ?? []), visit]);
  }
  const groups: LocationGroup<V>[] = [];
  for (const location of payloadLocations) {
    const key = locationKey(location);
    if (!key) continue;
    const group = byKey.get(key) ?? [];
    const picked = pickActiveVisit(group);
    groups.push({
      location,
      key,
      active: picked?.visit ?? null,
      visits: picked ? [picked.visit, ...group.filter((v) => v !== picked.visit)] : [],
    });
  }
  return { groups, orphans };
}

/** One active visit per application location — what every report/overview should show. */
export function activeVisitsForApplication<V extends VisitCandidate>(visits: V[], payloadLocations: SurveyPayloadLocation[]): V[] {
  return groupVisitsByLocation(visits, payloadLocations)
    .groups.map((group) => group.active)
    .filter((visit): visit is V => visit != null);
}

/** The active visits of ONE assignment's own locations (a location with no visit yet is absent). */
export function assignmentActiveVisits<V extends VisitCandidate>(
  assignment: SurveyAssignment,
  applicationVisits: V[],
  payloadLocations: SurveyPayloadLocation[],
): V[] {
  const ownKeys = new Set(assignmentLocations(assignment, payloadLocations).map(locationKey));
  return groupVisitsByLocation(applicationVisits, payloadLocations)
    .groups.filter((group) => ownKeys.has(group.key) && group.active)
    .map((group) => group.active as V);
}

/** True when every location of the assignment has a COMPLETED active visit. */
export function isAssignmentSurveyComplete<V extends VisitCandidate>(
  assignment: SurveyAssignment,
  applicationVisits: V[],
  payloadLocations: SurveyPayloadLocation[],
): boolean {
  const locations = assignmentLocations(assignment, payloadLocations);
  if (locations.length === 0) return false;
  const groups = groupVisitsByLocation(applicationVisits, payloadLocations).groups;
  return locations.every((loc) => groups.find((group) => group.key === locationKey(loc))?.active?.status === "COMPLETED");
}

/** For readers that hold every survey assignment of an application: all their visits as
 * candidates, tagged with the owning assignment's number and PM decision. */
export function collectApplicationVisits<
  A extends { assignmentNumber: string; pmReviewStatus: string | null; locationVisits: SurveyVisit[] },
>(assignments: A[]): (A["locationVisits"][number] & { pmApproved: boolean; assignmentNumber: string })[] {
  return assignments.flatMap((assignment) =>
    assignment.locationVisits.map((visit) => ({
      ...visit,
      pmApproved: assignment.pmReviewStatus === "APPROVED",
      assignmentNumber: assignment.assignmentNumber,
    })),
  );
}
