// One-off data fix for the survey-assignment/location mix-up: ASG-SURVEY-20261005-ADB6705A (the
// Gudang assignment) was used to fill in BOTH Kantor and Gudang because the surveyor workspace
// used to create a visit for EVERY application location on every survey assignment. The Kantor
// visit therefore sits on the wrong assignment, and the Kantor assignment
// (ASG-SURVEY-20261005-11CF8A08) holds two empty visits.
//
// Planned changes (see PLAN below):
//   1. delete the empty duplicate Kantor visit on the Kantor assignment (only if truly empty),
//   2. move the filled-in Kantor visit from the Gudang assignment to the Kantor assignment,
//   3. delete the empty Gudang visit on the Kantor assignment (only if truly empty).
// Never touches Assignment rows or statuses — the surveyor submits the Kantor assignment
// themselves afterwards.
//
// Second wave: the same mix-up on two more applications — a surveyor filled in the KANTOR visit
// under a sibling survey assignment. Each is moved to the assignment scheduled for that location
// (SIBLING_MOVES below), with extra guards: ABORT if either assignment already has a PM review
// decision beyond PENDING, if the visit isn't for the target's location or holds no data, or if
// the target already has data for that location; an empty visit for the same location on the
// target is deleted. Any single ABORT stops the whole run before anything is written.
//
// DRY-RUN by default (read-only). Applying needs BOTH --apply and --backup-file=<path> pointing
// at a non-empty pg_dump of location_visit + assignment taken beforehand, e.g.:
//   pg_dump "$DATABASE_URL" -t location_visit -t assignment -f /tmp/survey-fix-backup.sql
//
// Run with: npx tsx --env-file=.env scripts/fix-survey-visit-assignment.ts [--apply --backup-file=/tmp/x.sql]
import { existsSync, readFileSync, statSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

// Visit-scoping helpers: an exact copy of src/modules/shared/survey-visit-scope.ts. Copied (not
// imported) because the production "migrate" image this script runs in ships scripts/ and the
// generated Prisma client but not src/modules.
type ScopablePayloadLocation = {
  id?: string;
  companyLocationId?: string;
  locationType: string;
  address?: string;
  addressDesa?: string;
  addressKecamatan?: string;
  discoveredAssignmentId?: string;
};

type ScopableAssignment = { id: string; locationId: string | null };

type ScopableVisit = {
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

/** True when the assignment is tied to a location that actually exists in the payload — only
 * then can its visits be scoped; an unresolvable `locationId` falls back to the legacy
 * "everything" behaviour rather than hiding all of the assignment's work. */
function isAssignmentScoped(assignment: ScopableAssignment, payloadLocations: ScopablePayloadLocation[]): boolean {
  const locationId = assignment.locationId;
  if (!locationId) return false;
  return payloadLocations.some((loc) => loc.id === locationId || loc.companyLocationId === locationId);
}

/** Payload locations this assignment is responsible for: its scheduled location, plus any
 * location the surveyor discovered in the field on this very assignment. */
function locationsInAssignmentScope(
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

function visitHasData(visit: ScopableVisit): boolean {
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

function isVisitForPayloadLocation(visit: ScopableVisit, loc: ScopablePayloadLocation): boolean {
  const key = payloadLocationKey(loc);
  if (visit.companyLocationId && key) return visit.companyLocationId === key;
  return visit.locationType === loc.locationType && visit.address === [loc.address, loc.addressDesa, loc.addressKecamatan].filter(Boolean).join(", ");
}

type ScopedVisit<V> = V & { belongsToOtherAssignmentLocation: boolean };

/**
 * The visits that count as this assignment's own: those for its in-scope locations, plus visits
 * for any OTHER location that already hold data (surveyor work done before scoping existed —
 * never hidden or dropped, flagged `belongsToOtherAssignmentLocation` so the UI can say so).
 * Empty visits for other locations are the artefact of the old "create a visit for every payload
 * location" behaviour and are left out.
 */
function effectiveAssignmentVisits<V extends ScopableVisit>(
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

const PLAN = {
  /** The filled-in Kantor visit that must belong to the Kantor assignment. */
  moveVisitId: "cmuvq3n0200920apctis7puh1",
  fromAssignmentId: "cmuvq286v008w0apc0th6walb", // ASG-SURVEY-20261005-ADB6705A (Gudang)
  toAssignmentId: "cmuvq1ja8008u0apcmjgr40kg", // ASG-SURVEY-20261005-11CF8A08 (Kantor)
  /** Empty leftovers on the Kantor assignment — deleted only if verified empty. */
  deleteIfEmptyVisitIds: ["cmuvqeeu700970apc8n6q0mof", "cmuvqeeu800980apcnik2jrxr"],
};

/** Visits a surveyor filled in under a sibling assignment, resolved by assignment number. */
const SIBLING_MOVES = [
  {
    applicationNumber: "APP-VIU-20261005-0C5111CC",
    visitId: "cmuvs403x009u0apcfv2rbnjm",
    fromAssignmentNumber: "ASG-SURVEY-20261005-869224AC",
    toAssignmentNumber: "ASG-SURVEY-20261005-22501892",
  },
  {
    applicationNumber: "APP-VIU-20261005-8C3445C6",
    visitId: "cmuvcwaz0000h0an5ynt0l1sm",
    fromAssignmentNumber: "ASG-SURVEY-20261005-A9C4C012",
    toAssignmentNumber: "ASG-SURVEY-20261005-A059C1D4",
  },
];

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const backupFile = args.find((arg) => arg.startsWith("--backup-file="))?.slice("--backup-file=".length);

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

type Visit = Awaited<ReturnType<typeof db.locationVisit.findMany>>[number];

function describeVisit(visit: Visit): string {
  return `${visit.id} ${visit.locationType} "${visit.address}" ${visit.status}`;
}

function fail(message: string): never {
  console.error(`\nABORT: ${message}`);
  process.exit(1);
}

function assertBackup(): void {
  if (!backupFile) fail("--apply requires --backup-file=<path to a pg_dump of location_visit + assignment>.");
  if (!existsSync(backupFile) || statSync(backupFile).size === 0) fail(`Backup file ${backupFile} is missing or empty.`);
  const head = readFileSync(backupFile, "utf8");
  if (!head.includes("location_visit") || !head.includes("assignment")) {
    fail(`Backup file ${backupFile} does not look like a dump of location_visit and assignment.`);
  }
  console.log(`Backup file OK: ${backupFile} (${statSync(backupFile).size} bytes)`);
}

async function planKnownFix() {
  console.log("=== Part 1: planned fix ===");
  const [toAssignment, fromAssignment, moveVisit] = await Promise.all([
    db.assignment.findUnique({ where: { id: PLAN.toAssignmentId }, include: { application: true, locationVisits: true } }),
    db.assignment.findUnique({ where: { id: PLAN.fromAssignmentId } }),
    db.locationVisit.findUnique({ where: { id: PLAN.moveVisitId } }),
  ]);
  if (!toAssignment || !fromAssignment || !moveVisit) {
    console.log("Known rows not found in this database (expected on a non-production DB) — nothing to plan.");
    return null;
  }
  if (toAssignment.applicationId !== fromAssignment.applicationId) fail("The two assignments belong to different applications.");
  if (moveVisit.assignmentId !== PLAN.fromAssignmentId) {
    console.log(`Visit ${PLAN.moveVisitId} is already on assignment ${moveVisit.assignmentId} — move not needed.`);
    return null;
  }

  const payloadLocations = (toAssignment.application.payload as { locations?: ScopablePayloadLocation[] } | null)?.locations ?? [];
  const targetLocation = payloadLocations.find(
    (loc) => loc.id === toAssignment.locationId || loc.companyLocationId === toAssignment.locationId,
  );
  if (!targetLocation) fail(`Assignment ${toAssignment.assignmentNumber} has no matching location in the application payload.`);
  if (!isVisitForPayloadLocation(moveVisit, targetLocation)) {
    fail(`Visit ${moveVisit.id} is not for ${toAssignment.assignmentNumber}'s location (${targetLocation.locationType}).`);
  }
  if (!visitHasData(moveVisit)) fail(`Visit ${moveVisit.id} to be moved holds no data — refusing to move an empty visit.`);

  const toDelete: Visit[] = [];
  for (const id of PLAN.deleteIfEmptyVisitIds) {
    const visit = toAssignment.locationVisits.find((v) => v.id === id);
    if (!visit) {
      console.log(`  skip   ${id}: not on ${toAssignment.assignmentNumber} (already gone or elsewhere)`);
      continue;
    }
    if (visitHasData(visit) || visit.reportVerification != null || visit.submittedAt != null) {
      console.log(`  KEEP   ${describeVisit(visit)}: has data, NOT deleting`);
      continue;
    }
    toDelete.push(visit);
  }

  // The moved visit must not collide with another visit for the same location left on the target.
  const remaining = toAssignment.locationVisits.filter((v) => !toDelete.some((d) => d.id === v.id));
  const conflict = remaining.find((v) => isVisitForPayloadLocation(v, targetLocation));
  if (conflict) fail(`${toAssignment.assignmentNumber} still has its own visit for that location after cleanup: ${describeVisit(conflict)}. Resolve by hand.`);

  console.log(`Application ${toAssignment.applicationId}`);
  for (const visit of toDelete) console.log(`  DELETE ${describeVisit(visit)} (empty) from ${toAssignment.assignmentNumber}`);
  console.log(`  MOVE   ${describeVisit(moveVisit)}`);
  console.log(`         ${fromAssignment.assignmentNumber} -> ${toAssignment.assignmentNumber}`);
  return { toDelete, moveVisit, toAssignment };
}

type Plan = {
  toDelete: Visit[];
  moveVisit: Visit;
  toAssignment: { id: string };
};

function isDecidedByPm(pmReviewStatus: string | null): boolean {
  return pmReviewStatus != null && pmReviewStatus !== "PENDING";
}

async function planSiblingMove(move: (typeof SIBLING_MOVES)[number]): Promise<Plan | null> {
  console.log(`\n--- ${move.applicationNumber}: visit ${move.visitId} ---`);
  const [moveVisit, fromAssignment, toAssignment] = await Promise.all([
    db.locationVisit.findUnique({ where: { id: move.visitId } }),
    db.assignment.findUnique({ where: { assignmentNumber: move.fromAssignmentNumber } }),
    db.assignment.findUnique({
      where: { assignmentNumber: move.toAssignmentNumber },
      include: { application: true, locationVisits: true },
    }),
  ]);
  if (!moveVisit || !fromAssignment || !toAssignment) {
    console.log("  Known rows not found in this database (expected on a non-production DB) — nothing to plan.");
    return null;
  }
  if (moveVisit.assignmentId === toAssignment.id) {
    console.log(`  Visit is already on ${toAssignment.assignmentNumber} — move not needed.`);
    return null;
  }
  if (moveVisit.assignmentId !== fromAssignment.id) {
    fail(`${move.visitId} is on assignment ${moveVisit.assignmentId}, expected ${fromAssignment.assignmentNumber}.`);
  }
  if (toAssignment.application.applicationNumber !== move.applicationNumber || fromAssignment.applicationId !== toAssignment.applicationId) {
    fail(`${move.fromAssignmentNumber} / ${move.toAssignmentNumber} do not both belong to ${move.applicationNumber}.`);
  }
  for (const assignment of [fromAssignment, toAssignment]) {
    if (isDecidedByPm(assignment.pmReviewStatus)) {
      fail(`${assignment.assignmentNumber} already has pmReviewStatus ${assignment.pmReviewStatus} — refusing to touch a reviewed assignment.`);
    }
  }

  const payloadLocations = (toAssignment.application.payload as { locations?: ScopablePayloadLocation[] } | null)?.locations ?? [];
  const targetLocation = payloadLocations.find(
    (loc) => loc.id === toAssignment.locationId || loc.companyLocationId === toAssignment.locationId,
  );
  if (!targetLocation) fail(`${toAssignment.assignmentNumber} has no matching location in the application payload.`);
  if (!isVisitForPayloadLocation(moveVisit, targetLocation)) {
    fail(`Visit ${moveVisit.id} is not for ${toAssignment.assignmentNumber}'s location (${targetLocation.locationType}).`);
  }
  if (!visitHasData(moveVisit)) fail(`Visit ${moveVisit.id} to be moved holds no data — refusing to move an empty visit.`);

  const toDelete: Visit[] = [];
  for (const visit of toAssignment.locationVisits.filter((v) => isVisitForPayloadLocation(v, targetLocation))) {
    if (visitHasData(visit) || visit.reportVerification != null || visit.submittedAt != null) {
      fail(`${toAssignment.assignmentNumber} already holds data for that location: ${describeVisit(visit)}. Resolve by hand.`);
    }
    toDelete.push(visit);
  }

  for (const visit of toDelete) console.log(`  DELETE ${describeVisit(visit)} (empty) from ${toAssignment.assignmentNumber}`);
  console.log(`  MOVE   ${describeVisit(moveVisit)}`);
  console.log(`         ${fromAssignment.assignmentNumber} -> ${toAssignment.assignmentNumber}`);
  console.log(`  pmReviewStatus: from=${fromAssignment.pmReviewStatus ?? "(none)"} to=${toAssignment.pmReviewStatus ?? "(none)"}`);
  return { toDelete, moveVisit, toAssignment };
}

async function reportSimilarCases() {
  console.log("\n=== Remaining similar cases (REPORT ONLY, nothing is changed) ===");
  const surveys = await db.assignment.findMany({
    where: { OR: [{ scheduleType: "survey" }, { surveyorId: { not: null } }] },
    include: { application: { select: { applicationNumber: true, payload: true } }, locationVisits: true },
  });
  const byApplication = new Map<string, typeof surveys>();
  for (const assignment of surveys) {
    byApplication.set(assignment.applicationId, [...(byApplication.get(assignment.applicationId) ?? []), assignment]);
  }

  const coveredVisitIds = new Set([PLAN.moveVisitId, ...SIBLING_MOVES.map((move) => move.visitId)]);
  let found = 0;
  for (const siblings of byApplication.values()) {
    const payloadLocations = (siblings[0].application.payload as { locations?: ScopablePayloadLocation[] } | null)?.locations ?? [];
    for (const assignment of siblings) {
      if (!isAssignmentScoped(assignment, payloadLocations)) continue;
      const foreign = effectiveAssignmentVisits(assignment, assignment.locationVisits, payloadLocations).filter(
        (visit) => visit.belongsToOtherAssignmentLocation && (visit.status === "COMPLETED" || visit.status === "IN_PROGRESS"),
      );
      for (const visit of foreign) {
        const owner = siblings.find((other) => {
          if (other.id === assignment.id || !isAssignmentScoped(other, payloadLocations)) return false;
          const loc = payloadLocations.find((l) => l.id === other.locationId || l.companyLocationId === other.locationId);
          return loc ? isVisitForPayloadLocation(visit, loc) : false;
        });
        if (!owner) continue;
        found += 1;
        const known = coveredVisitIds.has(visit.id) ? "  (covered by the plan above)" : "";
        console.log(
          `  ${siblings[0].application.applicationNumber}: ${assignment.assignmentNumber} holds ${visit.status} visit ${visit.id} ` +
            `(${visit.locationType} "${visit.address}") for ${owner.assignmentNumber}'s location${known}`,
        );
      }
    }
  }
  if (found === 0) console.log("  none found");
}

async function main() {
  console.log(apply ? "MODE: APPLY" : "MODE: DRY-RUN (no changes will be written)");
  if (apply) assertBackup();

  // Every plan is built (and every guard checked) before anything is written: one ABORT stops all.
  const plans: Plan[] = [];
  const first = await planKnownFix();
  if (first) plans.push(first);
  console.log("\n=== Second wave: sibling-assignment moves ===");
  for (const move of SIBLING_MOVES) {
    const plan = await planSiblingMove(move);
    if (plan) plans.push(plan);
  }
  await reportSimilarCases();

  if (plans.length === 0) {
    console.log("\nNothing to change.");
    return;
  }
  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply --backup-file=<pg_dump> after approval.");
    return;
  }

  await db.$transaction([
    ...plans.flatMap((plan) => plan.toDelete.map((visit) => db.locationVisit.delete({ where: { id: visit.id } }))),
    ...plans.map((plan) => db.locationVisit.update({ where: { id: plan.moveVisit.id }, data: { assignmentId: plan.toAssignment.id } })),
  ]);
  console.log(`\nApplied ${plans.length} move(s). Assignment rows and statuses were not touched.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
