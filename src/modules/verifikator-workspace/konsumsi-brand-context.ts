import { db } from "@/lib/db";
import { getVIUConsumptionBrandRequirements } from "@/modules/applications/viu-schemes/konsumsi/business-rules";
import type { ApplicationBrandEntryValues } from "@/modules/applications/viu-schemes/konsumsi/schema";
import type { MerkEvidenceType } from "@/modules/merk/schema";

// Mirrors validate-submit.ts's own guard — Prisma's MerkCertificateType enum still carries the
// legacy "LAINNYA" value the current evidence-type set doesn't cover.
const SUPPORTED_EVIDENCE_TYPES = new Set<string>(["SERTIFIKAT_MEREK_TERDAFTAR", "TANDA_DAFTAR_MEREK", "SERTIFIKAT_INTERNASIONAL"]);
function toEvidenceType(value: string | null): MerkEvidenceType | null {
  return value && SUPPORTED_EVIDENCE_TYPES.has(value) ? (value as MerkEvidenceType) : null;
}

/**
 * Resolved per-`applicationBrands`-entry shape `buildDocumentChecklist` needs to build its
 * "Dokumen Merek" checklist items — the brand's own bukti merek file (`registrationDocumentPath`,
 * live on `Merk`, never stored in the application's `submissionSnapshot`) plus which relationship
 * documents this specific entry's role actually requires, computed via the exact same
 * `getVIUConsumptionBrandRequirements` rule engine Step "Merek yang Digunakan" and
 * `validateKonsumsiSubmit` already use — never a second, independently-maintained document list.
 */
export type ChecklistKonsumsiBrandContext = {
  brandId: string;
  brandName: string;
  registrationDocumentPath: string | null;
  requiredRelationshipDocuments: { code: string; label: string }[];
};

/** One context per `applicationBrands` entry (not deduped by brandId) — the required-document set
 * depends on that entry's own `applicantRole`/`appointmentSource`, not the brand alone. */
export async function resolveKonsumsiBrandContexts(
  applicationBrands: ApplicationBrandEntryValues[],
): Promise<ChecklistKonsumsiBrandContext[]> {
  const brandIds = [...new Set(applicationBrands.map((entry) => entry.brandId))];
  if (brandIds.length === 0) return [];

  const brands = await db.merk.findMany({
    where: { id: { in: brandIds } },
    select: {
      id: true,
      brandName: true,
      status: true,
      certificateType: true,
      registrationDate: true,
      registrationDocumentPath: true,
      ownership: { select: { ownerLocation: true } },
    },
  });
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));

  return applicationBrands.map((entry) => {
    const brand = brandById.get(entry.brandId);
    if (!brand) {
      return { brandId: entry.brandId, brandName: "Merek tidak ditemukan", registrationDocumentPath: null, requiredRelationshipDocuments: [] };
    }
    const ownerLocation =
      brand.ownership?.ownerLocation === "DOMESTIC" ? "domestic" : brand.ownership?.ownerLocation === "FOREIGN" ? "foreign" : null;
    const requirements = getVIUConsumptionBrandRequirements({
      brandStatus: brand.status,
      evidenceType: toEvidenceType(brand.certificateType),
      registrationDate: brand.registrationDate?.toISOString() ?? null,
      ownerLocation,
      applicantRole: entry.applicantRole,
      appointmentSource: entry.appointmentSource ?? null,
      officialRepresentativeCompanyId: entry.officialRepresentativeCompanyId ?? null,
      availableDocumentCodes: new Set(Object.keys(entry.relationshipDocuments ?? {})),
    });
    return {
      brandId: entry.brandId,
      brandName: brand.brandName,
      registrationDocumentPath: brand.registrationDocumentPath,
      requiredRelationshipDocuments: requirements.requirements
        .filter((requirement) => requirement.requirementStatus === "REQUIRED")
        .map((requirement) => ({ code: requirement.code, label: requirement.label })),
    };
  });
}
