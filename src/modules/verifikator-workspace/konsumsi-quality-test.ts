import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { isSameCertificate } from "@/modules/applications/viu-schemes/konsumsi/shared-certificates";
import { qualityTestSubmissionWindow } from "@/modules/applications/viu-schemes/konsumsi/quality-test-window";
import type { ChecklistKonsumsiBrandContext } from "./konsumsi-brand-context";

/** What the verifikator compares a Sertifikat Hasil Uji Mutu against — shared by the review
 * modal's "Uraian yang Diperiksa" and the Laporan Verifikasi Dokumen page. Pure (payload only). */
export type QualityTestReviewValues = {
  brandName: string;
  subKelompokKomoditas: string;
  reportNumber: string;
  laboratoryName: string;
  issueDate: string;
  submissionWindow: string;
};

function formatTanggal(value: string | null | undefined): string {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Values for checklist key `konsumsi-qt:{brandId}:{commodityGroupId}`; null when that group has no certificate entry. */
export function qualityTestReviewValues(
  payload: Pick<ApplicationWizardValues, "productGroupCertificates" | "konsumsiProducts" | "submissionDate">,
  konsumsiBrands: ChecklistKonsumsiBrandContext[] | undefined,
  brandId: string,
  commodityGroupId: string,
): QualityTestReviewValues | null {
  const certificates = payload.productGroupCertificates ?? [];
  const certificate = certificates.find((c) => c.brandId === brandId && c.commodityGroupId === commodityGroupId);
  if (!certificate) return null;
  const groupName = (groupId: string, cached?: string) =>
    cached || payload.konsumsiProducts?.find((p) => p.brandId === brandId && p.commodityGroupId === groupId)?.commodityName || groupId;
  // One certificate may cover several Sub Kelompok of the brand — list every one it covers.
  const covered = certificate.filePath
    ? certificates.filter((c) => c.filePath && isSameCertificate(c, certificate))
    : [certificate];
  return {
    brandName: konsumsiBrands?.find((b) => b.brandId === brandId)?.brandName ?? "",
    subKelompokKomoditas: [...new Set(covered.map((c) => groupName(c.commodityGroupId, c.commodityName)))].join(", "),
    reportNumber: certificate.certificateNumber,
    laboratoryName: certificate.laboratoryName,
    issueDate: formatTanggal(certificate.issueDate),
    submissionWindow: qualityTestSubmissionWindow(certificate.issueDate, payload.submissionDate).label,
  };
}
