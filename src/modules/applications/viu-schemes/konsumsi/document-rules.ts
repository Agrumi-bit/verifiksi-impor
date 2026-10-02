import { getRequiredBrandDocuments, type BrandDocumentRequirement, type BrandDocumentRequirementInput } from "@/modules/merk/document-requirements";

/**
 * VIU Konsumsi's own view of "what documents does this brand relationship
 * need" — wraps Brand Master's generic requirement engine instead of
 * `business-rules.ts` calling it directly, so a future change to Brand
 * Master's own Add-Brand requirements can't silently redefine VIU Konsumsi's
 * regulatory requirements without this file's own review. Today this is a
 * pure passthrough; the seam exists for the day Konsumsi needs a requirement
 * Brand Master doesn't (or vice versa), which should be added here, not by
 * forking `getRequiredBrandDocuments` or branching inside it.
 */
export function getKonsumsiRelationshipDocuments(
  input: BrandDocumentRequirementInput,
): BrandDocumentRequirement[] {
  return getRequiredBrandDocuments(input);
}

export type { BrandDocumentRequirement, BrandDocumentRequirementInput };
