import type { BrandDocumentEntryValues, MerkWizardValues, QualityTestEntryValues } from "./schema";

/** Shape returned by `GET /api/merk/[id]` and `GET
 * /api/company-workspace/brands/[id]` (DB enums uppercase, dates as ISO
 * strings once round-tripped through JSON) — only the fields this mapper
 * actually reads. */
export type MerkDetailForResume = {
  brandName: string;
  countryOfOrigin: string;
  certificateType: string | null;
  registrationNumber: string | null;
  registrationIssuer: string | null;
  registrationDate: string | null;
  // Legacy scalar bridge — kept here only as a fallback for rows somehow
  // missing trademarkClassEntries (see that field's own comment on the Merk
  // model); the array below is the actual source for resuming Step 1.
  trademarkClass: string | null;
  trademarkClassDescription: string | null;
  trademarkClassEntries: { trademarkClass: string; trademarkClassDescription: string }[];
  merekStatusLabel: string | null;
  logoPath: string | null;
  ownership: {
    ownerLocation: string;
    ownerType: string | null;
    ownerCompanyId: string | null;
    ownerName: string | null;
    ownerAddress: string | null;
    relationshipWithApiu: string | null;
    foreignEntityType: string | null;
    ownerCountryCode: string | null;
    foreignRegistrationNumber: string | null;
    representationType: string | null;
    officialRepresentativeId: string | null;
    agreementType: string | null;
    agreementNumber: string | null;
    agreementStartDate: string | null;
    agreementEndDate: string | null;
    appointmentSource: string | null;
    appointmentLetterNumber: string | null;
    appointmentStartDate: string | null;
    appointmentEndDate: string | null;
  } | null;
  documents: {
    documentType: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    documentNumber: string | null;
    issueDate: string | null;
    expiryDate: string | null;
  }[];
  qualityTests: {
    commodityGroupId: string;
    commodityGroup: { name: string };
    commoditySubGroupId: string | null;
    commoditySubGroup: { name: string } | null;
    certificateNumber: string;
    laboratoryName: string;
    issueDate: string;
    expiryDate: string | null;
    filePath: string;
    fileName: string;
  }[];
};

// DB enum members are the wizard's own lowercase snake_case values, just
// upper-cased (see buildOwnershipData's `.toUpperCase()`) — so the reverse
// is always a plain `.toLowerCase()`, no per-enum lookup table needed.
function lower<T extends string>(value: string | null | undefined): T | undefined {
  return value ? (value.toLowerCase() as T) : undefined;
}

function toDateInputValue(value: string | null | undefined): string | undefined {
  return value ? value.slice(0, 10) : undefined;
}

const SUPPORTED_EVIDENCE_TYPES = new Set(["SERTIFIKAT_MEREK_TERDAFTAR", "TANDA_DAFTAR_MEREK", "SERTIFIKAT_INTERNASIONAL"]);

/**
 * Reverses buildMerkCreateData/buildMerkDraftData — turns a Merk detail
 * response back into the wizard's own field shape so a saved Draft can be
 * reopened into MerkWizard and continued instead of being a dead-end record
 * (see BR-002 in the Add Brand review).
 *
 * `certificateType` values outside the 3 the current wizard offers (e.g. the
 * legacy `LAINNYA`) resolve to `undefined` — the user re-picks a supported
 * evidence type in Step 1 rather than the wizard silently mis-rendering an
 * option it doesn't have a card for.
 */
