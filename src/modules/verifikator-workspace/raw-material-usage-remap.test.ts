import assert from "node:assert/strict";
import { describe, it } from "node:test";

import type { ApplicationWizardValues } from "@/modules/applications/schema";

import { buildRawMaterialUsageChecklist, remapRawMaterialUsageDecisions } from "./schema";

const entry = (keterangan: string) => ({ status: "SESUAI" as const, keterangan, verifiedAt: "2026-11-12T00:00:00.000Z" });

function payload(rawMaterialIds: string[]): ApplicationWizardValues {
  return {
    verificationType: "VKI",
    products: [{ id: "p1", materialType: "Produk" }],
    rawMaterials: rawMaterialIds.map((id) => ({ id, jenis: id })),
    rawMaterialConversions: rawMaterialIds.map((id) => ({ id: `c-${id}`, productId: "p1", rawMaterialId: id })),
  } as unknown as ApplicationWizardValues;
}

describe("remapRawMaterialUsageDecisions", () => {
  it("moves decisions of later rows when an earlier raw material is deleted", () => {
    const before = buildRawMaterialUsageChecklist(payload(["a", "b", "c"]));
    const after = buildRawMaterialUsageChecklist(payload(["a", "c"]));
    const decisions = {
      "penggunaan-row:a:0:0": entry("A"),
      "penggunaan-row:b:1:0": entry("B"),
      "stok-row:c:2:0": entry("C"),
      "summary:penggunaan": entry("ringkasan"),
    };
    const result = remapRawMaterialUsageDecisions(before, after, decisions);
    assert.deepEqual(Object.keys(result).sort(), ["penggunaan-row:a:0:0", "stok-row:c:1:0", "summary:penggunaan"]);
    assert.equal(result["stok-row:c:1:0"]?.keterangan, "C");
  });

  it("leaves decisions untouched when rows are only appended", () => {
    const before = buildRawMaterialUsageChecklist(payload(["a"]));
    const after = buildRawMaterialUsageChecklist(payload(["a", "b"]));
    const decisions = { "penggunaan-row:a:0:0": entry("A") };
    assert.deepEqual(remapRawMaterialUsageDecisions(before, after, decisions), decisions);
  });
});
