import type { SchemeDefinition } from "../types";
import { VIU_NON_INDUSTRI_DOCUMENTS } from "./documents";
import { VIU_NON_INDUSTRI_NARRATIVE } from "./narrative";
import { VIU_NON_INDUSTRI_REPORT_SECTIONS } from "./report-sections";
import { VIU_NON_INDUSTRI_TERMS } from "./terms";

export const VIU_NON_INDUSTRI_SCHEME: SchemeDefinition = {
  terms: VIU_NON_INDUSTRI_TERMS,
  documents: VIU_NON_INDUSTRI_DOCUMENTS,
  narrative: VIU_NON_INDUSTRI_NARRATIVE,
  reportSections: VIU_NON_INDUSTRI_REPORT_SECTIONS,
};
