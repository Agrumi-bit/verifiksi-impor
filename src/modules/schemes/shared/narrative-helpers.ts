import type { DocTextParams, LegalBasis } from "../types";
import { INTERNAL_LVI_LABEL } from "./legal";

export const PERMENPERIN = "Peraturan Menteri Perindustrian Nomor 27 Tahun 2025";

/** Citation as printed in narrative text. */
export function cite(basis: LegalBasis): string {
  if (basis.kind === "INTERNAL_LVI") return INTERNAL_LVI_LABEL.toLowerCase();
  return `${basis.citation} ${PERMENPERIN}`;
}

export function statusHtml(p: Pick<DocTextParams, "memenuhi">): string {
  return `<strong>${p.memenuhi ? "Memenuhi" : "Belum Memenuhi"}</strong>`;
}

/** "—" or the value. */
export function v(value: string | null | undefined): string {
  return value && value.trim() ? value : "—";
}

/** Field values except availability/status rows, joined with " dan ". */
export function listValues(p: DocTextParams, skipLabels: readonly string[] = []): string {
  const values = p.fields.filter((f) => !skipLabels.includes(f.label) && f.value && f.value !== "—").map((f) => f.value);
  return values.length ? values.join(" dan ") : "—";
}

/** Title without its " — suffix" (e.g. location/brand name). */
export function baseTitle(p: DocTextParams): string {
  return p.title.split(" — ")[0];
}

/** Text after the first " — " in the title (location / brand context), or "". */
export function titleContext(p: DocTextParams): string {
  const i = p.title.indexOf(" — ");
  return i >= 0 ? p.title.slice(i + 3) : "";
}
