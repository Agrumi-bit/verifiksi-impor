import type { ChecklistCompanyContext } from "./schema";

/** Narrows a raw `db.company.findUnique()` result into the shape `buildDocumentChecklist` needs. */
export function toChecklistCompanyContext(
  company: { companyAge: string | null; sktDocumentPath: string | null; taxProofs: unknown } | null,
): ChecklistCompanyContext | null {
  if (!company) return null;
  return {
    companyAge: company.companyAge === "OVER_3" || company.companyAge === "UNDER_3" ? company.companyAge : null,
    sktDocumentPath: company.sktDocumentPath,
    taxProofs: company.taxProofs as ChecklistCompanyContext["taxProofs"],
  };
}
