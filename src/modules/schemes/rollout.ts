import type { SchemeId } from "./types";

/**
 * Schemes whose documents/narrative are served from this module (staged rollout of the per-scheme
 * refactor). An application is handled by the scheme module only when EVERY scheme it belongs to
 * is active — a mixed application (e.g. Konsumsi + Bahan Baku Industri) keeps the legacy path
 * until all its schemes are migrated, so it is never half old / half new.
 *
 *   Tahap 2 → VIU_KONSUMSI · Tahap 3 → VIU_BAHAN_BAKU_NON_INDUSTRI · Tahap 4 → VIU_BAHAN_BAKU_INDUSTRI · Tahap 5 → VKI
 */
export const ACTIVE_SCHEMES: ReadonlySet<SchemeId> = new Set<SchemeId>(["VIU_KONSUMSI"]);

export function isSchemeRolloutActive(schemes: readonly SchemeId[]): boolean {
  return schemes.length > 0 && schemes.every((s) => ACTIVE_SCHEMES.has(s));
}
