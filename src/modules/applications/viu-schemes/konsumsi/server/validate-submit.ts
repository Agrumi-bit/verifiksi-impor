import { db } from "@/lib/db";
import type { MerkEvidenceType } from "@/modules/merk/schema";
import { getVIUConsumptionBrandRequirements } from "../business-rules";
import { deriveProductGroups, productGroupKey } from "../schema";
import type {
  ApplicationBrandEntryValues,
  ApplicationBrandSubmissionSnapshot,
  ApplicationKonsumsiProductValues,
  ProductGroupCertificateValues,
} from "../schema";
import type { ApplicationWizardValues } from "../../../schema";
import { certificateForGroup } from "../shared-certificates";

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

type ValidateKonsumsiSubmitInput = Pick<
  ApplicationWizardValues,
  | "verificationType"
  | "importTypes"
  | "applicationBrands"
  | "konsumsiProducts"
  | "productGroupCertificates"
  | "labelStatementDocument"
  | "labelDocumentationDocument"
>;

/** A refusal; `stepKey` + `messages` (when set) let the wizard show it in its validation panel
 * under the right step, one line per problem, instead of a bare toast. */
export type KonsumsiSubmitError = { error: string; stepKey?: string; messages?: string[] };

type ValidateKonsumsiSubmitResult =
  | KonsumsiSubmitError
  | {
      ok: true;
      applicationBrands: ApplicationBrandEntryValues[];
      konsumsiProducts: ApplicationKonsumsiProductValues[];
      productGroupCertificates: ProductGroupCertificateValues[];
    };

/**
 * Step "Product Information" — Konsumsi's own Merek > Sub Kelompok Komoditas > Produk structure.
 * The commodity grouping is derived bottom-up from each product's own `hsCodeId`, never trusted
 * from the client's cached names/ids — this re-resolves the entire chain
 * (commoditySubGroup/commodityGroup/industryGroup) from the HS Code master-data row itself.
 * `originCountries` is Konsumsi's own multi-select field, keyed by ISO code (not name — a
 * deliberate divergence from every other "negara asal" field in this app, which stay single-value
 * and name-keyed via useActiveCountries). Returns products with their display caches and a
 * server-built `productSnapshot` — never the client-submitted values for any of these.
 */
