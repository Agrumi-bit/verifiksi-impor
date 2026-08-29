import type { ChecklistCompanyContext } from "./schema";

/** Narrows a raw `db.company.findUnique()` result into the shape `buildDocumentChecklist` needs. */
export function toChecklistCompanyContext(
  company: {
    companyAge: string | null;
    nibDocumentPath: string | null;
    kbliDocumentPath: string | null;
    notarialDocumentPath: string | null;
    notarialAmendmentDocPath: string | null;
    skDocumentPath: string | null;
    npwpDocumentPath: string | null;
    sktDocumentPath: string | null;
    taxProofs: unknown;
  } | null,
): ChecklistCompanyContext | null {
  if (!company) return null;
  return {
    companyAge: company.companyAge === "OVER_3" || company.companyAge === "UNDER_3" ? company.companyAge : null,
    nibDocumentPath: company.nibDocumentPath,
    kbliDocumentPath: company.kbliDocumentPath,
    notarialDocumentPath: company.notarialDocumentPath,
    notarialAmendmentDocPath: company.notarialAmendmentDocPath,
    skDocumentPath: company.skDocumentPath,
    npwpDocumentPath: company.npwpDocumentPath,
    sktDocumentPath: company.sktDocumentPath,
    taxProofs: company.taxProofs as ChecklistCompanyContext["taxProofs"],
  };
}
