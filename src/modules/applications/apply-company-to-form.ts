import type { UseFormSetValue } from "react-hook-form";

import type { KbliEntryValues, LocationValues } from "@/modules/shared/schema";
import type { CompanyAge, TaxProofEntryValues } from "@/modules/company/schema";
import type { ApplicationWizardValues } from "./schema";

export type CompanyOption = {
  id: string;
  companyName: string;
  apiType: string | null;
  companyType: string;
  investmentStatus: string;
  companyEmail: string;
  companyPhone: string;
  companyWebsite: string | null;
  contactFullName: string;
  contactDesignation: string;
  contactEmail: string;
  contactPhone: string;
  nibNumber: string;
  nibIssueDate: string;
  nibDocumentPath: string;
  kbliEntries: KbliEntryValues[];
  kbliDocumentPath: string;
  notarialDeedNumber: string;
  notarialDeedIssueDate: string;
  notarialIssuingAuthority: string;
  notarialAmendmentInfo: string | null;
  notarialDocumentPath: string;
  notarialAmendmentNumber: string | null;
  notarialAmendmentDate: string | null;
  notarialAmendmentAuthority: string | null;
  notarialAmendmentDocPath: string | null;
  skNumber: string | null;
  skDate: string | null;
  skDocumentPath: string | null;
  npwpNumber: string | null;
  npwpDocumentPath: string | null;
  companyAge: CompanyAge | null;
  taxProofs: TaxProofEntryValues[];
  sktNumber: string | null;
  sktIssuer: string | null;
  sktDate: string | null;
  sktDocumentPath: string | null;
  locations: LocationValues[];
};

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : "";
}

/**
 * Populates every wizard field derived from a Company record — used both by
 * the admin's manual CompanyPickerField and the company-workspace's
 * auto-locked entry point, so the two never drift out of sync.
 */
export function applyCompanyToForm(setValue: UseFormSetValue<ApplicationWizardValues>, company: CompanyOption): void {
  setValue("companyId", company.id, { shouldValidate: true });
  setValue("companyApiType", company.apiType ?? "", { shouldValidate: true });
  setValue("companyName", company.companyName, { shouldValidate: true });
  setValue("companyType", company.companyType, { shouldValidate: true });
  setValue("investmentStatus", company.investmentStatus as ApplicationWizardValues["investmentStatus"], {
    shouldValidate: true,
  });
  setValue("companyEmail", company.companyEmail, { shouldValidate: true });
  setValue("companyPhone", company.companyPhone, { shouldValidate: true });
  setValue("companyWebsite", company.companyWebsite ?? "", { shouldValidate: true });
  setValue("contactFullName", company.contactFullName, { shouldValidate: true });
  setValue("contactDesignation", company.contactDesignation, { shouldValidate: true });
  setValue("contactEmail", company.contactEmail, { shouldValidate: true });
  setValue("contactPhone", company.contactPhone, { shouldValidate: true });

  // Legal/Tax/Location — pulled from the company record so the VKI wizard's
  // read-only steps (3-5) have data without re-collecting it. Also keeps the
  // long-standing VIU/legacy payload fields (nibNumber, locations, kbliEntries...)
  // populated, since surveyor/verifikator/report code reads them directly.
  setValue("nibNumber", company.nibNumber, { shouldValidate: true });
  setValue("nibIssueDate", toDateInputValue(company.nibIssueDate), { shouldValidate: true });
  setValue("nibDocumentPath", company.nibDocumentPath, { shouldValidate: true });
  setValue("kbliEntries", company.kbliEntries, { shouldValidate: true });
  setValue("kbliDocumentPath", company.kbliDocumentPath, { shouldValidate: true });
  setValue("notarialDeedNumber", company.notarialDeedNumber, { shouldValidate: true });
  setValue("notarialDeedIssueDate", toDateInputValue(company.notarialDeedIssueDate), { shouldValidate: true });
  setValue("notarialIssuingAuthority", company.notarialIssuingAuthority, { shouldValidate: true });
  setValue("notarialAmendmentInfo", company.notarialAmendmentInfo ?? "");
  setValue("notarialDocumentPath", company.notarialDocumentPath, { shouldValidate: true });
  setValue("notarialAmendmentNumber", company.notarialAmendmentNumber ?? "");
  setValue("notarialAmendmentDate", toDateInputValue(company.notarialAmendmentDate));
  setValue("notarialAmendmentAuthority", company.notarialAmendmentAuthority ?? "");
  setValue("notarialAmendmentDocPath", company.notarialAmendmentDocPath ?? "");
  setValue("skNumber", company.skNumber ?? "");
  setValue("skDate", toDateInputValue(company.skDate));
  setValue("skDocumentPath", company.skDocumentPath ?? "");
  setValue("npwpNumber", company.npwpNumber ?? "");
  setValue("npwpDocumentPath", company.npwpDocumentPath ?? "");
  setValue("companyAge", company.companyAge);
  setValue("taxProofs", company.taxProofs);
  setValue("sktNumber", company.sktNumber ?? "");
  setValue("sktIssuer", company.sktIssuer ?? "");
  setValue("sktDate", toDateInputValue(company.sktDate));
  setValue("sktDocumentPath", company.sktDocumentPath ?? "");
  setValue("locations", company.locations, { shouldValidate: true });
}
