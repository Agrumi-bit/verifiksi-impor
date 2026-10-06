import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  activeVisitsForApplication,
  assignmentActiveVisits,
  assignmentLocations,
  findLocationAssignment,
  groupVisitsByLocation,
  isAssignmentSurveyComplete,
  pickActiveVisit,
  type SurveyPayloadLocation,
  type VisitCandidate,
} from "./survey-visit-scope";

const KANTOR: SurveyPayloadLocation = { id: "loc-kantor", companyLocationId: "co-kantor", locationType: "KANTOR", address: "Jl. Kantor" };
const GUDANG: SurveyPayloadLocation = { id: "loc-gudang", companyLocationId: "co-gudang", locationType: "GUDANG", address: "Jl. Gudang" };
const PAYLOAD = [KANTOR, GUDANG];

let seq = 0;
function visit(overrides: Partial<VisitCandidate> & Pick<VisitCandidate, "locationType" | "address">): VisitCandidate {
  seq += 1;
  return { id: `v${seq}`, status: "NOT_STARTED", companyLocationId: null, ...overrides };
}
const kantorVisit = (o: Partial<VisitCandidate> = {}) => visit({ locationType: "KANTOR", address: "Jl. Kantor", companyLocationId: "co-kantor", ...o });
const gudangVisit = (o: Partial<VisitCandidate> = {}) => visit({ locationType: "GUDANG", address: "Jl. Gudang", companyLocationId: "co-gudang", ...o });

describe("assignmentLocations", () => {
  it("a survey assignment with locationId sees only its own location", () => {
    assert.deepEqual(assignmentLocations({ id: "a", locationId: "loc-kantor" }, PAYLOAD), [KANTOR]);
    assert.deepEqual(assignmentLocations({ id: "a", locationId: "co-gudang" }, PAYLOAD), [GUDANG]);
  });

  it("keeps a location discovered in the field on this very assignment", () => {
    const temuan: SurveyPayloadLocation = { id: "co-t", companyLocationId: "co-t", locationType: "GUDANG", address: "Jl. T", discoveredAssignmentId: "asg-1" };
    assert.deepEqual(assignmentLocations({ id: "asg-1", locationId: "loc-kantor" }, [...PAYLOAD, temuan]), [KANTOR, temuan]);
    assert.deepEqual(assignmentLocations({ id: "asg-2", locationId: "loc-gudang" }, [...PAYLOAD, temuan]), [GUDANG]);
  });

  it("an old assignment without locationId uses its label when exactly one location has that type", () => {
    assert.deepEqual(assignmentLocations({ id: "a", locationId: null, location: "Gudang" }, PAYLOAD), [GUDANG]);
    assert.deepEqual(assignmentLocations({ id: "a", locationId: null, location: "Factory" }, [KANTOR, { ...GUDANG, locationType: "PABRIK" }]).length, 1);
  });

  it("an old assignment with an ambiguous or unmatched label keeps every location", () => {
    const twoGudang = [KANTOR, GUDANG, { ...GUDANG, id: "g2", companyLocationId: "co-g2" }];
    assert.equal(assignmentLocations({ id: "a", locationId: null, location: "Gudang" }, twoGudang).length, 3);
    assert.equal(assignmentLocations({ id: "a", locationId: null, location: "Factory" }, PAYLOAD).length, 2);
    assert.equal(assignmentLocations({ id: "a", locationId: null, location: null }, PAYLOAD).length, 2);
  });

  it("a locationId that is not in the payload falls back to every location", () => {
    assert.equal(assignmentLocations({ id: "a", locationId: "removed" }, PAYLOAD).length, 2);
  });
});

describe("pickActiveVisit priority", () => {
  it("PM approved beats everything", () => {
    const approved = kantorVisit({ status: "IN_PROGRESS", pmApproved: true });
    const verified = kantorVisit({ status: "COMPLETED", reportVerification: { decision: "VERIFIED" }, submittedAt: new Date() });
    const picked = pickActiveVisit([verified, approved]);
    assert.equal(picked?.visit, approved);
    assert.match(picked!.reason, /PM/);
  });

  it("then report VERIFIED, then submittedAt, then COMPLETED", () => {
    const verified = kantorVisit({ status: "COMPLETED", reportVerification: { decision: "VERIFIED" } });
    const submitted = kantorVisit({ status: "COMPLETED", submittedAt: new Date("2026-01-01") });
    const completed = kantorVisit({ status: "COMPLETED" });
    const inProgress = kantorVisit({ status: "IN_PROGRESS", photos: [1, 2, 3] });
    assert.equal(pickActiveVisit([completed, submitted, verified, inProgress])?.visit, verified);
    assert.equal(pickActiveVisit([completed, submitted, inProgress])?.visit, submitted);
    assert.equal(pickActiveVisit([inProgress, completed])?.visit, completed);
  });

  it("among IN_PROGRESS visits the one with the most entries wins, then the most recent", () => {
    const few = kantorVisit({ status: "IN_PROGRESS", photos: [1] });
    const many = kantorVisit({ status: "IN_PROGRESS", photos: [1, 2, 3], fieldObservationNotes: "x" });
    assert.equal(pickActiveVisit([few, many])?.visit, many);
    const older = kantorVisit({ status: "IN_PROGRESS", updatedAt: new Date("2026-01-01") });
    const newer = kantorVisit({ status: "IN_PROGRESS", updatedAt: new Date("2026-02-01") });
    const picked = pickActiveVisit([older, newer]);
    assert.equal(picked?.visit, newer);
    assert.match(picked!.reason, /baru/);
  });

  it("explains why one of two COMPLETED visits was chosen", () => {
    const earlier = kantorVisit({ status: "COMPLETED", submittedAt: new Date("2026-01-01") });
    const later = kantorVisit({ status: "COMPLETED", submittedAt: new Date("2026-02-01") });
    const picked = pickActiveVisit([earlier, later]);
    assert.equal(picked?.visit, later);
    assert.match(picked!.reason, /^dipilih karena/);
  });

  it("a NOT_STARTED duplicate never wins", () => {
    const empty = kantorVisit();
    const filled = kantorVisit({ status: "IN_PROGRESS" });
    assert.equal(pickActiveVisit([empty, filled])?.visit, filled);
  });
});

