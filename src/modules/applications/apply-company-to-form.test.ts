import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { applyCompanyToForm, type CompanyOption } from "./apply-company-to-form";

const company = {
  id: "co-1",
  companyName: "PT Alas Lantai Indonesia",
  kbliEntries: [{ code: "46414", description: "Perdagangan Besar Barang Jadi Tekstil", category: "UTAMA" }],
  kbliDocumentPath: "companies/co-1/kbli.pdf",
  taxProofs: [],
  locations: [{ id: "loc-1", locationType: "GUDANG" }],
} as unknown as CompanyOption;

function collectSetValues(options?: { includeLocations?: boolean }) {
  const values: Record<string, unknown> = {};
  applyCompanyToForm((name, value) => void (values[name as string] = value), company, options);
  return values;
}

describe("applyCompanyToForm", () => {
  it("copies the company's current KBLI list into the form", () => {
    const values = collectSetValues();
    assert.deepEqual(values.kbliEntries, company.kbliEntries);
    assert.equal(values.kbliDocumentPath, "companies/co-1/kbli.pdf");
  });

  it("links every company location back to its Company.locations entry by default", () => {
    const values = collectSetValues();
    assert.deepEqual(values.locations, [{ id: "loc-1", locationType: "GUDANG", companyLocationId: "loc-1" }]);
  });

  it("leaves the applicant's location selection alone when includeLocations is false", () => {
    const values = collectSetValues({ includeLocations: false });
    assert.equal("locations" in values, false);
    assert.deepEqual(values.kbliEntries, company.kbliEntries);
  });
});
