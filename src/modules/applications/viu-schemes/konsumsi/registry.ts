import { KONSUMSI_STEPS } from "./steps";
import { KONSUMSI_STEP_FIELD_NAMES } from "./step-field-names";
import { validateKonsumsiSubmit } from "./server/validate-submit";

/**
 * VIU Konsumsi's scheme contract — the one object shared application
 * infrastructure (currently just `POST /api/applications`) reaches into to
 * orchestrate this scheme, instead of importing Konsumsi-specific symbols
 * by name. Deliberately minimal: only properties with a real, immediate
 * consumer today. Industri/Non-Industri are NOT registered here yet (they
 * keep using their existing inline paths in schema.ts/wizard-steps-meta.ts)
 * — this registry exists to establish the pattern with Konsumsi first, not
 * as a generic plugin framework.
 */
export const konsumsiScheme = {
  key: "BARANG_KONSUMSI" as const,
  steps: KONSUMSI_STEPS,
  stepFieldNames: KONSUMSI_STEP_FIELD_NAMES,
  validateServerSide: validateKonsumsiSubmit,
};

export type KonsumsiScheme = typeof konsumsiScheme;
