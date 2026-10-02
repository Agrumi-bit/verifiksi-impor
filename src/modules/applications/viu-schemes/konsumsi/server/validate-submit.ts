import { db } from "@/lib/db";
import type { MerkEvidenceType } from "@/modules/merk/schema";
import { getVIUConsumptionBrandRequirements } from "../business-rules";
import type { ApplicationBrandEntryValues, ApplicationBrandSubmissionSnapshot } from "../schema";
import type { ApplicationWizardValues } from "../../../schema";

// Prisma's MerkCertificateType enum still carries the legacy "LAINNYA" value
// (rows from the pre-drawer wizard) that the current evidence-type set
// doesn't cover — see SUPPORTED_EVIDENCE_TYPES in
// map-merk-detail-to-wizard-values.ts for the same guard on the client side.
const SUPPORTED_EVIDENCE_TYPES = new Set<string>([
  "SERTIFIKAT_MEREK_TERDAFTAR",
  "TANDA_DAFTAR_MEREK",
  "SERTIFIKAT_INTERNASIONAL",
]);
function toEvidenceType(value: string | null): MerkEvidenceType | null {
  return value && SUPPORTED_EVIDENCE_TYPES.has(value) ? (value as MerkEvidenceType) : null;
}

/**
 * Quality Test commodity references, Konsumsi-specific shape: "Kelompok
 * Komoditas" (IndustryGroup) + "Sub Kelompok Komoditas" (CommodityGroup) —
 * one level higher than Brand Master's own CommodityGroup/CommoditySubGroup
 * pair (modules/merk/server-validation.ts's validateQualityTestReferences),
 * so this is its own check rather than a reuse of that one.
 */
async function validateKonsumsiQualityTestReferences(
  qualityTests: { industryGroupId: string; commodityGroupId: string }[] | undefined,
): Promise<string | null> {
  for (const qt of qualityTests ?? []) {
    const group = await db.commodityGroup.findUnique({ where: { id: qt.commodityGroupId } });
    if (!group) return "Sub Kelompok Komoditas pada Hasil Uji Mutu tidak ditemukan";
    if (group.industryGroupId !== qt.industryGroupId) {
      return "Sub Kelompok Komoditas pada Hasil Uji Mutu tidak sesuai dengan Kelompok Komoditas yang dipilih";
    }
  }
  return null;
}

type ValidateKonsumsiSubmitInput = Pick<
  ApplicationWizardValues,
  "verificationType" | "importTypes" | "companyId" | "applicationBrands" | "brandQualityTests"
>;

type ValidateKonsumsiSubmitResult =
  | { error: string }
  | { ok: true; applicationBrands: ApplicationBrandEntryValues[] };

/**
 * Server-side enforcement for VIU Konsumsi's Step "Merek yang Digunakan" +
 * "Hasil Uji Mutu" — mirrors modules/merk/server-validation.ts's pattern (a
 * plain async function called after zod parse, not folded into the zod
 * schema itself, since it needs a DB read). Never trust the client's own
 * computed readiness, document count, or brand metadata: this re-validates
 * Brand ownership/status, the 9-month evidence rule, the relationship's
 * structural validity, and quality-test master-data references
 * independently, exactly the same rules `getVIUConsumptionBrandRequirements`
 * applies client-side.
 *
 * On success, returns `applicationBrands` with a server-built
 * `submissionSnapshot` attached to each entry (see
 * `buildSubmissionSnapshot` below) — the caller (POST /api/applications)
 * persists THIS returned array, never the client-submitted one, so the
 * snapshot is always server-authoritative.
 */