async function validateKonsumsiProducts(
  products: ApplicationKonsumsiProductValues[] | undefined,
  validBrandIds: Set<string>,
  brandNameById: Map<string, string>,
): Promise<{ error: string } | { ok: true; products: ApplicationKonsumsiProductValues[] }> {
  const list = products ?? [];
  if (list.length === 0) return { ok: true, products: list };

  for (const product of list) {
    if (!validBrandIds.has(product.brandId)) {
      return { error: `Merek pada produk "${product.productName}" tidak terdaftar dalam permohonan ini.` };
    }
    if (product.originCountries.length === 0) {
      return { error: `Pilih minimal satu negara asal untuk produk "${product.productName}".` };
    }
  }

  const hsCodeIds = [...new Set(list.map((p) => p.hsCodeId))];
  const countryCodes = [...new Set(list.flatMap((p) => p.originCountries))];

  const [hsCodeRows, countries] = await Promise.all([
    db.hsCodeMasterData.findMany({
      where: { id: { in: hsCodeIds } },
      include: { commodityGroup: { include: { industryGroup: true } }, commoditySubGroup: true, unitOfMeasurement: true },
    }),
    db.countryMasterData.findMany({ where: { code: { in: countryCodes } } }),
  ]);
  const hsCodeById = new Map(hsCodeRows.map((row) => [row.id, row]));
  const countryByCode = new Map(countries.map((country) => [country.code, country]));

  const capturedAt = new Date().toISOString();
  const resolved: ApplicationKonsumsiProductValues[] = [];

  for (const product of list) {
    const hsRow = hsCodeById.get(product.hsCodeId);
    if (!hsRow || hsRow.status !== "ACTIVE") {
      return { error: `HS Code pada produk "${product.productName}" tidak ditemukan atau tidak aktif.` };
    }
    if (hsRow.commodityGroup.status !== "ACTIVE") {
      return { error: `Kelompok Komoditas "${hsRow.commodityGroup.name}" untuk HS Code "${hsRow.hsCode}" pada produk "${product.productName}" tidak aktif.` };
    }
    if (hsRow.commoditySubGroup.status !== "ACTIVE") {
      return { error: `Sub Kelompok Komoditas "${hsRow.commoditySubGroup.name}" untuk HS Code "${hsRow.hsCode}" pada produk "${product.productName}" tidak aktif.` };
    }
    const resolvedCountries = product.originCountries.map((code) => countryByCode.get(code));
    const missingIndex = resolvedCountries.findIndex((country) => !country || country.status !== "ACTIVE");
    if (missingIndex !== -1) {
      return { error: `Negara asal "${product.originCountries[missingIndex]}" tidak ditemukan atau tidak aktif untuk produk "${product.productName}".` };
    }
    const countryNames = resolvedCountries.map((country) => country!.name);
    const quantity = Number(product.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `Jumlah pada produk "${product.productName}" harus lebih besar dari 0.` };
    }
    const averageUnitPrice = Number(product.averageUnitPrice);
    if (!Number.isFinite(averageUnitPrice) || averageUnitPrice < 0) {
      return { error: `Harga satuan rata-rata pada produk "${product.productName}" tidak valid.` };
    }

    const industryName = hsRow.commodityGroup.industryGroup?.name ?? "";
    const totalPrice = (quantity * averageUnitPrice).toFixed(2);
    resolved.push({
      ...product,
      hsCode: hsRow.hsCode,
      hsDescription: hsRow.description,
      unit: hsRow.unitOfMeasurement?.symbol ?? hsRow.unitOfMeasurement?.name ?? product.unit ?? "",
      commoditySubGroupId: hsRow.commoditySubGroupId,
      commoditySubGroupName: hsRow.commoditySubGroup.name,
      commodityGroupId: hsRow.commodityGroupId,
      commodityName: hsRow.commodityGroup.name,
      industryGroupId: hsRow.commodityGroup.industryGroupId ?? "",
      industryName,
      originCountryNames: countryNames,
      commodityGroupChangedFrom: undefined,
      productSnapshot: {
        capturedAt,
        brandName: brandNameById.get(product.brandId) ?? "",
        industryName,
        commodityName: hsRow.commodityGroup.name,
        hsDescription: hsRow.description,
        countryOfOriginNames: countryNames,
        totalPrice,
      },
    });
  }

  return { ok: true, products: resolved };
}

/**
 * Every (brandId, commodityGroupId) group with at least one Product needs exactly the Merek x Sub
 * Kelompok certificate-coverage rule the matrix in Step "Product Information" shows: at least one
 * `productGroupCertificates` entry of the same Brand, not expired. One certificate may be shared by
 * several groups of the same Brand (see shared-certificates.ts). Mirrors
 * `validateKonsumsiProducts`'s own "never trust the client" stance — a `qualityTestId` reference is
 * re-resolved from `BrandQualityTest` here, never passed through from the client's own cache.
 */
