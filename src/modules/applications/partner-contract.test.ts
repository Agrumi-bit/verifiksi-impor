import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyChecklistDocumentPath } from "./document-versions";
import { applyViuOnlySubmitRules, type ApplicationWizardValues } from "./schema";

/** Kontrak kerja sama/jual beli Perusahaan Industri mitra — Pasal 37 ayat (2) huruf a angka 2 huruf f). */
function issues(entries: ApplicationWizardValues["partnerIndustriEntries"]): string[] {
  const messages: string[] = [];
  const ctx = { addIssue: (i: { message?: string }) => messages.push(i.message ?? "") } as never;
  applyViuOnlySubmitRules({ importTypes: ["BAHAN_BAKU_INDUSTRI"], partnerIndustriEntries: entries, locations: [], kbliEntries: [], products: [], konsumsiProducts: [], nonIndustriDocuments: [], verificationType: "VIU" } as never, ctx);
  return messages.filter((m) => /kontrak/i.test(m));
}

describe("Partner Industri contract", () => {
  it("submit requires a contract for every enabled partner", () => {
    assert.equal(issues([{ partnerId: "P1", enabled: true, contractDocumentPath: "" }]).length, 1);
    assert.equal(issues([{ partnerId: "P1", enabled: true, contractDocumentPath: "d/k.pdf" }, { partnerId: "P2", enabled: false }]).length, 0);
  });

  it("a revised contract is written back to its own partner entry", () => {
    const payload = { partnerIndustriEntries: [{ partnerId: "P1", enabled: true, contractDocumentPath: "old.pdf" }, { partnerId: "P2", enabled: true }] } as unknown as ApplicationWizardValues;
    const next = applyChecklistDocumentPath(payload, "partner:P1:contract", "new.pdf");
    assert.equal(next.partnerIndustriEntries[0].contractDocumentPath, "new.pdf");
    assert.equal(next.partnerIndustriEntries[1].contractDocumentPath, undefined);
  });
});
