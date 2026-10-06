import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  buildApplicationGroups,
  combineAssignmentStatuses,
  highestPriority,
  type ApplicationGroupInfo,
  type GroupableAssignment,
} from "./application-groups";

const KANTOR = { id: "pl-k", companyLocationId: "co-k", locationType: "KANTOR", address: "Jl Kantor" };
const GUDANG = { id: "pl-g", companyLocationId: "co-g", locationType: "GUDANG", address: "Jl Gudang" };

const APP: ApplicationGroupInfo = {
  applicationId: "app1",
  applicationNumber: "APP-1",
  companyName: "PT Contoh",
  verificationType: "VIU",
  importTypes: ["BARANG_KONSUMSI"],
  locations: [KANTOR, GUDANG],
};

function assignment(overrides: Partial<GroupableAssignment> & Pick<GroupableAssignment, "assignmentNumber" | "locationId">): GroupableAssignment {
  return {
    id: overrides.assignmentNumber,
    status: "ASSIGNED",
    priority: "MEDIUM",
    surveyorId: "me",
    location: null,
    pmReviewStatus: null,
    createdAt: "2026-10-01T00:00:00.000Z",
    applicationId: "app1",
    locationVisits: [],
    ...overrides,
  };
}

const visit = (id: string, locationKey: string, type: string, address: string, status: string) => ({
  id,
  status,
  locationType: type,
  address,
  companyLocationId: locationKey,
});

describe("combineAssignmentStatuses / highestPriority", () => {
  it("whatever still needs the surveyor wins over finished work", () => {
    assert.equal(combineAssignmentStatuses(["COMPLETED", "ASSIGNED"]), "ASSIGNED");
    assert.equal(combineAssignmentStatuses(["SUBMITTED", "IN_PROGRESS"]), "IN_PROGRESS");
    assert.equal(combineAssignmentStatuses(["SUBMITTED", "COMPLETED"]), "SUBMITTED");
    assert.equal(combineAssignmentStatuses(["COMPLETED"]), "COMPLETED");
  });

  it("takes the highest priority", () => {
    assert.equal(highestPriority(["LOW", "HIGH", "MEDIUM"]), "HIGH");
    assert.equal(highestPriority(["MEDIUM", "CRITICAL"]), "CRITICAL");
  });
});

describe("buildApplicationGroups", () => {
  it("two locations, two assignments of mine become ONE card with TWO location rows", () => {
    const a1 = assignment({ assignmentNumber: "ASG-K", locationId: "pl-k", status: "SUBMITTED", locationVisits: [visit("v1", "co-k", "KANTOR", "Jl Kantor", "COMPLETED")] });
    const a2 = assignment({ assignmentNumber: "ASG-G", locationId: "pl-g", status: "IN_PROGRESS", priority: "HIGH", locationVisits: [visit("v2", "co-g", "GUDANG", "Jl Gudang", "IN_PROGRESS")] });
    const groups = buildApplicationGroups("me", [a1, a2], new Map([["app1", APP]]));
    assert.equal(groups.length, 1);
    const [group] = groups;
    assert.equal(group.locations.length, 2);
    assert.deepEqual(group.locationSummary, { total: 2, completed: 1 });
    assert.equal(group.status, "IN_PROGRESS");
    assert.equal(group.priority, "HIGH");
    assert.deepEqual(group.assignmentNumbers.sort(), ["ASG-G", "ASG-K"]);
    assert.equal(group.primaryAssignmentNumber, "ASG-G");
  });

  it("the second assignment's row shows the first assignment's COMPLETED result (no duplicate rows)", () => {
    const first = assignment({ assignmentNumber: "ASG-G1", locationId: "pl-g", surveyorId: "other", locationVisits: [visit("v1", "co-g", "GUDANG", "Jl Gudang", "COMPLETED")] });
    const second = assignment({ assignmentNumber: "ASG-G2", locationId: "pl-g", locationVisits: [visit("v2", "co-g", "GUDANG", "Jl Gudang", "NOT_STARTED")] });
    const [group] = buildApplicationGroups("me", [first, second], new Map([["app1", APP]]));
    const gudang = group.locations.find((row) => row.locationType === "GUDANG");
    assert.equal(gudang?.status, "COMPLETED");
    assert.equal(gudang?.visitId, "v1");
    assert.equal(group.locations.length, 2);
  });

  it("a location another surveyor handles is listed but is not mine", () => {
    const mineAsg = assignment({ assignmentNumber: "ASG-K", locationId: "pl-k" });
    const theirs = assignment({ assignmentNumber: "ASG-G", locationId: "pl-g", surveyorId: "other" });
    const [group] = buildApplicationGroups("me", [mineAsg, theirs], new Map([["app1", APP]]));
    const gudang = group.locations.find((row) => row.locationType === "GUDANG");
    assert.equal(gudang?.myAssignmentNumber, null);
    assert.equal(gudang?.assignmentNumber, "ASG-G");
    assert.equal(group.locations.find((row) => row.locationType === "KANTOR")?.myAssignmentNumber, "ASG-K");
  });

  it("a location with no assignment and no visit shows NOT_STARTED and no owner", () => {
    const only = assignment({ assignmentNumber: "ASG-K", locationId: "pl-k" });
    const [group] = buildApplicationGroups("me", [only], new Map([["app1", APP]]));
    const gudang = group.locations.find((row) => row.locationType === "GUDANG");
    assert.equal(gudang?.status, "NOT_STARTED");
    assert.equal(gudang?.assignmentNumber, null);
    assert.equal(gudang?.visitId, null);
  });

  it("View Assignment prefers an assignment that is not finished yet", () => {
    const done = assignment({ assignmentNumber: "ASG-DONE", locationId: "pl-k", status: "COMPLETED", createdAt: "2026-10-03T00:00:00.000Z" });
    const open = assignment({ assignmentNumber: "ASG-OPEN", locationId: "pl-g", status: "ASSIGNED", createdAt: "2026-10-02T00:00:00.000Z" });
    const [group] = buildApplicationGroups("me", [done, open], new Map([["app1", APP]]));
    assert.equal(group.primaryAssignmentNumber, "ASG-OPEN");
  });

  it("an old assignment without locationId keeps working: it covers every location", () => {
    const legacy = assignment({ assignmentNumber: "ASG-OLD", locationId: null, location: null });
    const [group] = buildApplicationGroups("me", [legacy], new Map([["app1", APP]]));
    assert.equal(group.locations.length, 2);
    assert.ok(group.locations.every((row) => row.myAssignmentNumber === "ASG-OLD"));
  });

  it("only applications the surveyor is assigned to appear", () => {
    const theirs = assignment({ assignmentNumber: "ASG-X", locationId: "pl-k", surveyorId: "other" });
    assert.equal(buildApplicationGroups("me", [theirs], new Map([["app1", APP]])).length, 0);
  });
});
