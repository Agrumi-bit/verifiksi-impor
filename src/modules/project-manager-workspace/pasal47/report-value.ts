import type { P47Dataset, P47Line } from "./types";

/**
 * Rencana nilai impor in Rupiah, like the reference report: IDR lines as they are, foreign-currency lines
 * converted with the kurs the Technical Analyst recorded for that application (P47Value.rate, Rupiah per
 * unit). A foreign line without a kurs has no Rupiah value (null) and is reported as not converted —
 * never summed in its own currency next to Rupiah.
 */
export function rupiahValuer(ds: Pick<P47Dataset, "values">): (line: P47Line) => number | null {
  const rates = new Map<string, number>();
  for (const v of ds.values) if (v.rate && v.rate > 0) rates.set(`${v.applicationId}|${v.currency}`, v.rate);
  return (line) => {
    if (line.currency === "IDR") return line.total;
    const rate = rates.get(`${line.applicationId}|${line.currency}`);
    return rate ? line.total * rate : null;
  };
}
