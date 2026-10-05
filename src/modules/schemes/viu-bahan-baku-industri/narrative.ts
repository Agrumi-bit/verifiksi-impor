import type { SchemeNarrative } from "../types";

/**
 * Report narrative for this scheme ONLY. Filled in Tahap 4 — until then every section/document
 * resolves to the "[BELUM DIATUR untuk …]" marker and report finalization stays blocked
 * (see resolvers.ts). Never copy another scheme's text here.
 */
export const VIU_INDUSTRI_NARRATIVE: SchemeNarrative = {
  foreword: "",
  conclusion: "",
  sections: {},
  documents: {},
};