export async function validateKonsumsiSubmit(
  values: ValidateKonsumsiSubmitInput,
): Promise<ValidateKonsumsiSubmitResult> {
  // Merek yang Digunakan is a VIU Barang Konsumsi concept only — never VKI, regardless of
  // whatever `importTypes` a payload happens to carry (see the same guard on
  // applicationWizardSchema's superRefine for why stale importTypes can't be trusted alone).
  if (values.verificationType !== "VIU") return { ok: true, applicationBrands: values.applicationBrands };
  if (!values.importTypes.includes("BARANG_KONSUMSI")) {
    return { ok: true, applicationBrands: values.applicationBrands };
  }
  if (values.applicationBrands.length === 0) {
    return { error: "Pilih atau tambahkan minimal satu merek yang digunakan." };
  }

  const brandIds = values.applicationBrands.map((entry) => entry.brandId);
  if (new Set(brandIds).size !== brandIds.length) {
    return { error: "Merek yang sama tidak dapat dipilih lebih dari sekali dalam satu permohonan." };
  }

  const brands = await db.merk.findMany({
    where: { id: { in: brandIds } },
    include: {
      ownership: { select: { ownerLocation: true, ownerName: true, ownerCompany: { select: { name: true } } } },
    },
  });
  const brandById = new Map(brands.map((brand) => [brand.id, brand]));

  // Batch-resolve every referenced Official Representative in one query
  // instead of one findUnique per brand entry (avoids N+1 — several entries
  // commonly reference the same representative).
  const representativeIds = [
    ...new Set(
      values.applicationBrands
        .map((entry) => entry.officialRepresentativeCompanyId)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const representatives =
    representativeIds.length > 0
      ? await db.brandOwner.findMany({ where: { id: { in: representativeIds } } })
      : [];
  const representativeById = new Map(representatives.map((rep) => [rep.id, rep]));

  const snapshotBrands: ApplicationBrandEntryValues[] = [];
  const capturedAt = new Date().toISOString();

  for (const entry of values.applicationBrands) {
    const brand = brandById.get(entry.brandId);
    if (!brand) {
      return { error: "Salah satu merek pada permohonan ini tidak ditemukan." };
    }
    if (values.companyId && brand.companyId !== values.companyId) {
      return { error: `Merek "${brand.brandName}" tidak terdaftar untuk perusahaan pemohon ini.` };
    }
    if (brand.status !== "ACTIVE") {
      return {
        error: `Merek "${brand.brandName}" berstatus ${brand.status} dan tidak dapat digunakan pada permohonan ini.`,
      };
    }

    const ownerLocation =
      brand.ownership?.ownerLocation === "DOMESTIC"
        ? "domestic"
        : brand.ownership?.ownerLocation === "FOREIGN"
          ? "foreign"
          : null;

    let representativeName: string | null = null;
    if (entry.appointmentSource === "OFFICIAL_REPRESENTATIVE" && entry.officialRepresentativeCompanyId) {
      const representative = representativeById.get(entry.officialRepresentativeCompanyId);
      if (!representative) {
        return { error: `Perwakilan Resmi untuk merek "${brand.brandName}" tidak ditemukan.` };
      }
      representativeName = representative.name;
    }

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

    if (requirements.evidenceValidity.status === "EXPIRED_9_MONTH_LIMIT") {
      return {
        error: `Tanda pendaftaran merek "${brand.brandName}" telah melewati batas penggunaan 9 bulan dan tidak dapat digunakan sebagai pengganti Sertifikat Merek.`,
      };
    }
    if (!requirements.relationshipValid) {
      return {
        error: requirements.relationshipIssue
          ? `${requirements.relationshipIssue} (Merek "${brand.brandName}")`
          : `Hubungan merek "${brand.brandName}" dengan perusahaan pemohon tidak valid.`,
      };
    }
    if (requirements.missingRequiredDocumentCount > 0) {
      const missingLabels = requirements.requirements
        .filter((item) => item.requirementStatus === "REQUIRED" && item.availability !== "AVAILABLE")
        .map((item) => item.label)
        .join(", ");
      return {
        error: `Merek "${brand.brandName}" belum lengkap: ${missingLabels}.`,
      };
    }

    const brandOwnerName = brand.ownership
      ? (brand.ownership.ownerCompany?.name ?? brand.ownership.ownerName)
      : null;

    const snapshot: ApplicationBrandSubmissionSnapshot = {
      capturedAt,
      brandName: brand.brandName,
      brandOwnerName: brandOwnerName ?? null,
      ownerLocation,
      trademarkEvidenceType: brand.certificateType ?? null,
      registrationNumber: brand.registrationNumber ?? null,
      trademarkClass: brand.trademarkClass ?? null,
      registrationDate: brand.registrationDate?.toISOString() ?? null,
      officialRepresentativeName: representativeName,
      relationshipSummary: `${entry.applicantRole}${entry.appointmentSource ? ` / ${entry.appointmentSource}` : ""}`,
      readinessAtSubmission: requirements.readiness,
      requiredDocumentLabels: requirements.requirements
        .filter((item) => item.requirementStatus === "REQUIRED")
        .map((item) => item.label),
    };

    snapshotBrands.push({ ...entry, submissionSnapshot: snapshot });
  }

  // Quality-test master-data references — Konsumsi's own shape (industryGroupId /
  // commodityGroupId), see validateKonsumsiQualityTestReferences above.
  const qualityTestError = await validateKonsumsiQualityTestReferences(values.brandQualityTests);
  if (qualityTestError) {
    return { error: qualityTestError };
  }

  return { ok: true, applicationBrands: snapshotBrands };
}
