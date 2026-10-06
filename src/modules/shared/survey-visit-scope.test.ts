import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  effectiveAssignmentVisits,
  locationsInAssignmentScope,
  mergeVisitsByLocation,
  visitLocationKey,
  type ScopablePayloadLocation,
  type ScopableVisit,
} from "./survey-visit-scope";

const KANTOR: ScopablePayloadLocation = { id: "loc-kantor", companyLocationId: "co-kantor", locationType: "KANTOR", address: "Jl. Kantor" };
const GUDANG: ScopablePayloadLocation = { id: "loc-gudang", companyLocationId: "co-gudang", locationType: "GUDANG", address: "Jl. Gudang" };
const TEMUAN: ScopablePayloadLocation = {
  id: "co-temuan",
  companyLocationId: "co-temuan",
  locationType: "GUDANG",
  address: "Jl. Temuan",
  discoveredAssignmentId: "asg-kantor",
};
const PAYLOAD = [KANTOR, GUDANG];

function visit(overrides: Partial<ScopableVisit> & Pick<ScopableVisit, "locationType" | "address">): ScopableVisit {
  return { status: "NOT_STARTED", companyLocationId: null, ...overrides };
}

const kantorVisit = visit({ locationType: "KANTOR", address: "Jl. Kantor", companyLocationId: "co-kantor" });
const gudangVisit = visit({ locationType: "GUDANG", address: "Jl. Gudang", companyLocationId: "co-gudang" });

describe("locationsInAssignmentScope", () => {
  it("returns every payload location for an assignment without locationId", () => {
    assert.deepEqual(locationsInAssignmentScope({ id: "a", locationId: null }, PAYLOAD), PAYLOAD);
  });

  it("returns only the scheduled location when locationId matches a payload id", () => {
    assert.deepEqual(locationsInAssignmentScope({ id: "a", locationId: "loc-kantor" }, PAYLOAD), [KANTOR]);
  });

  it("also matches on companyLocationId", () => {
    assert.deepEqual(locationsInAssignmentScope({ id: "a", locationId: "co-gudang" }, PAYLOAD), [GUDANG]);
  });

  it("keeps a location discovered in the field on this very assignment, but not another assignment's", () => {
    const withTemuan = [...PAYLOAD, TEMUAN];
    assert.deepEqual(locationsInAssignmentScope({ id: "asg-kantor", locationId: "loc-kantor" }, withTemuan), [KANTOR, TEMUAN]);
    assert.deepEqual(locationsInAssignmentScope({ id: "asg-gudang", locationId: "loc-gudang" }, withTemuan), [GUDANG]);
  });

  it("falls back to every location when locationId is not in the payload", () => {
    assert.deepEqual(locationsInAssignmentScope({ id: "a", locationId: "removed" }, PAYLOAD), PAYLOAD);
  });
});

describe("effectiveAssignmentVisits", () => {
  const assignment = { id: "asg-kantor", locationId: "loc-kantor" };

  it("keeps all visits of an assignment without locationId", () => {
    const result = effectiveAssignmentVisits({ id: "a", locationId: null }, [kantorVisit, gudangVisit], PAYLOAD);
    assert.equal(result.length, 2);
    assert.ok(result.every((v) => !v.belongsToOtherAssignmentLocation));
  });

  it("drops empty visits of other locations", () => {
    const result = effectiveAssignmentVisits(assignment, [kantorVisit, gudangVisit], PAYLOAD);
    assert.deepEqual(result.map((v) => v.locationType), ["KANTOR"]);
  });

  it("keeps a filled visit of another location and flags it, never dropping surveyor data", () => {
    const filledGudang = { ...gudangVisit, status: "COMPLETED" };
    const result = effectiveAssignmentVisits(assignment, [kantorVisit, filledGudang], PAYLOAD);
    assert.equal(result.length, 2);
    assert.equal(result.find((v) => v.locationType === "GUDANG")?.belongsToOtherAssignmentLocation, true);
    assert.equal(result.find((v) => v.locationType === "KANTOR")?.belongsToOtherAssignmentLocation, false);
  });

  it("treats a visit with saved data as filled even while NOT_STARTED", () => {
    const noted = { ...gudangVisit, fieldObservationNotes: "catatan" };
    assert.equal(effectiveAssignmentVisits(assignment, [noted], PAYLOAD).length, 1);
  });

  it("keeps the field-discovered location's visit without a badge", () => {
    const temuanVisit = visit({ locationType: "GUDANG", address: "Jl. Temuan", companyLocationId: "co-temuan" });
    const result = effectiveAssignmentVisits(assignment, [kantorVisit, temuanVisit], [...PAYLOAD, TEMUAN]);
    assert.equal(result.length, 2);
    assert.ok(result.every((v) => !v.belongsToOtherAssignmentLocation));
  });

  it("matches a legacy visit without companyLocationId by type + address", () => {
    const legacy = visit({ locationType: "KANTOR", address: "Jl. Kantor" });
    assert.equal(effectiveAssignmentVisits(assignment, [legacy], PAYLOAD)[0].belongsToOtherAssignmentLocation, false);
  });
});

describe("mergeVisitsByLocation", () => {
  it("keeps the most-progressed copy of the same location across assignments", () => {
    const done = { ...kantorVisit, status: "COMPLETED" };
    const merged = mergeVisitsByLocation([kantorVisit, done, gudangVisit]);
    assert.equal(merged.length, 2);
    assert.equal(merged.find((v) => v.locationType === "KANTOR")?.status, "COMPLETED");
  });

  it("keeps two different locations of the same type apart", () => {
    const gudang2 = visit({ locationType: "GUDANG", address: "Jl. Gudang 2", companyLocationId: "co-gudang-2" });
    assert.equal(mergeVisitsByLocation([gudangVisit, gudang2]).length, 2);
  });

  it("merges a legacy unlinked copy with its linked copy when payload locations are given", () => {
    const legacy = visit({ locationType: "KANTOR", address: "Jl. Kantor", status: "COMPLETED" });
    const merged = mergeVisitsByLocation([kantorVisit, legacy], PAYLOAD);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].status, "COMPLETED");
  });
});

describe("visitLocationKey", () => {
  it("uses the company location id when present", () => {
    assert.equal(visitLocationKey(kantorVisit), "co-kantor");
  });

  it("falls back to type + address", () => {
    assert.equal(visitLocationKey(visit({ locationType: "PABRIK", address: "X" })), "PABRIK::X");
  });
});