async function validateProductGroupCertificates(
  products: ApplicationKonsumsiProductValues[],
  certificates: ProductGroupCertificateValues[] | undefined,
  brandNameById: Map<string, string>,
): Promise<KonsumsiSubmitError | { ok: true; certificates: ProductGroupCertificateValues[] }> {
  // The SAME grouping the Step 9 matrix uses (deriveProductGroups/productGroupKey), applied to the
  // server-resolved products — a client whose products were regrouped by
  // resyncKonsumsiProductCommodities sees exactly these groups.
  const requiredGroups = new Map(
    deriveProductGroups(products).map((group) => [
      productGroupKey(group),
      { brandId: group.brandId, commodityGroupId: group.commodityGroupId, commodityName: group.commodityName ?? "" },
    ]),
  );
  if (requiredGroups.size === 0) return { ok: true, certificates: [] };
  // Certificates of groups that no longer have products (e.g. their products moved to another Sub
  // Kelompok) are dropped — never synced into Hasil Uji Mutu for a group nothing is imported in.
  const list = (certificates ?? []).filter((certificate) => requiredGroups.has(productGroupKey(certificate)));

  const referencedIds = [...new Set(list.map((c) => c.qualityTestId).filter((id): id is string => Boolean(id)))];
  const existingCertificates = referencedIds.length > 0
    ? await db.brandQualityTest.findMany({ where: { id: { in: referencedIds } } })
    : [];
  const existingById = new Map(existingCertificates.map((c) => [c.id, c]));

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Entries sharing one freshly uploaded certificate (same `certificateKey`) must belong to one
  // Brand and carry identical data — the first entry is authoritative for the rest.
  const sharedByKey = new Map<string, ProductGroupCertificateValues>();
  for (const certificate of list) {
    if (certificate.qualityTestId || !certificate.certificateKey) continue;
    const first = sharedByKey.get(certificate.certificateKey);
    if (!first) {
      sharedByKey.set(certificate.certificateKey, certificate);
    } else if (first.brandId !== certificate.brandId) {
      return {
        error: `Sertifikat "${first.certificateNumber}" milik merek "${brandNameById.get(first.brandId) ?? first.brandId}" tidak dapat dipakai untuk merek "${brandNameById.get(certificate.brandId) ?? certificate.brandId}".`,
      };
    }
  }

  const resolved: ProductGroupCertificateValues[] = [];
  for (const entry of list) {
    const shared = !entry.qualityTestId && entry.certificateKey ? sharedByKey.get(entry.certificateKey) : undefined;
    const certificate = shared ? certificateForGroup(shared, entry) : entry;
    if (certificate.qualityTestId) {
      const existing = existingById.get(certificate.qualityTestId);
      if (!existing) {
        return { error: `Sertifikat Hasil Uji Mutu yang dipilih untuk merek "${brandNameById.get(certificate.brandId) ?? certificate.brandId}" tidak ditemukan.` };
      }
      // Same Brand only — any of its Sub Kelompok: one certificate may cover several groups
      // (the sync adds this group to the row's coverage).
      if (existing.merkId !== certificate.brandId) {
        return {
          error: `Sertifikat "${existing.certificateNumber}" milik merek lain dan tidak dapat dipakai untuk merek "${brandNameById.get(certificate.brandId) ?? certificate.brandId}".`,
        };
      }
      if (existing.expiryDate && existing.expiryDate < today) {
        return { error: `Sertifikat "${existing.certificateNumber}" sudah kedaluwarsa dan tidak dapat digunakan.` };
      }
      resolved.push({
        ...certificate,
        commodityName: requiredGroups.get(productGroupKey(certificate))?.commodityName || certificate.commodityName,
        certificateNumber: existing.certificateNumber,
        laboratoryName: existing.laboratoryName,
        issueDate: existing.issueDate.toISOString(),
        validUntil: existing.expiryDate?.toISOString(),
        fileName: existing.fileName,
        filePath: existing.filePath,
      });
      continue;
    }

    if (!certificate.filePath) {
      return { error: `Unggah file sertifikat Hasil Uji Mutu untuk merek "${brandNameById.get(certificate.brandId) ?? certificate.brandId}".` };
    }
    if (certificate.validUntil) {
      const validUntil = new Date(certificate.validUntil);
      if (!Number.isNaN(validUntil.getTime()) && validUntil < today) {
        return { error: `Sertifikat "${certificate.certificateNumber}" sudah melewati tanggal berlaku (${certificate.validUntil}).` };
      }
    }
    resolved.push({
      ...certificate,
      commodityName: requiredGroups.get(productGroupKey(certificate))?.commodityName || certificate.commodityName,
    });
  }

  const coveredGroupKeys = new Set(resolved.map((c) => productGroupKey(c)));
  const missing = [...requiredGroups].filter(([key]) => !coveredGroupKeys.has(key)).map(([, group]) => group);
  if (missing.length > 0) {
    const messages = missing.map(
      (group) =>
        `${brandNameById.get(group.brandId) ?? group.brandId} × ${group.commodityName || group.commodityGroupId} belum ada sertifikat Hasil Uji Mutu`,
    );
    return {
      error: `Sertifikat Hasil Uji Mutu belum diunggah untuk ${missing.length} grup Merek × Sub Kelompok: ${messages.join("; ")}.`,
      stepKey: "product-info",
      messages,
    };
  }

  return { ok: true, certificates: resolved };
}

