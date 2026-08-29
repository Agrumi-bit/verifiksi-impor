import type { ChecklistCompanyContext } from "./schema";

/**
 * Live Company fields for every checklist item (`document-checklist-items.ts`) and report
 * narrative (`report-narrative.ts`) whose comparison value can be edited after the application
 * was submitted, via Company Workspace's profile editor ("Legal" and "Tax" sections). Consumed
 * client-side (JSON from a `NextResponse.json()` response — Date columns arrive as ISO strings),
 * unlike `ChecklistCompanyContext` above (server-side, `buildDocumentChecklist`'s own doc-path
 * resolution). `payload.Xxx` is a snapshot frozen at submission time; once the company edits and
 * re-uploads, only the `Company` row changes, so both consumers must prefer this live value over
 * the frozen one or a verifikator reviewing (or a generated report printed) after the edit shows
 * stale data next to a document that no longer matches it.
 */
export type CompanyLegalContext = {
  nibNumber: string | null;
  nibIssueDate: string | null;
  nibDocumentPath: string | null;
  notarialDeedNumber: string | null;
  notarialDeedIssueDate: string | null;
  notarialIssuingAuthority: string | null;
  notarialDocumentPath: string | null;
  notarialAmendmentNumber: string | null;
  notarialAmendmentDate: string | null;
  notarialAmendmentAuthority: string | null;
  notarialAmendmentDocPath: string | null;
  skNumber: string | null;
  skDate: string | null;
  skDocumentPath: string | null;
  npwpNumber: string | null;
  npwpIssuer: string | null;
  npwpDocumentPath: string | null;
  sktNumber: string | null;
  sktIssuer: string | null;
  sktDate: string | null;
  sktDocumentPath: string | null;
} | null;

/** Narrows + JSON-shapes a raw `db.company.findUnique()` result into `CompanyLegalContext`, for API routes to embed in a `NextResponse.json()` body. */
export function toCompanyLegalContext(
  company: {
    nibNumber: string;
    nibIssueDate: Date;
    nibDocumentPath: string;
    notarialDeedNumber: string;
    notarialDeedIssueDate: Date;
    notarialIssuingAuthority: string;
    notarialDocumentPath: string;
    notarialAmendmentNumber: string | null;
    notarialAmendmentDate: Date | null;
    notarialAmendmentAuthority: string | null;
    notarialAmendmentDocPath: string | null;
    skNumber: string | null;
    skDate: Date | null;
    skDocumentPath: string | null;
    npwpNumber: string | null;
    npwpIssuer: string | null;
    npwpDocumentPath: string | null;
    sktNumber: string | null;
    sktIssuer: string | null;
    sktDate: Date | null;
    sktDocumentPath: string | null;
  } | null,
): CompanyLegalContext {
  if (!company) return null;
  return {
    nibNumber: company.nibNumber,
    nibIssueDate: company.nibIssueDate.toISOString(),
    nibDocumentPath: company.nibDocumentPath,
    notarialDeedNumber: company.notarialDeedNumber,
    notarialDeedIssueDate: company.notarialDeedIssueDate.toISOString(),
    notarialIssuingAuthority: company.notarialIssuingAuthority,
    notarialDocumentPath: company.notarialDocumentPath,
    notarialAmendmentNumber: company.notarialAmendmentNumber,
    notarialAmendmentDate: company.notarialAmendmentDate ? company.notarialAmendmentDate.toISOString() : null,
    notarialAmendmentAuthority: company.notarialAmendmentAuthority,
    notarialAmendmentDocPath: company.notarialAmendmentDocPath,
    skNumber: company.skNumber,
    skDate: company.skDate ? company.skDate.toISOString() : null,
    skDocumentPath: company.skDocumentPath,
    npwpNumber: company.npwpNumber,
    npwpIssuer: company.npwpIssuer,
    npwpDocumentPath: company.npwpDocumentPath,
    sktNumber: company.sktNumber,
    sktIssuer: company.sktIssuer,
    sktDate: company.sktDate ? company.sktDate.toISOString() : null,
    sktDocumentPath: company.sktDocumentPath,
  };
}

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