export function mapMerkDetailToWizardValues(detail: MerkDetailForResume): Partial<MerkWizardValues> {
  const documents: Record<string, BrandDocumentEntryValues> = {};
  const productLabelDocumentation: BrandDocumentEntryValues[] = [];

  for (const doc of detail.documents) {
    const entry: BrandDocumentEntryValues = {
      filePath: doc.filePath,
      fileName: doc.fileName,
      fileSize: doc.fileSize,
      documentNumber: doc.documentNumber ?? undefined,
      issueDate: toDateInputValue(doc.issueDate),
      expiryDate: toDateInputValue(doc.expiryDate),
    };
    if (doc.documentType === "product_label_documentation") {
      productLabelDocumentation.push(entry);
    } else {
      documents[doc.documentType] = entry;
    }
  }

  const qualityTests: QualityTestEntryValues[] = detail.qualityTests.map((qt) => ({
    commodityGroupId: qt.commodityGroupId,
    commodityName: qt.commodityGroup.name,
    commoditySubGroupId: qt.commoditySubGroupId ?? undefined,
    commoditySubGroupName: qt.commoditySubGroup?.name ?? undefined,
    certificateNumber: qt.certificateNumber,
    laboratoryName: qt.laboratoryName,
    issueDate: toDateInputValue(qt.issueDate) ?? "",
    expiryDate: toDateInputValue(qt.expiryDate),
    filePath: qt.filePath,
    fileName: qt.fileName,
  }));

  const evidenceType =
    detail.certificateType && SUPPORTED_EVIDENCE_TYPES.has(detail.certificateType)
      ? (detail.certificateType as MerkWizardValues["evidenceType"])
      : undefined;

  const ownership = detail.ownership;

  // Resume the full multi-class list; fall back to synthesizing one entry
  // from the legacy scalar columns for the rare row that somehow has a
  // class but no trademarkClassEntries row (shouldn't happen after the
  // backfill migration, but resuming shouldn't silently drop data either
  // way).
  const trademarkClasses =
    detail.trademarkClassEntries.length > 0
      ? detail.trademarkClassEntries.map((entry) => ({
          trademarkClass: entry.trademarkClass,
          trademarkClassDescription: entry.trademarkClassDescription,
        }))
      : detail.trademarkClass
        ? [{ trademarkClass: detail.trademarkClass, trademarkClassDescription: detail.trademarkClassDescription ?? "" }]
        : [];

  return {
    brandName: detail.brandName,
    countryOfOrigin: detail.countryOfOrigin,
    evidenceType,
    registrationNumber: detail.registrationNumber ?? "",
    registrationIssuer: detail.registrationIssuer ?? "",
    registrationDate: toDateInputValue(detail.registrationDate) ?? "",
    trademarkClasses,
    merekStatusLabel: detail.merekStatusLabel ?? "",
    logoPath: detail.logoPath ?? "",

    ownerLocation: lower(ownership?.ownerLocation),
    ownerType: lower(ownership?.ownerType),
    ownerCompanyId: ownership?.ownerCompanyId ?? undefined,
    ownerName: ownership?.ownerName ?? undefined,
    ownerAddress: ownership?.ownerAddress ?? undefined,
    relationshipWithApiu: lower(ownership?.relationshipWithApiu),
    foreignEntityType: lower(ownership?.foreignEntityType),
    ownerCountryCode: ownership?.ownerCountryCode ?? undefined,
    foreignRegistrationNumber: ownership?.foreignRegistrationNumber ?? undefined,
    representationType: lower(ownership?.representationType),
    officialRepresentativeCompanyId: ownership?.officialRepresentativeId ?? undefined,
    agreementType: lower(ownership?.agreementType),
    agreementNumber: ownership?.agreementNumber ?? undefined,
    agreementStartDate: toDateInputValue(ownership?.agreementStartDate),
    agreementEndDate: toDateInputValue(ownership?.agreementEndDate),
    appointmentSource: lower(ownership?.appointmentSource),
    appointmentLetterNumber: ownership?.appointmentLetterNumber ?? undefined,
    appointmentStartDate: toDateInputValue(ownership?.appointmentStartDate),
    appointmentEndDate: toDateInputValue(ownership?.appointmentEndDate),

    documents,
    productLabelDocumentation,
    qualityTests,
    // Re-declared every time a Draft is reopened — resuming a draft must
    // never carry a previously-checked declaration forward (Step 5 spec:
    // the declaration always starts unchecked).
    declarationAccepted: false,
  };
}
