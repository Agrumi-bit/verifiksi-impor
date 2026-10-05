import { z } from "zod";

import { db } from "@/lib/db";
import { syncQualityTestCertificatesForApplication } from "@/modules/merk/application-relationship-sync";
import type { ApplicationWizardValues } from "../../../schema";
import type { ProductGroupCertificateValues } from "../schema";
import { newCertificateKey, otherGroupsSharing, upsertGroupCertificate } from "../shared-certificates";

export { parseQualityTestChecklistKey } from "../qt-checklist-key";

export const certificateUploadSchema = z.union([
  z.object({ qualityTestId: z.string().trim().min(1) }),
  z.object({
    certificateNumber: z.string().trim().min(1, "Nomor sertifikat wajib diisi"),
    laboratoryName: z.string().trim().min(1, "Nama laboratorium wajib diisi"),
    issueDate: z.string().trim().min(1, "Tanggal terbit wajib diisi"),
    validUntil: z.string().trim().optional(),
    filePath: z.string().trim().min(1, "File sertifikat wajib diunggah"),
    fileName: z.string().trim().min(1),
  }),
]);
export type CertificateUploadInput = z.infer<typeof certificateUploadSchema>;

/**
 * CR/Verifikator's "Unggah" / "Ganti File" action on the "Sertifikat Uji Mutu" checklist category
 * — same contract as the Step "Product Information" certificate panel this mirrors
 * (commodity-product-section.tsx's own `handleCertificateChange`), just reachable from the
 * review workspaces instead of the applicant's own wizard. Writes into
 * `payload.productGroupCertificates` (upsert by brandId+commodityGroupId), then runs the same
 * `syncQualityTestCertificatesForApplication` sync the submit path uses, so a fresh upload here
 * shows up in Hasil Uji Mutu exactly like one attached at submit time. A `qualityTestId` reference
 * is resolved from the real row (never trusted from the client) and is never duplicated into a new
 * `BrandQualityTest` row — same rule `validateProductGroupCertificates` enforces at submit.
 *
 * Deliberately does NOT touch `verificationStatus` (stays "Belum Diperiksa"/`NOT_YET_VERIFIED`,
 * the default for a new version — see recordApplicationDocumentVersion) or `Application.status` —
 * an upload on the company's behalf is not itself a review decision.
 */
export async function applyCertificateUpload(
  payload: ApplicationWizardValues,
  brandId: string,
  commodityGroupId: string,
  input: CertificateUploadInput,
): Promise<{ error: string } | { ok: true; payload: ApplicationWizardValues; certificate: ProductGroupCertificateValues }> {
  const commodityName = payload.konsumsiProducts?.find(
    (p) => p.brandId === brandId && p.commodityGroupId === commodityGroupId,
  )?.commodityName;

  let certificate: ProductGroupCertificateValues;

  if ("qualityTestId" in input) {
    const existing = await db.brandQualityTest.findUnique({ where: { id: input.qualityTestId } });
    if (!existing) {
      return { error: "Sertifikat Hasil Uji Mutu yang dipilih tidak ditemukan." };
    }
    // Same Brand, any of its Sub Kelompok — one certificate may cover several groups.
    if (existing.merkId !== brandId) {
      return { error: "Sertifikat yang dipilih milik merek lain dan tidak dapat dipakai untuk merek ini." };
    }
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (existing.expiryDate && existing.expiryDate < today) {
      return { error: `Sertifikat "${existing.certificateNumber}" sudah kedaluwarsa dan tidak dapat digunakan.` };
    }
    certificate = {
      brandId,
      commodityGroupId,
      commodityName,
      qualityTestId: existing.id,
      certificateNumber: existing.certificateNumber,
      laboratoryName: existing.laboratoryName,
      issueDate: existing.issueDate.toISOString(),
      validUntil: existing.expiryDate?.toISOString(),
      fileName: existing.fileName,
      filePath: existing.filePath,
    };
  } else {
    if (input.validUntil) {
      const validUntil = new Date(input.validUntil);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (!Number.isNaN(validUntil.getTime()) && validUntil < today) {
        return { error: `Tanggal berlaku sertifikat (${input.validUntil}) sudah lewat.` };
      }
    }
    certificate = {
      brandId,
      commodityGroupId,
      commodityName,
      certificateNumber: input.certificateNumber,
      laboratoryName: input.laboratoryName,
      issueDate: input.issueDate,
      validUntil: input.validUntil,
      fileName: input.fileName,
      filePath: input.filePath,
    };
  }

  // A certificate shared by several Sub Kelompok is one checklist row: replacing it replaces it for
  // every group that used it (a fresh upload keeps the shared `certificateKey`).
  const current = payload.productGroupCertificates ?? [];
  const previous = current.find((c) => c.brandId === brandId && c.commodityGroupId === commodityGroupId);
  if (previous && !certificate.qualityTestId && otherGroupsSharing(current, previous).length > 0) {
    certificate = { ...certificate, certificateKey: previous.certificateKey ?? newCertificateKey() };
  }
  const updatedCertificates = upsertGroupCertificate(current, certificate, { propagateFrom: previous });

  return { ok: true, payload: { ...payload, productGroupCertificates: updatedCertificates }, certificate };
}

/** Re-runs the submit-time sync for one application — call after persisting the updated payload
 * from `applyCertificateUpload`, so a CR/Verifikator-uploaded certificate reaches Hasil Uji Mutu
 * the same way one attached at submit does. */
export async function resyncQualityTestCertificates(applicationId: string, payload: ApplicationWizardValues): Promise<void> {
  await syncQualityTestCertificatesForApplication({
    applicationId,
    productGroupCertificates: payload.productGroupCertificates ?? [],
  });
}
