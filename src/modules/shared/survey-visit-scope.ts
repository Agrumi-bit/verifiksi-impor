import { composeLocationAddress } from "./schema";

/**
 * A survey Assignment is scheduled for ONE application location (`Assignment.locationId`, the
 * `id` — or `companyLocationId` — of an Application.payload `locations[]` entry). An application
 * with several locations therefore has several survey assignments, each owning only its own
 * location's LocationVisit. Assignments without `locationId` (created before it existed) keep
 * the old behaviour: every payload location belongs to them.
 */

export type ScopablePayloadLocation = {
  id?: string;
  companyLocationId?: string;
  locationType: string;
  address?: string;
  addressDesa?: string;
  addressKecamatan?: string;
  discoveredAssignmentId?: string;
};

export type ScopableAssignment = { id: string; locationId: string | null };

export type ScopableVisit = {
  status: string;
  locationType: string;
  address: string;
  companyLocationId: string | null;
  checklist?: unknown;
  photos?: unknown;
  interviews?: unknown;
  findings?: unknown;
  reportSummary?: string | null;
  fieldObservationNotes?: string | null;
  officeVerification?: unknown;
  warehouseVerification?: unknown;
  factoryVerification?: unknown;
};

const VISIT_STATUS_RANK: Record<string, number> = { NOT_STARTED: 0, IN_PROGRESS: 1, COMPLETED: 2 };

/** True when the assignment is tied to a location that actually exists in the payload — only
 * then can its visits be scoped; an unresolvable `locationId` falls back to the legacy
 * "everything" behaviour rather than hiding all of the assignment's work. */
export function isAssignmentScoped(assignment: ScopableAssignment, payloadLocations: ScopablePayloadLocation[]): boolean {
  const locationId = assignment.locationId;
  if (!locationId) return false;
  return payloadLocations.some((loc) => loc.id === locationId || loc.companyLocationId === locationId);
}

/** Payload locations this assignment is responsible for: its scheduled location, plus any
 * location the surveyor discovered in the field on this very assignment. */
export function locationsInAssignmentScope(
  assignment: ScopableAssignment,
  payloadLocations: ScopablePayloadLocation[],
): ScopablePayloadLocation[] {
  if (!isAssignmentScoped(assignment, payloadLocations)) return payloadLocations;
  return payloadLocations.filter(
    (loc) =>
      loc.id === assignment.locationId ||
      loc.companyLocationId === assignment.locationId ||
      loc.discoveredAssignmentId === assignment.id,
  );
}

function payloadLocationKey(loc: ScopablePayloadLocation): string | null {
  return loc.companyLocationId || loc.id || null;
}

export function visitHasData(visit: ScopableVisit): boolean {
  if (visit.status !== "NOT_STARTED") return true;
  const filled = (value: unknown) => (Array.isArray(value) ? value.length > 0 : value != null);
  return (
    filled(visit.checklist) ||
    filled(visit.photos) ||
    filled(visit.interviews) ||
    filled(visit.findings) ||
    filled(visit.officeVerification) ||
    filled(visit.warehouseVerification) ||
    filled(visit.factoryVerification) ||
    Boolean(visit.reportSummary) ||
    Boolean(visit.fieldObservationNotes)
  );
}

export function isVisitForPayloadLocation(visit: ScopableVisit, loc: ScopablePayloadLocation): boolean {
  const key = payloadLocationKey(loc);
  if (visit.companyLocationId && key) return visit.companyLocationId === key;
  return visit.locationType === loc.locationType && visit.address === composeLocationAddress(loc);
}

export type ScopedVisit<V> = V & { belongsToOtherAssignmentLocation: boolean };

/**
 * The visits that count as this assignment's own: those for its in-scope locations, plus visits
 * for any OTHER location that already hold data (surveyor work done before scoping existed —
 * never hidden or dropped, flagged `belongsToOtherAssignmentLocation` so the UI can say so).
 * Empty visits for other locations are the artefact of the old "create a visit for every payload
 * location" behaviour and are left out.
 */
export function effectiveAssignmentVisits<V extends ScopableVisit>(
  assignment: ScopableAssignment,
  visits: V[],
  payloadLocations: ScopablePayloadLocation[],
): ScopedVisit<V>[] {
  if (!isAssignmentScoped(assignment, payloadLocations)) {
    return visits.map((visit) => ({ ...visit, belongsToOtherAssignmentLocation: false }));
  }
  const inScope = locationsInAssignmentScope(assignment, payloadLocations);
  const result: ScopedVisit<V>[] = [];
  for (const visit of visits) {
    if (inScope.some((loc) => isVisitForPayloadLocation(visit, loc))) {
      result.push({ ...visit, belongsToOtherAssignmentLocation: false });
    } else if (visitHasData(visit)) {
      result.push({ ...visit, belongsToOtherAssignmentLocation: true });
    }
  }
  return result;
}

/** One key per physical location: the company-location id when the visit has one, otherwise
 * type + address (visits created before that link existed). When the application's payload
 * locations are given, a visit without the link is first matched to its payload location, so a
 * legacy copy and a linked copy of the same location still merge into one. */
export function visitLocationKey(
  visit: Pick<ScopableVisit, "companyLocationId" | "locationType" | "address">,
  payloadLocations: ScopablePayloadLocation[] = [],
): string {
  if (visit.companyLocationId) return visit.companyLocationId;
  const matched = payloadLocations.find((loc) => isVisitForPayloadLocation({ ...visit, status: "" }, loc));
  return (matched && payloadLocationKey(matched)) || `${visit.locationType}::${visit.address}`;
}

/**
 * Merges visits gathered from several survey assignments of one application into one row per
 * physical location, keeping the most-progressed copy (a re-schedule can leave the same
 * location on more than one assignment). Merging by location — not by `locationType` — keeps two
 * Gudang locations apart instead of letting one overwrite the other.
 */
export function mergeVisitsByLocation<V extends ScopableVisit>(
  visits: V[],
  payloadLocations: ScopablePayloadLocation[] = [],
): V[] {
  const byKey = new Map<string, V>();
  for (const visit of visits) {
    const key = visitLocationKey(visit, payloadLocations);
    const existing = byKey.get(key);
    if (!existing || (VISIT_STATUS_RANK[visit.status] ?? 0) > (VISIT_STATUS_RANK[existing.status] ?? 0)) {
      byKey.set(key, visit);
    }
  }
  return [...byKey.values()];
}
