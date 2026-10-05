import type { SchemeNarrative } from "../types";

/**
 * Report narrative for this scheme ONLY. Filled in Tahap 5 — until then every section/document
 * resolves to the "[BELUM DIATUR untuk …]" marker and report finalization stays blocked
 * (see resolvers.ts). Never copy another scheme's text here.
 */
export const VKI_NARRATIVE: SchemeNarrative = {
  foreword: "",
  conclusion: "",
  sections: {},
  documents: {},
};
