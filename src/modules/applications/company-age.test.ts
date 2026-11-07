import assert from "node:assert/strict";
import { it } from "node:test";

import { deriveCompanyAge } from "./company-age";

it("derives Umur Perizinan Berusaha from the NIB issue date", () => {
  assert.equal(deriveCompanyAge("2024-02-14", "2026-11-06"), "UNDER_3");
  assert.equal(deriveCompanyAge("2023-11-06", "2026-11-06"), "OVER_3");
  assert.equal(deriveCompanyAge("2023-11-07", "2026-11-06"), "UNDER_3");
  assert.equal(deriveCompanyAge("", "2026-11-06"), null);
  assert.equal(deriveCompanyAge("bukan tanggal", "2026-11-06"), null);
});
