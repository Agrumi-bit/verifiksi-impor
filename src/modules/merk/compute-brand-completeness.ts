import { getRequiredBrandDocuments, isRequirementComplete } from "./document-requirements";

/** Minimal shape this needs from a `MerkOwnership` row — DB enum members
 * (uppercase), lower-cased below to feed `getRequiredBrandDocuments` (which
 * expects the wizard's own lowercase snake_case values). */
type OwnershipLike = {
  ownerLocation: string;
  relationshipWithApiu: string | null;
  representationType: string | null;
  appointmentSource: string | null;
  agreementType: string | null;
} | null;

type DocumentLike = { documentType: string; filePath: string };

export type BrandCompletenessInput = {
  /** `Merk.certificateType` — already the same casing as `MERK_EVIDENCE_TYPES`. */
  certificateType: string | null;
  ownership: OwnershipLike;
  documents: DocumentLike[];
};

export type BrandCompleteness = {
  requiredCount: number;
  completeCount: number;
  missingCount: number;
  percent: number;
  missingLabels: string[];
};

function lower(value: string | null | undefined): string | undefined {
  return value ? value.toLowerCase() : undefined;
}

/** Server-side counterpart to Step 3/4's client-side completeness UI — same
 * two functions (`getRequiredBrandDocuments`/`isRequirementComplete`), fed
 * from a Prisma row instead of `useWatch`. Used by the Admin/Company brand
 * lists, Monitoring, and Drafts pages so "Kelengkapan" never disagrees with
 * what the wizard itself considers complete. */
export function computeBrandCompleteness(input: BrandCompletenessInput): BrandCompleteness {
  const requirements = getRequiredBrandDocuments({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- see document-requirements.ts's own enum-casing note
    evidenceType: input.certificateType as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ownerLocation: lower(input.ownership?.ownerLocation) as any,
    relationshipWithApiu: lower(input.ownership?.relationshipWithApiu),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    representationType: lower(input.ownership?.representationType) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appointmentSource: lower(input.ownership?.appointmentSource) as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    agreementType: lower(input.ownership?.agreementType) as any,
  });

  const documentsByCode: Record<string, DocumentLike> = {};
  const productLabelDocumentation: DocumentLike[] = [];
  for (const doc of input.documents) {
    if (doc.documentType === "product_label_documentation") productLabelDocumentation.push(doc);
    else documentsByCode[doc.documentType] = doc;
  }

  const required = requirements.filter((r) => r.required);
  const missing = required.filter((r) => !isRequirementComplete(r, documentsByCode, productLabelDocumentation));
  const completeCount = required.length - missing.length;
  const percent = required.length === 0 ? 100 : Math.round((completeCount / required.length) * 100);

  return {
    requiredCount: required.length,
    completeCount,
    missingCount: missing.length,
    percent,
    missingLabels: missing.map((r) => r.label),
  };
}
