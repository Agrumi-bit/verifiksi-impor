import { getRequiredBrandDocuments } from "./document-requirements";
import { MERK_TRADEMARK_CLASSES } from "./schema";
import type {
  BrandDocumentEntryValues,
  MerkDraftValues,
  MerkOwnershipType,
  MerkWizardValues,
  QualityTestEntryValues,
} from "./schema";

function trademarkClassLabel(classCode: string): string {
  return MERK_TRADEMARK_CLASSES.find((c) => c.value === classCode)?.hint ?? classCode;
}

function toDate(value: string | undefined): Date | null {
  return value ? new Date(value) : null;
}

/** Legacy bridge — Merk.ownershipType/brandOwnerName predate MerkOwnership and
 * are still NOT NULL, so every create path derives them from the new Step 2
 * shape instead. `ownerCompanyName` is accepted (and ignored) only so its two
 * callers — which still get it from `resolveOwnershipReferences`, threaded in
 * from `buildMerkCreateData`/`buildMerkDraftData` — don't need their own
 * signatures to change: Nama Perusahaan/Pemilik Merek is manual free text for
 * every scenario now, domestic company included, so `ownerName` alone is
 * always the source. */
function legacyOwnershipBridge(
  values: Pick<
    MerkWizardValues,
    "ownerLocation" | "ownerType" | "ownerName" | "relationshipWithApiu"
  >,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ownerCompanyName: string | null,
): { ownershipType: MerkOwnershipType; brandOwnerName: string } {
  const ownershipType: MerkOwnershipType =
    values.ownerLocation === "domestic" && values.relationshipWithApiu === "apiu_is_owner"
      ? "MILIK_SENDIRI"
      : "LISENSI";

  const brandOwnerName = values.ownerName || "Belum ditentukan";

  return { ownershipType, brandOwnerName };
}

/** Step 2's MerkOwnership nested-create payload — only the fields the
 * selected scenario actually uses are non-null; see validateOwnershipStep in
 * schema.ts for which combinations are reachable. */
function buildOwnershipData(values: {
  ownerLocation?: string;
  ownerType?: string;
  ownerCompanyId?: string;
  ownerName?: string;
  ownerAddress?: string;
  relationshipWithApiu?: string;
  foreignEntityType?: string;
  ownerCountryCode?: string;
  foreignRegistrationNumber?: string;
  representationType?: string;
  officialRepresentativeCompanyId?: string;
  agreementType?: string;
  agreementNumber?: string;
  agreementStartDate?: string;
  agreementEndDate?: string;
  appointmentSource?: string;
  appointmentLetterNumber?: string;
  appointmentStartDate?: string;
  appointmentEndDate?: string;
}) {
  if (!values.ownerLocation) return undefined;
  return {
    create: {
      ownerLocation: values.ownerLocation.toUpperCase(),
      ownerType: values.ownerType?.toUpperCase() ?? null,
      ownerCompanyId: values.ownerCompanyId || null,
      ownerName: values.ownerName || null,
      ownerAddress: values.ownerAddress || null,
      relationshipWithApiu: values.relationshipWithApiu?.toUpperCase() ?? null,
      foreignEntityType: values.foreignEntityType?.toUpperCase() ?? null,
      ownerCountryCode: values.ownerCountryCode || null,
      foreignRegistrationNumber: values.foreignRegistrationNumber || null,
      representationType: values.representationType?.toUpperCase() ?? null,
      officialRepresentativeId: values.officialRepresentativeCompanyId || null,
      agreementType: values.agreementType?.toUpperCase() ?? null,
      agreementNumber: values.agreementNumber || null,
      agreementStartDate: toDate(values.agreementStartDate),
      agreementEndDate: toDate(values.agreementEndDate),
      appointmentSource: values.appointmentSource?.toUpperCase() ?? null,
      appointmentLetterNumber: values.appointmentLetterNumber || null,
      appointmentStartDate: toDate(values.appointmentStartDate),
      appointmentEndDate: toDate(values.appointmentEndDate),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
  };
}

type DocumentsInput = {
  evidenceType?: MerkWizardValues["evidenceType"];
  ownerLocation?: string;
  relationshipWithApiu?: string;
  representationType?: string;
  appointmentSource?: string;
  agreementType?: string;
  documents?: Record<string, BrandDocumentEntryValues>;
  productLabelDocumentation?: BrandDocumentEntryValues[];
};

/** Step 3's BrandDocument nested-create payload. `category` for each slot
 * comes from the same requirement engine that decided the slot was required
 * in the first place, so a document's stored category always matches the
 * grouping it was uploaded under. */
function buildDocumentsData(values: DocumentsInput) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const categoryByCode = new Map(getRequiredBrandDocuments(values as any).map((r) => [r.code, r.category]));
  const rows: {
    documentType: string;
    category: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    documentNumber: string | null;
    issueDate: Date | null;
    expiryDate: Date | null;
  }[] = [];

  for (const [code, entry] of Object.entries(values.documents ?? {})) {
    rows.push({
      documentType: code,
      category: categoryByCode.get(code) ?? "product_compliance",
      filePath: entry.filePath,
      fileName: entry.fileName,
      fileSize: entry.fileSize,
      documentNumber: entry.documentNumber || null,
      issueDate: toDate(entry.issueDate),
      expiryDate: toDate(entry.expiryDate),
    });
  }
  for (const entry of values.productLabelDocumentation ?? []) {
    rows.push({
      documentType: "product_label_documentation",
      category: "product_compliance",
      filePath: entry.filePath,
      fileName: entry.fileName,
      fileSize: entry.fileSize,
      documentNumber: entry.documentNumber || null,
      issueDate: toDate(entry.issueDate),
      expiryDate: toDate(entry.expiryDate),
    });
  }

  return rows.length > 0 ? { create: rows } : undefined;
}

