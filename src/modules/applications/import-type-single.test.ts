import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyViuOnlySubmitRules } from "./schema";

/** A VIU application covers exactly one import type — mixed applications are not allowed. */
function importTypeIssues(importTypes: string[]): string[] {
  const messages: { path?: unknown[]; message?: string }[] = [];
  const ctx = { addIssue: (i: { path?: unknown[]; message?: string }) => messages.push(i) } as never;
  const data = { importTypes, partnerIndustriEntries: [], locations: [], kbliEntries: [], products: [], konsumsiProducts: [], nonIndustriDocuments: [], verificationType: "VIU" };
  applyViuOnlySubmitRules(data as never, ctx);
  return messages.filter((m) => m.path?.[0] === "importTypes").map((m) => m.message ?? "");
}

describe("VIU import type", () => {
  it("requires exactly one import type", () => {
    assert.deepEqual(importTypeIssues([]), ["Pilih Jenis Impor"]);
    assert.ok(importTypeIssues(["BAHAN_BAKU_INDUSTRI", "BAHAN_BAKU_NON_INDUSTRI"]).some((m) => m.startsWith("Pilih satu Jenis Impor saja")));
    assert.ok(!importTypeIssues(["BAHAN_BAKU_NON_INDUSTRI"]).some((m) => m.startsWith("Pilih")));
  });
});
