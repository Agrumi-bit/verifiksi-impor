import type { ProductGroupCertificateValues } from "./schema";

/**
 * One Hasil Uji Mutu certificate may cover several Sub Kelompok Komoditas of the SAME Brand.
 * `productGroupCertificates` keeps one entry per (brand, Sub Kelompok) group — every existing
 * reader (matrix, submit rules, document list) stays per-group — and entries that are "the same
 * certificate" share an identity:
 *   - a picked BrandQualityTest row → its `qualityTestId`;
 *   - a freshly uploaded certificate → its `certificateKey`;
 *   - neither (entries saved before sharing existed) → unshared, its own group.
 * Data of entries sharing an identity is kept identical: editing one edits all of them.
 * Pure — no db import, safe for client and server.
 */

type CertificateLike = Pick<ProductGroupCertificateValues, "brandId" | "commodityGroupId" | "qualityTestId" | "certificateKey">;

export function certificateShareKey(certificate: CertificateLike): string {
  if (certificate.qualityTestId) return `qt:${certificate.qualityTestId}`;
  if (certificate.certificateKey) return `key:${certificate.certificateKey}`;
  return `group:${certificate.brandId}|${certificate.commodityGroupId}`;
}

export function isSameCertificate(a: CertificateLike, b: CertificateLike): boolean {
  return a.brandId === b.brandId && certificateShareKey(a) === certificateShareKey(b);
}

/** The OTHER group entries using the same certificate as `certificate`. */
export function otherGroupsSharing<T extends CertificateLike>(certificates: readonly T[], certificate: CertificateLike): T[] {
  return certificates.filter(
    (c) => isSameCertificate(c, certificate) && !(c.brandId === certificate.brandId && c.commodityGroupId === certificate.commodityGroupId),
  );
}

export function newCertificateKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

const CERTIFICATE_DATA_FIELDS = [
  "qualityTestId",
  "certificateKey",
  "certificateNumber",
  "laboratoryName",
  "issueDate",
  "validUntil",
  "fileName",
  "filePath",
] as const;

/** `source`'s certificate data placed on another group (brand stays, group fields are the target's). */
export function certificateForGroup(
  source: ProductGroupCertificateValues,
  group: { brandId: string; commodityGroupId: string; commodityName?: string },
): ProductGroupCertificateValues {
  const data = Object.fromEntries(CERTIFICATE_DATA_FIELDS.map((field) => [field, source[field]]));
  return { ...data, brandId: group.brandId, commodityGroupId: group.commodityGroupId, commodityName: group.commodityName } as ProductGroupCertificateValues;
}

/** Upserts `certificate` into its group, and — when `propagate` — copies its data onto every other
 * entry that shared `previousShareKey` (same brand), keeping shared entries identical. */
export function upsertGroupCertificate(
  certificates: readonly ProductGroupCertificateValues[],
  certificate: ProductGroupCertificateValues,
  options: { propagateFrom?: CertificateLike } = {},
): ProductGroupCertificateValues[] {
  const isTarget = (c: ProductGroupCertificateValues) => c.brandId === certificate.brandId && c.commodityGroupId === certificate.commodityGroupId;
  const propagateFrom = options.propagateFrom;
  const next = certificates.map((c) => {
    if (isTarget(c)) return certificate;
    if (propagateFrom && isSameCertificate(c, propagateFrom)) return certificateForGroup(certificate, c);
    return c;
  });
  return next.some(isTarget) ? next : [...next, certificate];
}

/** Applies `source` to several groups at once ("Gunakan sertifikat ini untuk Sub Kelompok lain"). */
export function applyCertificateToGroups(
  certificates: readonly ProductGroupCertificateValues[],
  source: ProductGroupCertificateValues,
  groups: readonly { brandId: string; commodityGroupId: string; commodityName?: string }[],
): ProductGroupCertificateValues[] {
  let next = [...certificates];
  for (const group of groups) {
    if (group.brandId !== source.brandId) continue; // never across brands
    next = upsertGroupCertificate(next, certificateForGroup(source, group));
  }
  return next;
}

/** Groups entries by certificate identity — one bucket per distinct certificate (same brand). */
export function groupSharedCertificates<T extends CertificateLike>(certificates: readonly T[]): T[][] {
  const buckets = new Map<string, T[]>();
  for (const certificate of certificates) {
    const key = `${certificate.brandId}::${certificateShareKey(certificate)}`;
    const bucket = buckets.get(key);
    if (bucket) bucket.push(certificate);
    else buckets.set(key, [certificate]);
  }
  return [...buckets.values()];
}
