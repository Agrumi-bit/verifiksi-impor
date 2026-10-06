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
// DRY-RUN by default (read-only). Applying needs BOTH --apply and --backup-file=<path> pointing
// at a non-empty pg_dump of location_visit + assignment taken beforehand, e.g.:
//   pg_dump "$DATABASE_URL" -t location_visit -t assignment -f /tmp/survey-fix-backup.sql
//
// Run with: npx tsx --env-file=.env scripts/fix-survey-visit-assignment.ts [--apply --backup-file=/tmp/x.sql]
import { existsSync, readFileSync, statSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import {
  effectiveAssignmentVisits,
  isAssignmentScoped,
  isVisitForPayloadLocation,
  visitHasData,
  type ScopablePayloadLocation,
} from "../src/modules/shared/survey-visit-scope";

const PLAN = {
  /** The filled-in Kantor visit that must belong to the Kantor assignment. */
  moveVisitId: "cmuvq3n0200920apctis7puh1",
  fromAssignmentId: "cmuvq286v008w0apc0th6walb", // ASG-SURVEY-20261005-ADB6705A (Gudang)
  toAssignmentId: "cmuvq1ja8008u0apcmjgr40kg", // ASG-SURVEY-20261005-11CF8A08 (Kantor)
  /** Empty leftovers on the Kantor assignment — deleted only if verified empty. */
  deleteIfEmptyVisitIds: ["cmuvqeeu700970apc8n6q0mof", "cmuvqeeu800980apcnik2jrxr"],
};

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

async function reportSimilarCases() {
  console.log("\n=== Part 2: similar cases (REPORT ONLY, nothing is changed) ===");
  const surveys = await db.assignment.findMany({
    where: { OR: [{ scheduleType: "survey" }, { surveyorId: { not: null } }] },
    include: { application: { select: { applicationNumber: true, payload: true } }, locationVisits: true },
  });
  const byApplication = new Map<string, typeof surveys>();
  for (const assignment of surveys) {
    byApplication.set(assignment.applicationId, [...(byApplication.get(assignment.applicationId) ?? []), assignment]);
  }

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
        const known = visit.id === PLAN.moveVisitId ? "  (covered by Part 1)" : "";
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

  const plan = await planKnownFix();
  await reportSimilarCases();

  if (!plan) return;
  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply --backup-file=<pg_dump> after approval.");
    return;
  }

  await db.$transaction([
    ...plan.toDelete.map((visit) => db.locationVisit.delete({ where: { id: visit.id } })),
    db.locationVisit.update({ where: { id: plan.moveVisit.id }, data: { assignmentId: plan.toAssignment.id } }),
  ]);
  console.log("\nApplied. Assignment rows and statuses were not touched.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
