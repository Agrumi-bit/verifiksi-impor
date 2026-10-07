import type { ApplicationWizardValues } from "../../schema";
import type { ApplicationKonsumsiProductValues } from "./schema";

/** A product row saved before the multi-country feature — single `countryOfOrigin` (name) /
 * `countryOfOriginCode`, no `originCountries` array at all. */
type LegacyKonsumsiProduct = ApplicationKonsumsiProductValues & {
  countryOfOrigin?: string;
  countryOfOriginCode?: string;
};

/** `productSnapshot` as first written (single `countryOfOriginName`, no `countryOfOriginNames`). */
type LegacyProductSnapshot = Record<string, unknown> & { countryOfOriginName?: unknown; countryOfOriginNames?: unknown };

/** Upgrades an old-format snapshot to the current shape: `countryOfOriginName` (string) becomes
 * `countryOfOriginNames: [name]` (fallback: the product's own country names) and the old key is dropped. */
function normalizeProductSnapshot(
  snapshot: ApplicationKonsumsiProductValues["productSnapshot"],
  fallbackNames: string[] | undefined,
): ApplicationKonsumsiProductValues["productSnapshot"] {
  if (!snapshot) return snapshot;
  const { countryOfOriginName, ...rest } = snapshot as unknown as LegacyProductSnapshot;
  if (Array.isArray(rest.countryOfOriginNames)) return rest as unknown as typeof snapshot;
  const names =
    typeof countryOfOriginName === "string" && countryOfOriginName ? [countryOfOriginName] : (fallbackNames ?? []);
  return { ...rest, countryOfOriginNames: names } as unknown as typeof snapshot;
}

function normalizeKonsumsiProduct(product: LegacyKonsumsiProduct): ApplicationKonsumsiProductValues {
  const originCountries =
    product.originCountries ?? (product.countryOfOriginCode ? [product.countryOfOriginCode] : []);
  const originCountryNames =
    product.originCountryNames ?? (product.countryOfOrigin ? [product.countryOfOrigin] : undefined);
  const productSnapshot = normalizeProductSnapshot(product.productSnapshot, originCountryNames);
  return { ...product, originCountries, originCountryNames, productSnapshot };
}

/**
 * Defends every surface that reads a Konsumsi application's payload — application detail page,
 * wizard draft resume, Preview, read-only review, CR/Verifikator workspace, submit validation —
 * against a payload saved before the Step 7/9 refactor or before the multi-country feature. A
 * payload that old has no `productGroupCertificates`/`labelStatementDocument`/`originCountries`
 * at all (`undefined`, not `[]`/`null`), which crashes any `.length`/`.map`/`.join` call
 * downstream with "Cannot read properties of undefined". Only fills gaps with safe defaults —
 * never strips or migrates other legacy fields (e.g. a lingering `brandQualityTests` is left
 * alone; Stage D's cleanup script, not this function, is the one place that removes it for good).
 * Safe to call on an already-current payload — every default is a no-op `??` fallback.
 */
export function normalizeKonsumsiPayload(payload: ApplicationWizardValues): ApplicationWizardValues {
  return {
    ...payload,
    applicationBrands: payload.applicationBrands ?? [],
    labelStatementDocument: payload.labelStatementDocument ?? null,
    labelDocumentationDocument: payload.labelDocumentationDocument ?? null,
    productGroupCertificates: payload.productGroupCertificates ?? [],
    konsumsiDocuments: payload.konsumsiDocuments ?? [],
    konsumsiFinancialDocuments: payload.konsumsiFinancialDocuments ?? [],
    konsumsiProducts: (payload.konsumsiProducts ?? []).map(normalizeKonsumsiProduct),
  };
}
