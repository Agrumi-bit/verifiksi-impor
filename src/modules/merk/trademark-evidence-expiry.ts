const TANDA_DAFTAR_MEREK_MAX_VALIDITY_MONTHS = 6;

/**
 * "Tanda Pendaftaran Merek" is a provisional registration notice issued before the actual
 * certificate, not the certificate itself — DJKI only recognizes it as valid bukti merek for 6
 * months from its own `registrationDate`, regardless of whatever `registrationExpiryDate` (if
 * any) was typed in at upload time, and regardless of the `trademark_evidence` BrandDocument
 * row's own `expiryDate` (which the Step 1 upload card never actually collects — see
 * `step1-brand-info.tsx`'s `BrandDocumentUploadCard`, always null in practice). Every other
 * evidence type (Sertifikat Merek, Sertifikat Internasional) keeps whatever
 * `registrationExpiryDate` says, unchanged — those are final certificates with their own stated
 * validity, not a 6-month regulatory cap.
 */
export function resolveTrademarkEvidenceExpiry(
  certificateType: string | null,
  registrationDate: Date | null,
  registrationExpiryDate: Date | null,
): Date | null {
  if (certificateType !== "TANDA_DAFTAR_MEREK" || !registrationDate) return registrationExpiryDate;
  const maxValidity = new Date(registrationDate);
  maxValidity.setMonth(maxValidity.getMonth() + TANDA_DAFTAR_MEREK_MAX_VALIDITY_MONTHS);
  if (registrationExpiryDate && registrationExpiryDate.getTime() < maxValidity.getTime()) {
    return registrationExpiryDate;
  }
  return maxValidity;
}
