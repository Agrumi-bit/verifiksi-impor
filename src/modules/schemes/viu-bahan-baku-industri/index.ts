import type { SchemeDefinition } from "../types";
import { VIU_INDUSTRI_DOCUMENTS } from "./documents";
import { VIU_INDUSTRI_NARRATIVE } from "./narrative";
import { VIU_INDUSTRI_REPORT_SECTIONS } from "./report-sections";
import { VIU_INDUSTRI_TERMS } from "./terms";

export const VIU_INDUSTRI_SCHEME: SchemeDefinition = {
  terms: VIU_INDUSTRI_TERMS,
  documents: VIU_INDUSTRI_DOCUMENTS,
  narrative: VIU_INDUSTRI_NARRATIVE,
  reportSections: VIU_INDUSTRI_REPORT_SECTIONS,
};