function buildQualityTestsData(qualityTests: QualityTestEntryValues[] | undefined) {
  if (!qualityTests || qualityTests.length === 0) return undefined;
  return {
    create: qualityTests.map((qt) => ({
      commodityGroupId: qt.commodityGroupId,
      commoditySubGroupId: qt.commoditySubGroupId || null,
      certificateNumber: qt.certificateNumber,
      laboratoryName: qt.laboratoryName,
      issueDate: new Date(qt.issueDate),
      expiryDate: toDate(qt.expiryDate),
      filePath: qt.filePath,
      fileName: qt.fileName,
    })),
  };
}

export function buildMerkCreateData(values: MerkWizardValues, ownerCompanyName: string | null) {
  const { ownershipType, brandOwnerName } = legacyOwnershipBridge(values, ownerCompanyName);

  return {
    brandName: values.brandName,
    // Legacy free-text column, no longer collected directly — bridged from
    // the trademark class so existing readers of `productCategory` still see
    // something meaningful instead of null.
    productCategory: trademarkClassLabel(values.trademarkClass),
    countryOfOrigin: values.countryOfOrigin,

    hasCertificate: true,
    certificateType: values.evidenceType,
    registrationNumber: values.registrationNumber,
    registrationDate: toDate(values.registrationDate),
    // Legacy single-document bridge — Step 3 now stores every document as its
    // own BrandDocument row; this mirrors the trademark evidence file so old
    // readers of this column still see something.
    registrationDocumentPath: values.documents.trademark_evidence?.filePath ?? null,
    trademarkClass: values.trademarkClass,
    merekStatusLabel: values.merekStatusLabel || null,
    logoPath: values.logoPath || null,

    // Legacy bridge — brandOwnerId only ever pointed at a BrandOwner row, so
    // it's only set for the domestic+company scenario (same table Step 2's
    // company selectors search).
    brandOwnerId: values.ownerLocation === "domestic" && values.ownerType === "company"
      ? values.ownerCompanyId
      : null,
    ownershipType,
    brandOwnerName,

    ownership: buildOwnershipData(values),
    documents: buildDocumentsData(values),
    qualityTests: buildQualityTestsData(values.qualityTests),

    declarationAcceptedAt: new Date(),
  };
}

