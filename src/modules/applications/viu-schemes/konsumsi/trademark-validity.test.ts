import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { computeTrademarkEvidenceValidity, trademarkEvidenceAsOf } from "./business-rules";

describe("Tanda Pendaftaran Merek — Pasal 37 ayat (7): 9 bulan sejak registrasi, dinilai pada Tanggal Pengajuan", () => {
  it("valid when the Tanggal Pengajuan is within 9 months, even if today is past it", () => {
    const asOf = trademarkEvidenceAsOf("2026-02-23");
    const result = computeTrademarkEvidenceValidity("TANDA_DAFTAR_MEREK", "2025-07-01T00:00:00.000Z", asOf);
    assert.equal(result.status, "VALID_WITHIN_9_MONTHS");
  });

  it("expired when the Tanggal Pengajuan is past 9 months", () => {
    const asOf = trademarkEvidenceAsOf("2026-04-02");
    assert.equal(computeTrademarkEvidenceValidity("TANDA_DAFTAR_MEREK", "2025-07-01T00:00:00.000Z", asOf).status, "EXPIRED_9_MONTH_LIMIT");
  });

  it("the last day of the 9 months still counts", () => {
    const asOf = trademarkEvidenceAsOf("2026-04-01");
    assert.equal(computeTrademarkEvidenceValidity("TANDA_DAFTAR_MEREK", "2025-07-01T00:00:00.000Z", asOf).status, "VALID_WITHIN_9_MONTHS");
  });

  it("no or malformed date falls back to now", () => {
    assert.equal(trademarkEvidenceAsOf(""), undefined);
    assert.equal(trademarkEvidenceAsOf(null), undefined);
    assert.equal(trademarkEvidenceAsOf("23/02/2026"), undefined);
  });
});
