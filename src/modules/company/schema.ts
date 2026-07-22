import { z } from "zod";
import {
  companyProfileSchema,
  legalInformationSchema,
  locationsSchema,
} from "@/modules/shared/schema";

export const companyWizardSchema = companyProfileSchema
  .extend(legalInformationSchema.shape)
  .extend(locationsSchema.shape);

export type CompanyWizardValues = z.infer<typeof companyWizardSchema>;

export const COMPANY_STEP_FIELD_NAMES: Record<
  number,
  (keyof CompanyWizardValues)[]
> = {
  1: [
    "companyName",
    "companyType",
    "investmentStatus",
    "companyEmail",
    "companyPhone",
    "companyWebsite",
    "contactFullName",
    "contactDesignation",
    "contactEmail",
    "contactPhone",
  ],
  2: [
    "nibNumber",
    "nibIssueDate",
    "nibDocumentPath",
    "kbliEntries",
    "kbliDocumentPath",
    "notarialDeedNumber",
    "notarialDeedIssueDate",
    "notarialIssuingAuthority",
    "notarialAmendmentInfo",
    "notarialDocumentPath",
  ],
  3: ["locations"],
  4: [],
};
