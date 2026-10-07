import { db } from "@/lib/db";
import {
  APPLICANT_BRAND_ROLE_LABELS,
  IMPORT_APPOINTMENT_SOURCE_LABELS,
  getVIUConsumptionBrandRequirements,
} from "@/modules/applications/viu-schemes/konsumsi/business-rules";
import type { ApplicationBrandEntryValues, ApplicationKonsumsiProductValues } from "@/modules/applications/viu-schemes/konsumsi/schema";
import type { ApplicationWizardValues } from "@/modules/applications/schema";
import { MERK_EVIDENCE_TYPE_LABELS, type MerkEvidenceType } from "@/modules/merk/schema";

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
/** What the verifikator compares the uploaded Sertifikat Merek against ("Uraian yang Diperiksa"):
 * the brand's own data from Merek Management plus this application entry's relationship to it. */
export type KonsumsiBrandDetails = {
  evidenceTypeLabel: string;
  registrationNumber: string | null;
  registrationDate: string | null;
  registrationExpiryDate: string | null;
  trademarkClasses: string[];
  ownerName: string | null;
  applicantRelationship: string | null;
};

export type ChecklistKonsumsiBrandContext = {
  brandId: string;
  brandName: string;
  registrationDocumentPath: string | null;
  requiredRelationshipDocuments: { code: string; label: string }[];
  details: KonsumsiBrandDetails | null;
};

function applicantRelationshipLabel(entry: ApplicationBrandEntryValues): string | null {
  if (!entry.applicantRole) return null;
  const role = APPLICANT_BRAND_ROLE_LABELS[entry.applicantRole];
  if (entry.applicantRole !== "IMPORTER_ONLY" || !entry.appointmentSource) return role;
  return `${role} (ditunjuk oleh ${IMPORT_APPOINTMENT_SOURCE_LABELS[entry.appointmentSource]})`;
}

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
      hasCertificate: true,
      registrationNumber: true,
      registrationExpiryDate: true,
      trademarkClass: true,
      trademarkClassDescription: true,
      trademarkClassEntries: { select: { trademarkClass: true, trademarkClassDescription: true }, orderBy: { createdAt: "asc" } },
      brandOwnerName: true,
      brandOwner: { select: { name: true } },
      ownership: { select: { ownerLocation: true, ownerName: true, ownerCompany: { select: { name: true } } } },
    },
  });
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));

  return applicationBrands.map((entry) => {
    const brand = brandById.get(entry.brandId);
    if (!brand) {
      return {
        brandId: entry.brandId,
        brandName: "Merek tidak ditemukan",
        registrationDocumentPath: null,
        requiredRelationshipDocuments: [],
        details: null,
      };
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
      details: buildBrandDetails(brand, entry),
    };
  });
}

type BrandRowForDetails = {
  hasCertificate: boolean;
  certificateType: string | null;
  registrationNumber: string | null;
  registrationDate: Date | null;
  registrationExpiryDate: Date | null;
  trademarkClass: string | null;
  trademarkClassDescription: string | null;
  trademarkClassEntries: { trademarkClass: string; trademarkClassDescription: string }[];
  brandOwnerName: string;
  brandOwner: { name: string } | null;
  ownership: { ownerName: string | null; ownerCompany: { name: string } | null } | null;
};

function formatTrademarkClass(trademarkClass: string, description: string | null): string {
  return description ? `Kelas ${trademarkClass} — ${description}` : `Kelas ${trademarkClass}`;
}

function buildBrandDetails(brand: BrandRowForDetails, entry: ApplicationBrandEntryValues): KonsumsiBrandDetails {
  const evidenceType = toEvidenceType(brand.certificateType);
  const trademarkClasses = brand.trademarkClassEntries.length
    ? brand.trademarkClassEntries.map((c) => formatTrademarkClass(c.trademarkClass, c.trademarkClassDescription))
    : brand.trademarkClass
      ? [formatTrademarkClass(brand.trademarkClass, brand.trademarkClassDescription)]
      : [];
  return {
    evidenceTypeLabel: !brand.hasCertificate
      ? "Tidak mempunyai sertifikat"
      : evidenceType
        ? MERK_EVIDENCE_TYPE_LABELS[evidenceType]
        : "",
    registrationNumber: brand.registrationNumber,
    registrationDate: brand.registrationDate?.toISOString() ?? null,
    registrationExpiryDate: brand.registrationExpiryDate?.toISOString() ?? null,
    trademarkClasses,
    // MerkOwnership (current wizard) first; legacy rows only carry brandOwner / brandOwnerName.
    ownerName: brand.ownership?.ownerCompany?.name || brand.ownership?.ownerName || brand.brandOwner?.name || brand.brandOwnerName || null,
    applicantRelationship: applicantRelationshipLabel(entry),
  };
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
