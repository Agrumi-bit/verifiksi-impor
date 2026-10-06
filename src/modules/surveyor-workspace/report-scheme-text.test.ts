import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { reportFamilyLabel, reportVerificationName } from "./report-scheme-text";

describe("reportVerificationName", () => {
  it("VKI names Verifikasi Kemampuan Industri", () => {
    assert.equal(reportVerificationName({ verificationType: "VKI" }), "Verifikasi Kemampuan Industri (VKI)");
  });

  it("VIU names Verifikasi Importir Umum plus the import type, never VKI", () => {
    const text = reportVerificationName({ verificationType: "VIU", importTypes: ["BARANG_KONSUMSI"] });
    assert.match(text, /Verifikasi Importir Umum \(VIU\)/);
    assert.match(text, /Barang Konsumsi/);
    assert.doesNotMatch(text, /VKI|Kemampuan Industri/);
  });

  it("several VIU import types are all named", () => {
    const text = reportVerificationName({ verificationType: "VIU", importTypes: ["BAHAN_BAKU_INDUSTRI", "BARANG_KONSUMSI"] });
    assert.match(text, /Bahan Baku/);
    assert.match(text, /Barang Konsumsi/);
    assert.doesNotMatch(text, /Kemampuan Industri/);
  });

  it("a VIU without import types still says VIU", () => {
    assert.equal(reportVerificationName({ verificationType: "VIU", importTypes: [] }), "Verifikasi Importir Umum (VIU)");
  });

  it("an unknown type falls back to a neutral phrase", () => {
    assert.equal(reportVerificationName({ verificationType: null }), "proses verifikasi");
  });
});

describe("reportFamilyLabel", () => {
  it("follows the verification type", () => {
    assert.equal(reportFamilyLabel({ verificationType: "VKI" }), "VKI");
    assert.equal(reportFamilyLabel({ verificationType: "VIU", importTypes: ["BARANG_KONSUMSI"] }), "VIU");
    assert.equal(reportFamilyLabel({ verificationType: "VIU" }), "VIU");
    assert.equal(reportFamilyLabel({}), "VKI / VIU");
  });
});
