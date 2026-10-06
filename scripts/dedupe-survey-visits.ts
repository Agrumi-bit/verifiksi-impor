// Cleans up duplicate survey visits. Business rule: ONE survey result (LocationVisit) per
// application location. The surveyor workspace used to create a visit for EVERY application
// location on EVERY survey assignment (2 locations became 4 visits). Going forward the code keeps
// one visit per location (migration 33 added location_visit.applicationId); this script fixes the
// existing data.
//
// For every (application, application location) with more than one visit it KEEPS exactly one:
//   1. the visit whose assignment is PM APPROVED,   2. report VERIFIED,   3. submittedAt set,
//   4. status COMPLETED,   5. IN_PROGRESS with the most entries,   6. the most recent
// and DELETES the others. Nothing else is touched: Assignment rows/statuses are never changed, files
// stay on disk (their paths are only listed), and visits for a location that is not in the
// application are reported, not deleted. A kept visit missing its location link gets
// companyLocationId filled from the application's location. (location_visit.applicationId itself is
// filled by migration 33.)
//
// DRY-RUN by default (read-only): prints every KEEP / DELETE row. Applying needs BOTH --apply and
// --backup-file=<path> pointing at a non-empty pg_dump of location_visit + assignment taken first:
//   pg_dump "$DATABASE_URL" -t location_visit -t assignment -f /tmp/survey-dedupe-backup.sql
//
// Run with: npx tsx --env-file=.env scripts/dedupe-survey-visits.ts [--apply --backup-file=/tmp/x.sql]
/* eslint-disable @typescript-eslint/no-unused-vars -- the helper block below is an exact copy of the app module, including functions this script does not call */
import { existsSync, readFileSync, statSync } from "node:fs";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

// ---- Helpers: an exact copy of src/modules/shared/survey-visit-scope.ts (plus the two functions it
// imports from src/modules/shared/schema.ts). Copied, not imported, because the production
// "migrate" image ships scripts/ and the generated Prisma client but not src/modules.
function composeLocationAddress(loc: { address?: string; addressDesa?: string; addressKecamatan?: string }): string {
  return [loc.address, loc.addressDesa, loc.addressKecamatan].filter(Boolean).join(", ");
}

function matchLocationTypeLabel(label: string | null | undefined): "KANTOR" | "GUDANG" | "PABRIK" | null {
  const normalized = label?.trim().toUpperCase();
  if (!normalized) return null;
  if (normalized === "KANTOR") return "KANTOR";
  if (normalized === "GUDANG") return "GUDANG";
  if (normalized === "PABRIK" || normalized === "FACTORY") return "PABRIK";
  return null;
}

/**
 * Survey results belong to the APPLICATION's locations: one LocationVisit per
 * (applicationId, application location). A survey assignment (one per location, scheduled by
 * Customer Relation via `Assignment.locationId`) only shows and works on its own location, but the
 * visit it works on is the application location's single "active" visit — even if another
 * assignment created it. Everything that reads survey results (surveyor, verifikator, technical
 * analyst, PM, company, reports, "ready for review" counts) goes through the helpers below, so
 * they all agree on one visit per location.
 */

type SurveyPayloadLocation = {
  id?: string;
  companyLocationId?: string;
  locationType: string;
  address?: string;
  addressDesa?: string;
  addressKecamatan?: string;
  discoveredAssignmentId?: string;
};

type SurveyAssignment = { id: string; locationId: string | null; location?: string | null };