/** "Simpan Draft" — best-effort mapping of whatever the user has filled in so
 * far. DB columns that are NOT NULL with no default (ownershipType,
 * brandOwnerName, productCategory) get placeholder values; the wizard
 * schema's own validation is what keeps a *final* submission complete. */
export function buildMerkDraftData(values: MerkDraftValues, ownerCompanyName: string | null) {
  const { ownershipType, brandOwnerName } = legacyOwnershipBridge(
    {
      ownerLocation: values.ownerLocation ?? "domestic",
      ownerType: values.ownerType,
      ownerName: values.ownerName,
      relationshipWithApiu: values.relationshipWithApiu,
    },
    ownerCompanyName,
  );

  return {
    brandName: values.brandName,
    productCategory: values.trademarkClass ? trademarkClassLabel(values.trademarkClass) : "Belum ditentukan",
    countryOfOrigin: values.countryOfOrigin || "Belum ditentukan",

    hasCertificate: true,
    certificateType: values.evidenceType,
    registrationNumber: values.registrationNumber || null,
    registrationDate: toDate(values.registrationDate),
    registrationDocumentPath: values.documents?.trademark_evidence?.filePath ?? null,
    trademarkClass: values.trademarkClass || null,
    merekStatusLabel: values.merekStatusLabel || null,
    logoPath: values.logoPath || null,

    brandOwnerId:
      values.ownerLocation === "domestic" && values.ownerType === "company"
        ? values.ownerCompanyId || null
        : null,
    ownershipType,
    brandOwnerName,

    ownership: buildOwnershipData(values),
    documents: buildDocumentsData(values),
    qualityTests: buildQualityTestsData(values.qualityTests),

    status: "DRAFT" as const,
  };
}

/** Turns a one-shot `create` payload's nested relation shape into a
 * full-replace `update` shape: the 1:1 `ownership` becomes an upsert (a
 * resumed Draft may not have one yet), and the 1:many `documents`/
 * `qualityTests` are wiped and recreated from the submitted form state so a
 * removed row (e.g. user deleted a document while editing) actually
 * disappears instead of lingering next to the new rows. */
// `any` here mirrors buildOwnershipData's own `as any` cast just above (the
// wizard's lowercase enum strings only satisfy Prisma's uppercase enum input
// types after `.toUpperCase()`, which TS can't verify statically) — without
// it, Prisma's checked/unchecked update-input union fails to resolve for the
// unrelated reason of `ownership.create`'s shape, not anything wrong with
// the data itself.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toUpdateRelations(created: any) {
  const { ownership, documents, qualityTests, ...rest } = created;
  return {
    ...rest,
    ownership: ownership ? { upsert: { create: ownership.create, update: ownership.create } } : undefined,
    documents: { deleteMany: {}, ...(documents ? { create: documents.create } : {}) },
    qualityTests: { deleteMany: {}, ...(qualityTests ? { create: qualityTests.create } : {}) },
  };
}

/** Finalizes a resumed Draft (or edits an already-Active brand) via the full
 * wizard schema — used by `PATCH /api/merk/[id]` when the request body is a
 * complete wizard payload rather than the simple `{status}` toggle. Moves
 * the record to ACTIVE and refreshes `declarationAcceptedAt` to when the
 * user actually re-confirmed the declaration, not when the row was first
 * created. See BR-001/BR-002 in the Add Brand review. */
export function buildMerkUpdateData(values: MerkWizardValues, ownerCompanyName: string | null) {
  return {
    ...toUpdateRelations(buildMerkCreateData(values, ownerCompanyName)),
    status: "ACTIVE" as const,
  };
}

/** Re-saves a resumed Draft as a Draft — same "wipe and recreate" nested
 * relations as buildMerkUpdateData, but keeps `status: "DRAFT"` (already set
 * by buildMerkDraftData) and skips full validation upstream. */
export function buildMerkUpdateDraftData(values: MerkDraftValues, ownerCompanyName: string | null) {
  return toUpdateRelations(buildMerkDraftData(values, ownerCompanyName));
}
