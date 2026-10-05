import type { SchemeNarrative } from "../types";

/**
 * Report narrative for this scheme ONLY. Filled in Tahap 2 — until then every section/document
 * resolves to the "[BELUM DIATUR untuk …]" marker and report finalization stays blocked
 * (see resolvers.ts). Never copy another scheme's text here.
 */
export const VIU_KONSUMSI_NARRATIVE: SchemeNarrative = {
  foreword: "",
  conclusion: "",
  sections: {},
  documents: {},
};