type SurveyVisit = {
  id: string;
  status: string;
  locationType: string;
  address: string;
  companyLocationId: string | null;
  submittedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
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
type VisitCandidate = SurveyVisit & { pmApproved?: boolean };

/** The identity of an application location: the company-location id when known, else its own id. */
function locationKey(loc: SurveyPayloadLocation): string | null {
  return loc.companyLocationId || loc.id || null;
}

function locationMatchesId(loc: SurveyPayloadLocation, id: string): boolean {
  return loc.id === id || loc.companyLocationId === id;
}

/** Which payload location a visit is for (by its company-location link, else type + address), or
 * null for a visit whose location is no longer in the application. */
function matchVisitLocation(visit: SurveyVisit, payloadLocations: SurveyPayloadLocation[]): SurveyPayloadLocation | null {
  if (visit.companyLocationId) {
    const linked = payloadLocations.find((loc) => locationMatchesId(loc, visit.companyLocationId as string));
    if (linked) return linked;
  }
  return (
    payloadLocations.find((loc) => visit.locationType === loc.locationType && visit.address === composeLocationAddress(loc)) ?? null
  );
}

/** The payload locations a survey assignment is responsible for. */
function assignmentLocations(assignment: SurveyAssignment, payloadLocations: SurveyPayloadLocation[]): SurveyPayloadLocation[] {
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

function isFilled(value: unknown): boolean {
  return Array.isArray(value) ? value.length > 0 : value != null;
}

/** Number of values the surveyor actually filled in somewhere in a form/JSON blob: non-empty text,
 * numbers, ticked checkboxes and list items, recursively. Defaults (empty text, unticked boxes)
 * don't count, so an untouched form scores 0. */
function countFilledValues(value: unknown): number {
  if (value == null) return 0;
  if (typeof value === "string") return value.trim() ? 1 : 0;
  if (typeof value === "number") return 1;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (Array.isArray(value)) return value.reduce((sum: number, item) => sum + countFilledValues(item), 0);
  if (typeof value === "object") return Object.values(value).reduce((sum: number, item) => sum + countFilledValues(item), 0);
  return 0;
}

/** How much the surveyor actually entered — answered checklist rows plus every filled value in the
 * photos, interviews, findings and the office/warehouse/factory verification forms, and the notes. */
function visitFilledCount(visit: SurveyVisit): number {
  const answered = Array.isArray(visit.checklist)
    ? visit.checklist.filter((item) => item && typeof item === "object" && "result" in item && (item as { result: unknown }).result != null).length
    : 0;
  return (
    answered +
    countFilledValues(visit.photos) +
    countFilledValues(visit.interviews) +
    countFilledValues(visit.findings) +
    countFilledValues(visit.officeVerification) +
    countFilledValues(visit.warehouseVerification) +
    countFilledValues(visit.factoryVerification) +
    (visit.reportSummary ? 1 : 0) +
    (visit.fieldObservationNotes ? 1 : 0)
  );
}

function visitHasData(visit: SurveyVisit): boolean {
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
  {
    reason: "paling baru (visit berisi) / paling lama (visit kosong)",
    // Between two untouched visits the ORIGINAL one is kept — the later one is just the copy an older
    // version made for the same location. Between visits with data, the most recent wins.
    score: (v) => (visitHasData(v) ? Math.max(timestamp(v.submittedAt), timestamp(v.updatedAt)) : -timestamp(v.createdAt)),
  },
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
function pickActiveVisit<V extends VisitCandidate>(candidates: V[]): { visit: V; reason: string } | null {
  if (candidates.length === 0) return null;
  const ranked = [...candidates].sort((a, b) => compareCandidates(b, a) || a.id.localeCompare(b.id));
  const winner = ranked[0];
  if (ranked.length === 1) return { visit: winner, reason: "satu-satunya visit" };
  const runnerUp = ranked[1];
  const decisive = SELECTION_RULES.find((rule) => rule.score(winner) !== rule.score(runnerUp));
  return { visit: winner, reason: decisive ? `dipilih karena ${decisive.reason}` : "dipilih karena identik; diambil yang pertama" };
}

type LocationGroup<V extends VisitCandidate> = {
  location: SurveyPayloadLocation;
  key: string;
  active: V | null;
  /** Every visit for this location, active one first. */
  visits: V[];
};

/** Groups visits by application location. Visits for locations missing from the payload come back
 * as `orphans` so callers can report them instead of silently losing them. */
function groupVisitsByLocation<V extends VisitCandidate>(
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
function activeVisitsForApplication<V extends VisitCandidate>(visits: V[], payloadLocations: SurveyPayloadLocation[]): V[] {
  return groupVisitsByLocation(visits, payloadLocations)
    .groups.map((group) => group.active)
    .filter((visit): visit is V => visit != null);
}

/** The active visits of ONE assignment's own locations (a location with no visit yet is absent). */
function assignmentActiveVisits<V extends VisitCandidate>(
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
function isAssignmentSurveyComplete<V extends VisitCandidate>(
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
function collectApplicationVisits<
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

// ---- Script ----------------------------------------------------------------------------------
const args = process.argv.slice(2);
const apply = args.includes("--apply");
const backupFile = args.find((arg) => arg.startsWith("--backup-file="))?.slice("--backup-file=".length);

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

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

async function loadAssignments() {
  return db.assignment.findMany({
    where: { OR: [{ scheduleType: "survey" }, { surveyorId: { not: null } }] },
    include: { application: { select: { id: true, applicationNumber: true, payload: true } }, locationVisits: true },
    orderBy: { createdAt: "asc" },
  });
}

function describe(visit: SurveyVisit & { assignmentNumber?: string }): string {
  return (
    `${visit.id}  ${visit.locationType} "${visit.address}"  ${visit.status}  isian=${visitFilledCount(visit)}  ` +
    `${visit.assignmentNumber ?? "?"}  submittedAt=${visit.submittedAt ? new Date(visit.submittedAt).toISOString() : "-"}`
  );
}

/** Storage paths mentioned anywhere in a visit's JSON (photos, interviews, verification forms…). */
function collectPaths(value: unknown, found = new Set<string>(), key = ""): Set<string> {
  if (typeof value === "string") {
    if (/path|file|photo|image|url/i.test(key) && value.includes("/")) found.add(value);
  } else if (Array.isArray(value)) {
    for (const item of value) collectPaths(item, found, key);
  } else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) collectPaths(v, found, k);
  }
  return found;
}

async function tablesReferencingVisits(): Promise<string[]> {
  const rows = await db.$queryRaw<{ referencing: string }[]>`
    SELECT DISTINCT tc.table_name || '.' || kcu.column_name AS referencing
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON kcu.constraint_name = tc.constraint_name AND kcu.table_schema = tc.table_schema
    JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name = tc.constraint_name AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' AND ccu.table_name = 'location_visit'`;
  return rows.map((row) => row.referencing);
}

async function main() {
  console.log(apply ? "MODE: APPLY" : "MODE: DRY-RUN (no changes will be written)");
  if (apply) assertBackup();

  const references = await tablesReferencingVisits();
  console.log(
    references.length === 0
      ? "Foreign keys pointing at location_visit: none — a duplicate can be deleted without leaving dangling references."
      : `Foreign keys pointing at location_visit: ${references.join(", ")}`,
  );
  if (references.length > 0 && apply) {
    fail(`Other tables reference location_visit (${references.join(", ")}); move those references to the kept visit by hand first.`);
  }

  const assignments = await loadAssignments();
  const byApplication = new Map<string, typeof assignments>();
  for (const assignment of assignments) {
    byApplication.set(assignment.applicationId, [...(byApplication.get(assignment.applicationId) ?? []), assignment]);
  }
  console.log(`Survey assignments: ${assignments.length}, applications: ${byApplication.size}`);

  const deletes: string[] = [];
  const updates: { id: string; companyLocationId: string }[] = [];
  const deletedPaths: { visitId: string; paths: string[] }[] = [];
  const orphanReport: string[] = [];
  const mismatches: string[] = [];
  const assignmentWarnings: string[] = [];
  let keepCount = 0;

  for (const siblings of byApplication.values()) {
    const application = siblings[0].application;
    const payloadLocations = (application.payload as { locations?: SurveyPayloadLocation[] } | null)?.locations ?? [];
    const candidates = siblings.flatMap((assignment) =>
      assignment.locationVisits.map((visit) => ({
        ...visit,
        pmApproved: assignment.pmReviewStatus === "APPROVED",
        assignmentNumber: assignment.assignmentNumber,
      })),
    );
    const { groups, orphans } = groupVisitsByLocation(candidates, payloadLocations);
    const activeCount = groups.filter((group) => group.active).length;

    console.log(
      `\n=== ${application.applicationNumber}  (${siblings.length} penugasan survey: ${siblings.map((s) => s.assignmentNumber.replace("ASG-SURVEY-", "")).join(", ")}) ===`,
    );
    console.log(`Lokasi di permohonan: ${payloadLocations.length}   Visit sebelum: ${candidates.length}   Visit aktif sesudah: ${activeCount}`);
    if (activeCount !== payloadLocations.length) {
      mismatches.push(`${application.applicationNumber}: ${payloadLocations.length} lokasi, ${activeCount} visit aktif`);
      console.log(`  CATATAN: ${payloadLocations.length - activeCount} lokasi belum punya visit (dibuat saat surveyor membuka penugasannya).`);
    }

    for (const group of groups) {
      const label = `${group.location.locationType} "${composeLocationAddress(group.location)}"`;
      if (!group.active) {
        console.log(`  [${label}] belum ada visit`);
        continue;
      }
      keepCount += 1;
      const picked = pickActiveVisit(group.visits);
      console.log(`  [${label}]`);
      console.log(`    KEEP    ${describe(group.active)}${group.visits.length > 1 ? `   <- ${picked?.reason}` : ""}`);
      if (group.active.companyLocationId !== group.key) {
        updates.push({ id: group.active.id, companyLocationId: group.key });
        console.log(`    SET     companyLocationId ${group.active.companyLocationId ?? "(kosong)"} -> ${group.key}`);
      }
      for (const duplicate of group.visits.filter((visit) => visit !== group.active)) {
        deletes.push(duplicate.id);
        console.log(`    DELETE  ${describe(duplicate)}`);
        const paths = [
          ...collectPaths([
            duplicate.photos,
            duplicate.interviews,
            duplicate.officeVerification,
            duplicate.warehouseVerification,
            duplicate.factoryVerification,
            duplicate.checklist,
          ]),
        ];
        if (paths.length > 0) {
          deletedPaths.push({ visitId: duplicate.id, paths });
          console.log(`            file di storage (TIDAK dihapus dari disk): ${paths.join(", ")}`);
        }
      }
    }
    for (const orphan of orphans) {
      orphanReport.push(`${application.applicationNumber}: ${describe(orphan)}`);
      console.log(`  ORPHAN (lokasi tidak ada di permohonan — dilaporkan, TIDAK dihapus): ${describe(orphan)}`);
    }

    for (const assignment of siblings) {
      const shown = assignmentLocations(assignment, payloadLocations).length;
      if (assignment.locationId && !payloadLocations.some((loc) => loc.id === assignment.locationId || loc.companyLocationId === assignment.locationId)) {
        assignmentWarnings.push(`${assignment.assignmentNumber} (${application.applicationNumber}): locationId ${assignment.locationId} tidak ada di payload permohonan — menampilkan ${shown} lokasi (semua)`);
      } else if (!assignment.locationId) {
        const type = matchLocationTypeLabel(assignment.location);
        const ofType = type ? payloadLocations.filter((loc) => loc.locationType === type).length : 0;
        if (type && ofType === 0) {
          assignmentWarnings.push(`${assignment.assignmentNumber} (${application.applicationNumber}): penugasan "${assignment.location}" tanpa locationId, permohonan tidak punya lokasi ${type} — menampilkan ${shown} lokasi (semua)`);
        } else if (!type || ofType > 1) {
          assignmentWarnings.push(`${assignment.assignmentNumber} (${application.applicationNumber}): tanpa locationId, label "${assignment.location ?? "-"}" ambigu (${ofType} lokasi sejenis) — menampilkan ${shown} lokasi (semua)`);
        }
      }
    }
  }

  console.log("\n=== RINGKASAN ===");
  console.log(`Visit dipertahankan: ${keepCount}   Visit dihapus: ${deletes.length}   companyLocationId diisi: ${updates.length}   Orphan: ${orphanReport.length}`);
  if (mismatches.length > 0) console.log(`Permohonan dengan visit aktif != jumlah lokasi:\n  ${mismatches.join("\n  ")}`);
  if (assignmentWarnings.length > 0) console.log(`Penugasan yang perlu perhatian:\n  ${assignmentWarnings.join("\n  ")}`);
  if (orphanReport.length > 0) console.log(`Visit orphan (tidak dihapus):\n  ${orphanReport.join("\n  ")}`);
  if (deletedPaths.length > 0) {
    console.log(`File milik visit yang dihapus tetap ada di disk: ${deletedPaths.reduce((n, d) => n + d.paths.length, 0)} path (lihat baris DELETE).`);
  }

  if (deletes.length === 0 && updates.length === 0) {
    console.log("\nNothing to change.");
    return;
  }
  if (!apply) {
    console.log("\nDry-run only. Re-run with --apply --backup-file=<pg_dump> after approval.");
    return;
  }

  await db.$transaction([
    ...updates.map((update) => db.locationVisit.update({ where: { id: update.id }, data: { companyLocationId: update.companyLocationId } })),
    ...(deletes.length > 0 ? [db.locationVisit.deleteMany({ where: { id: { in: deletes } } })] : []),
  ]);
  console.log(`\nApplied: ${deletes.length} visit dihapus, ${updates.length} companyLocationId diisi. Assignment rows and statuses were not touched.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