/**
 * Server-side enforcement for VIU Konsumsi's Step "Merek yang Digunakan" +
 * "Dokumen Label Produk" + "Product Information". Mirrors modules/merk/server-validation.ts's
 * pattern (a plain async function called after zod parse, not folded into the zod schema itself,
 * since it needs a DB read). Never trust the client's own computed readiness, document count, or
 * brand/commodity/certificate metadata: this re-validates Brand ownership/status, the 9-month
 * evidence rule, the relationship's structural validity, HS-Code-derived commodity grouping, and
 * per-group certificate coverage independently, exactly the same rules the client UI applies.
 *
 * On success, returns `applicationBrands`/`konsumsiProducts`/`productGroupCertificates` all
 * server-resolved — the caller (POST /api/applications) persists THESE returned values, never the
 * client-submitted ones, so every derived field stays server-authoritative.
 */
export async function validateKonsumsiSubmit(
  values: ValidateKonsumsiSubmitInput,
): Promise<ValidateKonsumsiSubmitResult> {
  // Merek yang Digunakan is a VIU Barang Konsumsi concept only — never VKI, regardless of
  // whatever `importTypes` a payload happens to carry (see the same guard on
  // applicationWizardSchema's superRefine for why stale importTypes can't be trusted alone).
  if (values.verificationType !== "VIU") {
    return { ok: true, applicationBrands: values.applicationBrands, konsumsiProducts: values.konsumsiProducts, productGroupCertificates: values.productGroupCertificates };
  }
  if (!values.importTypes.includes("BARANG_KONSUMSI")) {
    return { ok: true, applicationBrands: values.applicationBrands, konsumsiProducts: values.konsumsiProducts, productGroupCertificates: values.productGroupCertificates };
  }
  if (values.applicationBrands.length === 0) {
    return { error: "Pilih atau tambahkan minimal satu merek yang digunakan." };
  }
  // Step "Dokumen Label Produk" — mirrors applyKonsumsiSubmitRules' client-side check. Re-checked
  // here too since this server path is the actual submit gate (the client zod refinement alone is
  // not trustworthy — a crafted request could skip it).
  if (!values.labelStatementDocument?.filePath) {
    return { error: "Unggah Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia." };
  }
  if (!values.labelDocumentationDocument?.filePath) {
    return { error: "Unggah Dokumentasi Label Produk." };
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
      applicantRole: entry.applicantRole ?? null,
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

  // Step "Product Information" — see validateKonsumsiProducts above. Reuses brandById (already
  // DB-validated above) instead of a second brand lookup.
  const brandNameById = new Map(brands.map((brand) => [brand.id, brand.brandName]));
  const productsResult = await validateKonsumsiProducts(values.konsumsiProducts, new Set(brandIds), brandNameById);
  if ("error" in productsResult) {
    return { error: productsResult.error, stepKey: "product-info", messages: [productsResult.error] };
  }

  // Merek x Sub Kelompok certificate-coverage — see validateProductGroupCertificates above. Must
  // run against the server-resolved products (real commodityGroupId per product), not the
  // client-submitted ones.
  const certificatesResult = await validateProductGroupCertificates(productsResult.products, values.productGroupCertificates, brandNameById);
  if ("error" in certificatesResult) {
    return certificatesResult;
  }

  return {
    ok: true,
    applicationBrands: snapshotBrands,
    konsumsiProducts: productsResult.products,
    productGroupCertificates: certificatesResult.certificates,
  };
}
