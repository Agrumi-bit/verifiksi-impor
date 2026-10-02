import { db } from "@/lib/db";
import type { MerkEvidenceType } from "@/modules/merk/schema";
import { getVIUConsumptionBrandRequirements } from "../business-rules";
import type {
  ApplicationBrandEntryValues,
  ApplicationBrandQualityTestEntryValues,
  ApplicationBrandSubmissionSnapshot,
  ApplicationKonsumsiProductValues,
} from "../schema";
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
  "verificationType" | "importTypes" | "applicationBrands" | "brandQualityTests" | "konsumsiProducts"
>;

type ValidateKonsumsiSubmitResult =
  | { error: string }
  | {
      ok: true;
      applicationBrands: ApplicationBrandEntryValues[];
      konsumsiProducts: ApplicationKonsumsiProductValues[];
    };

/**
 * Step "Product Information" — Konsumsi's own Merek > Kelompok Komoditas / Sub Kelompok
 * Komoditas > Produk structure. The commodity grouping is never picked independently in this
 * step (see `deriveKonsumsiProductGroups` in ../schema.ts), so every product's (brandId,
 * commodityGroupId) pair must match one already established in that same Brand's
 * `brandQualityTests` (Step "Dokumen Pendukung Merek") — never trusted from the client alone.
 * `hsCode` must be a real, active HS Code (keyed by code, the existing convention — see
 * useHsCodeOptions); `countryOfOrigin` a real, active country (keyed by name, the existing
 * convention — see useActiveCountries). Returns products with their display caches
 * (industryName/commodityName/hsDescription/unit/countryOfOriginCode) and a server-built
 * `productSnapshot` re-resolved from master data — never the client-submitted values for any of
 * these.
 */
async function validateKonsumsiProducts(
  qualityTests: ApplicationBrandQualityTestEntryValues[],
  products: ApplicationKonsumsiProductValues[] | undefined,
  validBrandIds: Set<string>,
  brandNameById: Map<string, string>,
): Promise<{ error: string } | { ok: true; products: ApplicationKonsumsiProductValues[] }> {
  const list = products ?? [];
  if (list.length === 0) return { ok: true, products: list };

  const validGroupKeys = new Set(qualityTests.map((qt) => `${qt.brandId}|${qt.commodityGroupId}`));
  const industryNameByGroupKey = new Map(qualityTests.map((qt) => [`${qt.brandId}|${qt.commodityGroupId}`, qt.industryName ?? ""]));

  for (const product of list) {
    if (!validBrandIds.has(product.brandId)) {
      return { error: `Merek pada produk "${product.productName}" tidak terdaftar dalam permohonan ini.` };
    }
    if (!validGroupKeys.has(`${product.brandId}|${product.commodityGroupId}`)) {
      return {
        error: `Kelompok komoditas pada produk "${product.productName}" tidak sesuai dengan Dokumen Pendukung Merek untuk merek ini.`,
      };
    }
  }

  const commodityGroupIds = [...new Set(list.map((p) => p.commodityGroupId))];
  const hsCodes = [...new Set(list.map((p) => p.hsCode))];
  const countryNames = [...new Set(list.map((p) => p.countryOfOrigin))];

  const [commodityGroups, hsCodeRows, countries] = await Promise.all([
    db.commodityGroup.findMany({ where: { id: { in: commodityGroupIds } } }),
    db.hsCodeMasterData.findMany({ where: { hsCode: { in: hsCodes } }, include: { unitOfMeasurement: true } }),
    db.countryMasterData.findMany({ where: { name: { in: countryNames } } }),
  ]);
  const commodityGroupById = new Map(commodityGroups.map((group) => [group.id, group]));
  const hsCodeByCode = new Map(hsCodeRows.map((row) => [row.hsCode, row]));
  const countryByName = new Map(countries.map((country) => [country.name, country]));

  const capturedAt = new Date().toISOString();
  const resolved: ApplicationKonsumsiProductValues[] = [];

  for (const product of list) {
    const commodityGroup = commodityGroupById.get(product.commodityGroupId);
    if (!commodityGroup || commodityGroup.status !== "ACTIVE") {
      return { error: `Kelompok komoditas tidak ditemukan untuk produk "${product.productName}".` };
    }
    const hsRow = hsCodeByCode.get(product.hsCode);
    if (!hsRow || hsRow.status !== "ACTIVE") {
      return { error: `HS Code "${product.hsCode}" tidak ditemukan untuk produk "${product.productName}".` };
    }
    const country = countryByName.get(product.countryOfOrigin);
    if (!country || country.status !== "ACTIVE") {
      return { error: `Negara asal tidak ditemukan untuk produk "${product.productName}".` };
    }
    const quantity = Number(product.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `Jumlah pada produk "${product.productName}" harus lebih besar dari 0.` };
    }
    const averageUnitPrice = Number(product.averageUnitPrice);
    if (!Number.isFinite(averageUnitPrice) || averageUnitPrice < 0) {
      return { error: `Harga satuan rata-rata pada produk "${product.productName}" tidak valid.` };
    }

    const industryName = industryNameByGroupKey.get(`${product.brandId}|${product.commodityGroupId}`) ?? "";
    const totalPrice = (quantity * averageUnitPrice).toFixed(2);
    resolved.push({
      ...product,
      industryName,
      commodityName: commodityGroup.name,
      hsDescription: hsRow.description,
      unit: hsRow.unitOfMeasurement?.symbol ?? hsRow.unitOfMeasurement?.name ?? product.unit ?? "",
      countryOfOriginCode: country.code,
      productSnapshot: {
        capturedAt,
        brandName: brandNameById.get(product.brandId) ?? "",
        industryName,
        commodityName: commodityGroup.name,
        hsDescription: hsRow.description,
        countryOfOriginName: country.name,
        totalPrice,
      },
    });
  }

  return { ok: true, products: resolved };
}

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
  if (values.verificationType !== "VIU") {
    return { ok: true, applicationBrands: values.applicationBrands, konsumsiProducts: values.konsumsiProducts };
  }
  if (!values.importTypes.includes("BARANG_KONSUMSI")) {
    return { ok: true, applicationBrands: values.applicationBrands, konsumsiProducts: values.konsumsiProducts };
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
    // Merk.companyId/brandOwnerId/ownership.ownerCompanyId are deliberately free-standing — brand
    // ownership in Merk Management is free text, not a Company FK, and the applicant's
    // relationship to a brand is established per-application via `entry.applicantRole` +
    // `getVIUConsumptionBrandRequirements` below, never by matching Merk.companyId to
    // Application.companyId. A brand with no owning company at all is a normal, valid case
    // (e.g. applicantRole OWNER with ownership recorded as free text), not a reason to reject.
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

  // Step "Product Information" — see validateKonsumsiProducts above. Reuses brandById (already
  // DB-validated above) instead of a second brand lookup.
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.brandName]));
  const productsResult = await validateKonsumsiProducts(
    values.brandQualityTests,
    values.konsumsiProducts,
    new Set(brandIds),
    brandNameById,
  );
  if ("error" in productsResult) {
    return { error: productsResult.error };
  }

  return { ok: true, applicationBrands: snapshotBrands, konsumsiProducts: productsResult.products };
}
