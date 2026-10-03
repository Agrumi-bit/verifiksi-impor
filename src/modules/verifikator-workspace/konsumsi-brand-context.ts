import { db } from "@/lib/db";
import { getVIUConsumptionBrandRequirements } from "@/modules/applications/viu-schemes/konsumsi/business-rules";
import type { ApplicationBrandEntryValues, ApplicationKonsumsiProductValues } from "@/modules/applications/viu-schemes/konsumsi/schema";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
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
      applicantRole: entry.applicantRole ?? null,
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

/**
 * HS Code text → its master-data Sub Kelompok Komoditas, for `buildDocumentChecklist`'s own
 * "Sertifikat Uji Mutu" section — a fallback for `konsumsiProducts` rows whose cached
 * `commodityGroupId` is empty (pre-refactor rows submitted before Step 9's HS-Code-driven
 * grouping existed; see that function's own comment). Only called when the application actually
 * has such products — no point loading all of master data otherwise.
 */
export async function resolveKonsumsiHsCodeLookup(
  products: { hsCode: string; commodityGroupId?: string }[],
): Promise<Map<string, { commodityGroupId: string; commodityName: string }>> {
  const codesNeedingLookup = [...new Set(products.filter((p) => !p.commodityGroupId).map((p) => p.hsCode).filter(Boolean))];
  if (codesNeedingLookup.length === 0) return new Map();

  const rows = await db.hsCodeMasterData.findMany({
    where: { hsCode: { in: codesNeedingLookup } },
    include: { commodityGroup: true },
  });
  return new Map(rows.map((row) => [row.hsCode, { commodityGroupId: row.commodityGroupId, commodityName: row.commodityGroup.name }]));
}

/** Convenience wrapper over the two resolvers above — every `buildDocumentChecklist` caller that
 * cares about Konsumsi's "Dokumen Merek"/"Sertifikat Uji Mutu" sections needs both (or neither),
 * so this is the one call site-level helper to reach for instead of repeating the
 * `importTypes?.includes("BARANG_KONSUMSI") ? await resolve...() : undefined` pair inline. */
export async function resolveKonsumsiChecklistContext(
  payload: Pick<ApplicationWizardValues, "importTypes" | "applicationBrands" | "konsumsiProducts">,
): Promise<{
  konsumsiBrands: Awaited<ReturnType<typeof resolveKonsumsiBrandContexts>> | undefined;
  konsumsiHsCodeLookup: Awaited<ReturnType<typeof resolveKonsumsiHsCodeLookup>> | undefined;
}> {
  if (!payload.importTypes?.includes("BARANG_KONSUMSI")) {
    return { konsumsiBrands: undefined, konsumsiHsCodeLookup: undefined };
  }
  const [konsumsiBrands, konsumsiHsCodeLookup] = await Promise.all([
    resolveKonsumsiBrandContexts(payload.applicationBrands ?? []),
    resolveKonsumsiHsCodeLookup((payload.konsumsiProducts ?? []) as ApplicationKonsumsiProductValues[]),
  ]);
  return { konsumsiBrands, konsumsiHsCodeLookup };
}
