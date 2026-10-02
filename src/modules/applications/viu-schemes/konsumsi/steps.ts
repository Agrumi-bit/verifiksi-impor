import { BadgeCheck, FlaskConical } from "lucide-react";

import type { WizardStepMeta } from "../../wizard-steps-meta";

/**
 * VIU Konsumsi's own wizard step contributions — composed into
 * `VIU_WIZARD_STEPS` by `getViuWizardSteps` only when
 * `importTypes.includes("BARANG_KONSUMSI")`. `step` here is a placeholder;
 * the composer renumbers every step sequentially based on final position,
 * so only relative order within this array matters.
 */
export const KONSUMSI_STEPS: WizardStepMeta[] = [
  {
    key: "brands-used",
    step: 0,
    title: "Merek yang Digunakan",
    subtitle: "Impor barang konsumsi — hubungan hukum merek",
    icon: BadgeCheck,
    implemented: true,
  },
  {
    key: "quality-test",
    step: 0,
    title: "Dokumen Pendukung Merek",
    subtitle: "Impor barang konsumsi — uji mutu & label berbahasa Indonesia per merek",
    icon: FlaskConical,
    implemented: true,
  },
];
