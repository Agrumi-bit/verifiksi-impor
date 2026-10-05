import type { SchemeDefinition, SchemeId } from "./types";
import { VIU_INDUSTRI_SCHEME } from "./viu-bahan-baku-industri";
import { VIU_NON_INDUSTRI_SCHEME } from "./viu-bahan-baku-non-industri";
import { VIU_KONSUMSI_SCHEME } from "./viu-konsumsi";
import { VKI_SCHEME } from "./vki";

export const SCHEMES: Record<SchemeId, SchemeDefinition> = {
  VKI: VKI_SCHEME,
  VIU_KONSUMSI: VIU_KONSUMSI_SCHEME,
  VIU_BAHAN_BAKU_NON_INDUSTRI: VIU_NON_INDUSTRI_SCHEME,
  VIU_BAHAN_BAKU_INDUSTRI: VIU_INDUSTRI_SCHEME,
};

export function getScheme(id: SchemeId): SchemeDefinition {
  return SCHEMES[id];
}
