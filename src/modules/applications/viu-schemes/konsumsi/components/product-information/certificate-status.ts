import type { ProductGroupCertificateValues } from "../../schema";

export type CertificateStatus = "valid" | "expiring" | "missing" | "mismatched";

export const CERTIFICATE_STATUS_LABELS: Record<CertificateStatus, string> = {
  valid: "Ada & berlaku",
  expiring: "Akan kedaluwarsa",
  missing: "Belum ada",
  mismatched: "Tidak sesuai cakupan",
};

export const CERTIFICATE_STATUS_CLASSES: Record<CertificateStatus, string> = {
  valid: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  expiring: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  missing: "bg-destructive/10 text-destructive",
  mismatched: "bg-destructive/10 text-destructive",
};

const EXPIRING_SOON_DAYS = 30;

/**
 * A certificate's own scope (`commodityGroupId`) must match the group it's attached to — this can
 * only drift if the matrix's own state goes stale (e.g. a product's HS Code was changed after the
 * certificate was picked), since the pick flow itself always scopes the "pilih existing" list to
 * the current group. Still checked here so the matrix surfaces it rather than silently accepting a
 * mismatched cert (server re-validates independently regardless — see validateProductGroupCertificates).
 */
export function computeCertificateStatus(
  certificate: ProductGroupCertificateValues | undefined,
  group: { brandId: string; commodityGroupId: string },
  today: Date,
): CertificateStatus {
  if (!certificate || !certificate.filePath) return "missing";
  if (certificate.brandId !== group.brandId || certificate.commodityGroupId !== group.commodityGroupId) return "mismatched";
  if (!certificate.validUntil) return "valid";
  const validUntil = new Date(certificate.validUntil);
  if (Number.isNaN(validUntil.getTime())) return "valid";
  const daysLeft = (validUntil.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
  if (daysLeft < 0) return "missing";
  if (daysLeft <= EXPIRING_SOON_DAYS) return "expiring";
  return "valid";
}
