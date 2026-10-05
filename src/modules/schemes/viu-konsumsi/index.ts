import type { SchemeDefinition } from "../types";
import { VIU_KONSUMSI_DOCUMENTS } from "./documents";
import { VIU_KONSUMSI_NARRATIVE } from "./narrative";
import { VIU_KONSUMSI_REPORT_SECTIONS } from "./report-sections";
import { VIU_KONSUMSI_TERMS } from "./terms";

export const VIU_KONSUMSI_SCHEME: SchemeDefinition = {
  terms: VIU_KONSUMSI_TERMS,
  documents: VIU_KONSUMSI_DOCUMENTS,
  narrative: VIU_KONSUMSI_NARRATIVE,
  reportSections: VIU_KONSUMSI_REPORT_SECTIONS,
};
