import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { PM_VIU_SCHEMES, applicationMatchesViuScheme, viuSchemeFromSlug, viuSchemeOf, viuSchemeHref } from "./viu-schemes";

describe("PM VIU sub menus", () => {
  it("lists VIU Industri, Non Industri and Konsumsi in that order", () => {
    assert.deepEqual(
      PM_VIU_SCHEMES.map((scheme) => scheme.label),
      ["VIU Industri", "VIU Non Industri", "VIU Konsumsi"],
    );
  });

  it("resolves a slug to its scheme and rejects unknown slugs", () => {
    assert.equal(viuSchemeFromSlug("konsumsi")?.importType, "BARANG_KONSUMSI");
    assert.equal(viuSchemeFromSlug("non-industri")?.importType, "BAHAN_BAKU_NON_INDUSTRI");
    assert.equal(viuSchemeFromSlug("industri")?.importType, "BAHAN_BAKU_INDUSTRI");
    assert.equal(viuSchemeFromSlug("lain"), null);
  });

  it("assigns a VIU application to the scheme of its import type", () => {
    const konsumsi = viuSchemeFromSlug("konsumsi")!;
    assert.equal(applicationMatchesViuScheme("VIU", ["BARANG_KONSUMSI"], konsumsi), true);
    assert.equal(applicationMatchesViuScheme("VIU", ["BAHAN_BAKU_INDUSTRI"], konsumsi), false);
  });

  it("never matches a VKI application or one without import types", () => {
    const industri = viuSchemeFromSlug("industri")!;
    assert.equal(applicationMatchesViuScheme("VKI", ["BAHAN_BAKU_INDUSTRI"], industri), false);
    assert.equal(applicationMatchesViuScheme("VIU", [], industri), false);
    assert.equal(applicationMatchesViuScheme("VIU", undefined, industri), false);
  });
});

describe("one application, one sub menu — schemes never mix", () => {
  it("viuSchemeOf picks the scheme of the first import type", () => {
    assert.equal(viuSchemeOf(["BARANG_KONSUMSI"])?.slug, "konsumsi");
    assert.equal(viuSchemeOf(["BAHAN_BAKU_NON_INDUSTRI"])?.slug, "non-industri");
    assert.equal(viuSchemeOf([])?.slug, undefined);
    assert.equal(viuSchemeOf(["LAINNYA"]), null);
  });

  it("a legacy application with several import types lands in exactly one sub menu", () => {
    const importTypes = ["BARANG_KONSUMSI", "BAHAN_BAKU_INDUSTRI"];
    const matching = PM_VIU_SCHEMES.filter((scheme) => applicationMatchesViuScheme("VIU", importTypes, scheme));
    assert.deepEqual(matching.map((scheme) => scheme.slug), ["konsumsi"]);
  });

  it("builds a detail address inside the scheme's own sub menu", () => {
    const konsumsi = viuSchemeFromSlug("konsumsi")!;
    assert.equal(viuSchemeHref(konsumsi, "/applications/APP-1"), "/project-manager-workspace/viu/konsumsi/applications/APP-1");
  });
});

