import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeKonsumsiPayload } from "./normalize";
import { konsumsiProductSchema } from "./schema";

const legacySnapshot = {
  brandName: "ACME",
  capturedAt: "2026-10-03T03:00:00.000Z",
  totalPrice: "1000",
  industryName: "Tekstil",
  commodityName: "Sarung Tangan",
  hsDescription: "Hand gloves",
  countryOfOriginName: "Tiongkok",
};

function withoutLegacyCountry() {
  const rest: Record<string, unknown> = { ...legacySnapshot };
  delete rest.countryOfOriginName;
  return rest;
}

function legacyProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: "p1",
    brandId: "b1",
    hsCodeId: "hs1",
    hsCode: "4015.19",
    commodityGroupId: "cg1",
    productName: "HAND GLOVES",
    quantity: "100",
    averageUnitPrice: "10",
    originCountries: ["CN"],
    originCountryNames: ["Tiongkok"],
    productSnapshot: legacySnapshot,
    ...overrides,
  };
}

function normalizeProducts(products: unknown[]) {
  const result = normalizeKonsumsiPayload({ konsumsiProducts: products } as never);
  return result.konsumsiProducts as unknown as Array<{ productSnapshot?: Record<string, unknown> }>;
}

describe("normalizeKonsumsiPayload — legacy productSnapshot", () => {
  it("turns countryOfOriginName into countryOfOriginNames and drops the old key", () => {
    const [product] = normalizeProducts([legacyProduct()]);
    assert.deepEqual(product.productSnapshot?.countryOfOriginNames, ["Tiongkok"]);
    assert.equal("countryOfOriginName" in (product.productSnapshot ?? {}), false);
    assert.equal(product.productSnapshot?.brandName, "ACME");
  });

  it("falls back to the product's originCountryNames when the old name is missing", () => {
    const snapshot = withoutLegacyCountry();
    const [product] = normalizeProducts([legacyProduct({ productSnapshot: snapshot })]);
    assert.deepEqual(product.productSnapshot?.countryOfOriginNames, ["Tiongkok"]);
  });

  it("leaves a current snapshot untouched and tolerates a missing one", () => {
    const rest = { ...withoutLegacyCountry(), countryOfOriginNames: ["Jepang"] };
    const [a, b] = normalizeProducts([legacyProduct({ productSnapshot: rest }), legacyProduct({ productSnapshot: undefined })]);
    assert.deepEqual(a.productSnapshot?.countryOfOriginNames, ["Jepang"]);
    assert.equal(b.productSnapshot, undefined);
  });
});

describe("konsumsiProductSchema — server-only snapshot is lenient", () => {
  it("parses a product whose legacy snapshot was never normalized", () => {
    const result = konsumsiProductSchema.safeParse(legacyProduct());
    assert.equal(result.success, true, JSON.stringify(result.error?.issues));
    if (result.success) assert.equal(result.data.productSnapshot, undefined);
  });

  it("keeps a valid current snapshot", () => {
    const result = konsumsiProductSchema.safeParse(
      legacyProduct({ productSnapshot: { ...withoutLegacyCountry(), countryOfOriginNames: ["Tiongkok"] } }),
    );
    assert.equal(result.success, true);
    if (result.success) assert.deepEqual(result.data.productSnapshot?.countryOfOriginNames, ["Tiongkok"]);
  });
});
