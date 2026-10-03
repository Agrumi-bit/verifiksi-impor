import type { ApplicationWizardValues } from "../../schema";

/** Field lists for the two steps Konsumsi contributes — composed into the
 * shared `VIU_STEP_FIELD_NAMES` in ../../schema.ts. Keyed by the same
 * `WizardStepMeta.key` values `konsumsi/steps.ts` declares. */
export const KONSUMSI_STEP_FIELD_NAMES: Record<string, (keyof ApplicationWizardValues)[]> = {
  "brands-used": ["applicationBrands"],
  "quality-test": ["labelStatementDocument", "labelDocumentationDocument"],
};