describe("one visit per application location", () => {
  // 2 locations, 2 survey assignments: the old bug left 4 visits (each assignment made both).
  const fromKantorAsg = [kantorVisit({ status: "COMPLETED", submittedAt: new Date("2026-01-01") }), gudangVisit({ status: "COMPLETED" })];
  const fromGudangAsg = [gudangVisit({ status: "IN_PROGRESS" }), kantorVisit({ status: "IN_PROGRESS" })];
  const all = [...fromKantorAsg, ...fromGudangAsg];

  it("collapses 4 visits to exactly 2 active ones — the count of locations", () => {
    const active = activeVisitsForApplication(all, PAYLOAD);
    assert.equal(active.length, PAYLOAD.length);
    assert.deepEqual(active.map((v) => v.locationType).sort(), ["GUDANG", "KANTOR"]);
    assert.ok(active.every((v) => v.status === "COMPLETED"));
  });

  it("the second assignment sees the first one's COMPLETED result for its own location", () => {
    const gudangAssignment = { id: "asg-gudang", locationId: "loc-gudang" };
    const own = assignmentActiveVisits(gudangAssignment, all, PAYLOAD);
    assert.equal(own.length, 1);
    assert.equal(own[0].locationType, "GUDANG");
    assert.equal(own[0].status, "COMPLETED");
    assert.equal(isAssignmentSurveyComplete(gudangAssignment, all, PAYLOAD), true);
  });

  it("an assignment is not complete while its location has no completed visit", () => {
    const kantorAssignment = { id: "asg-kantor", locationId: "loc-kantor" };
    assert.equal(isAssignmentSurveyComplete(kantorAssignment, [kantorVisit({ status: "IN_PROGRESS" })], PAYLOAD), false);
    assert.equal(isAssignmentSurveyComplete(kantorAssignment, [], PAYLOAD), false);
  });

  it("an old assignment without locationId and an ambiguous label is complete only when every location is", () => {
    const legacy = { id: "legacy", locationId: null, location: null };
    assert.equal(isAssignmentSurveyComplete(legacy, [kantorVisit({ status: "COMPLETED" })], PAYLOAD), false);
    assert.equal(isAssignmentSurveyComplete(legacy, [kantorVisit({ status: "COMPLETED" }), gudangVisit({ status: "COMPLETED" })], PAYLOAD), true);
  });

  it("two locations of the same type stay separate; a legacy unlinked visit joins its location", () => {
    const gudang2 = { id: "g2", companyLocationId: "co-g2", locationType: "GUDANG", address: "Jl. Gudang 2" };
    const legacy = visit({ locationType: "GUDANG", address: "Jl. Gudang 2", status: "COMPLETED" });
    const linked = gudangVisit({ status: "COMPLETED" });
    const { groups } = groupVisitsByLocation([legacy, linked], [KANTOR, GUDANG, gudang2]);
    assert.equal(groups.find((g) => g.key === "co-g2")?.active, legacy);
    assert.equal(groups.find((g) => g.key === "co-gudang")?.active, linked);
  });

  it("visits for a location missing from the application are returned as orphans, not dropped", () => {
    const orphan = visit({ locationType: "PABRIK", address: "Jl. Pabrik", status: "COMPLETED" });
    const { groups, orphans } = groupVisitsByLocation([kantorVisit(), orphan], PAYLOAD);
    assert.deepEqual(orphans, [orphan]);
    assert.equal(groups.length, PAYLOAD.length);
  });

  it("the report lists as many locations as the application has, even before surveys start", () => {
    assert.equal(groupVisitsByLocation([], PAYLOAD).groups.length, 2);
    assert.equal(activeVisitsForApplication([], PAYLOAD).length, 0);
  });
});

describe("findLocationAssignment", () => {
  const kantorAsg = { id: "a-k", locationId: "loc-kantor", location: "Kantor" };
  const gudangAsg = { id: "a-g", locationId: "co-gudang", location: "Gudang" };

  it("returns the assignment scheduled for the location, or null when none is assigned", () => {
    assert.equal(findLocationAssignment([kantorAsg, gudangAsg], KANTOR, PAYLOAD), kantorAsg);
    assert.equal(findLocationAssignment([kantorAsg, gudangAsg], GUDANG, PAYLOAD), gudangAsg);
    assert.equal(findLocationAssignment([kantorAsg], GUDANG, PAYLOAD), null);
  });

  it("credits a field-discovered location to the assignment that found it", () => {
    const temuan: SurveyPayloadLocation = { id: "co-t", companyLocationId: "co-t", locationType: "GUDANG", address: "Jl. T", discoveredAssignmentId: "a-k" };
    assert.equal(findLocationAssignment([kantorAsg, gudangAsg], temuan, [...PAYLOAD, temuan]), kantorAsg);
  });

  it("an old assignment with a label that names exactly one location owns it", () => {
    const legacy = { id: "old", locationId: null, location: "Gudang" };
    assert.equal(findLocationAssignment([legacy], GUDANG, PAYLOAD), legacy);
  });

  it("an ambiguous old assignment owns nothing", () => {
    const legacy = { id: "old", locationId: null, location: null };
    assert.equal(findLocationAssignment([legacy], KANTOR, PAYLOAD), null);
  });
});
