import type { SchemeDefinition } from "../types";
import { VKI_DOCUMENTS } from "./documents";
import { VKI_NARRATIVE } from "./narrative";
import { VKI_REPORT_SECTIONS } from "./report-sections";
import { VKI_TERMS } from "./terms";

export const VKI_SCHEME: SchemeDefinition = {
  terms: VKI_TERMS,
  documents: VKI_DOCUMENTS,
  narrative: VKI_NARRATIVE,
  reportSections: VKI_REPORT_SECTIONS,
};
