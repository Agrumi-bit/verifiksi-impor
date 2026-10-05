import type { LegalBasis } from "../types";

/** An article of Permenperin 27/2025. */
export function pasal(citation: string, note?: string): LegalBasis {
  return { kind: "REGULASI", citation, note };
}

/** LVI's own internal requirement — printed as such, never dressed up as a pasal. */
export function internalLvi(note: string): LegalBasis {
  return { kind: "INTERNAL_LVI", citation: "", note };
}

/** Required by a related article (not this scheme's own requirement article). */
export function terkait(citation: string, note: string): LegalBasis {
  return { kind: "TERKAIT", citation, note };
}

export const INTERNAL_LVI_LABEL = "Persyaratan internal Lembaga Pelaksana Verifikasi";

export function formatLegalBasis(basis: LegalBasis): string {
  if (basis.kind === "INTERNAL_LVI") return INTERNAL_LVI_LABEL;
  return basis.citation;
}
