import { countBy, status, sum, topN, uniq } from "./format";
import type { P47Application, P47Brand, P47Dataset, P47Line, Status } from "./types";

/* ------------------------------------------------------------------ periods */

export type ReportingPeriod = { key: string; label: string; from: string; to: string };

/** Pasal 47 reporting years run 1 Oktober – 30 September. Newest first; the current, unfinished one included. */
export function reportingPeriods(today: Date, count = 3): ReportingPeriod[] {
  const y = today.getFullYear(), m = today.getMonth() + 1;
  const currentEnd = m >= 10 ? y + 1 : y;
  return Array.from({ length: count }, (_, i) => {
    const end = currentEnd - i;
    return { key: `${end - 1}-${end}`, label: `01 Okt ${end - 1} – 30 Sep ${end}`, from: `${end - 1}-10-01`, to: `${end}-09-30` };
  });
}

/** The reporting year that contains today — the default view, so monitoring starts on current data. */
export function defaultPeriod(today: Date): ReportingPeriod {
  return reportingPeriods(today)[0];
}

/* ------------------------------------------------------------------ statuses */

const daysBetween = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / 864e5;

/** The system stores the LHVIU PDF only — no number or validity — so status is about issuance. */
export function lhviuStatus(app: P47Application): Status {
  if (app.lhviu) return status("Terbit", "ok");
  if (app.status === "COMPLETED") return status("Belum Diunggah", "warn");
  return status("Dalam Proses", "na");
}

export function brandCertificateStatus(brand: Pick<P47Brand, "registrationNumber" | "expiryDate">, periodEnd: string): Status {
  if (!brand.registrationNumber) return status("Tidak Lengkap", "bad");
  if (!brand.expiryDate) return status("Tanpa Tanggal Kedaluwarsa", "warn");
  if (brand.expiryDate < periodEnd) return status("Kedaluwarsa", "bad");
  return daysBetween(periodEnd, brand.expiryDate) <= 90 ? status("Akan Berakhir", "warn") : status("Aktif", "ok");
}

/* ------------------------------------------------------------------ filters */

export type P47Filters = Partial<Record<"company" | "kbli" | "applicationNumber" | "lhviu" | "hs" | "komoditas" | "brand" | "country" | "lokasi", string>>;

export const FILTER_LABELS: Record<keyof P47Filters, string> = {
  company: "Perusahaan",
  lokasi: "Lokasi (Kota/Kab.)",
  kbli: "KBLI",
  lhviu: "LHVIU",
  applicationNumber: "Nomor Permohonan",
  hs: "HS",
  komoditas: "Komoditas",
  brand: "Merek",
  country: "Negara Asal",
};

export function filterOptions(ds: P47Dataset): Record<keyof P47Filters, string[]> {
  return {
    company: uniq(ds.applications.map((a) => a.company)).sort(),
    lokasi: uniq(ds.applications.flatMap((a) => [a.kantor?.city ?? "", ...a.gudang.map((g) => g.city)]).filter(Boolean)).sort(),
    kbli: uniq(ds.applications.flatMap((a) => a.kbli.map((k) => k.code))).sort(),
    lhviu: ["Terbit", "Belum Diunggah", "Dalam Proses"],
    applicationNumber: ds.applications.map((a) => a.applicationNumber).sort(),
    hs: uniq(ds.lines.map((l) => l.hs)).sort(),
    komoditas: uniq(ds.lines.map((l) => l.komoditas || l.subKelompok).filter(Boolean)).sort(),
    brand: uniq(ds.lines.map((l) => l.brandName)).sort(),
    country: uniq(ds.lines.flatMap((l) => l.countries)).sort(),
  };
}

/**
 * Narrows the whole dataset, so KPIs, charts and tables all follow the same filters. Application-level
 * filters pick applications; product-line filters pick lines, and an application with no matching
 * line drops out too.
 */
export function applyFilters(ds: P47Dataset, f: P47Filters): P47Dataset {
  const appOk = (a: P47Application) =>
    (!f.company || a.company === f.company) &&
    (!f.kbli || a.kbli.some((k) => k.code === f.kbli)) &&
    (!f.applicationNumber || a.applicationNumber === f.applicationNumber) &&
    (!f.lhviu || lhviuStatus(a).label === f.lhviu) &&
    (!f.lokasi || a.kantor?.city === f.lokasi || a.gudang.some((g) => g.city === f.lokasi));
  const lineOk = (l: P47Line) =>
    (!f.hs || l.hs === f.hs) &&
    (!f.komoditas || (l.komoditas || l.subKelompok) === f.komoditas) &&
    (!f.brand || l.brandName === f.brand) &&
    (!f.country || l.countries.includes(f.country));
  const lineFilterActive = Boolean(f.hs || f.komoditas || f.brand || f.country);

  let apps = ds.applications.filter(appOk);
  const appIds = new Set(apps.map((a) => a.id));
  const lines = ds.lines.filter((l) => appIds.has(l.applicationId) && lineOk(l));
  if (lineFilterActive) {
    const withLines = new Set(lines.map((l) => l.applicationId));
    apps = apps.filter((a) => withLines.has(a.id));
  }
  const ids = new Set(apps.map((a) => a.id));
  const brandIds = new Set(lines.map((l) => l.brandId));
  return {
    ...ds,
    applications: apps,
    lines,
    brands: ds.brands
      .filter((b) => brandIds.has(b.id) || (!lineFilterActive && b.uses.some((u) => ids.has(u.applicationId))))
      .map((b) => ({ ...b, uses: b.uses.filter((u) => ids.has(u.applicationId)) })),
    technical: ds.technical.filter((t) => ids.has(t.applicationId) && (!f.brand || t.brandName === f.brand)),
    warehouses: ds.warehouses.filter((w) => ids.has(w.applicationId)),
    values: ds.values.filter((v) => ids.has(v.applicationId)),
    findings: ds.findings.filter((x) => ids.has(x.applicationId)),
  };
}

/* ------------------------------------------------------------------ aggregates */

export type HsRow = {
  hs: string; description: string; kelompok: string; subKelompok: string; komoditas: string;
  companies: number; lines: number; quantity: number; unit: string; units: string[];
};

/** One row per HS. Quantity is summed only when every line of that HS uses the same unit. */
export function hsRows(lines: P47Line[]): HsRow[] {
  return uniq(lines.map((l) => l.hs)).map((hs) => {
    const ls = lines.filter((l) => l.hs === hs);
    const units = uniq(ls.map((l) => l.unit || "—"));
    return {
      hs, description: ls[0].hsDescription, kelompok: ls[0].kelompok, subKelompok: ls[0].subKelompok, komoditas: ls[0].komoditas,
      companies: uniq(ls.map((l) => l.applicationId)).length, lines: ls.length,
      quantity: units.length === 1 ? sum(ls.map((l) => l.quantity)) : NaN, unit: units.length === 1 ? units[0] : "", units,
    };
  });
}

export type CountryRow = { country: string; companies: number; hs: number; brands: number; lines: number };

/** Product-country relations, never volume: a line with several origins has no per-country split. */
export function countryRows(lines: P47Line[]): CountryRow[] {
  return uniq(lines.flatMap((l) => l.countries)).map((country) => {
    const ls = lines.filter((l) => l.countries.includes(country));
    return { country, companies: uniq(ls.map((l) => l.applicationId)).length, hs: uniq(ls.map((l) => l.hs)).length, brands: uniq(ls.map((l) => l.brandId)).length, lines: ls.length };
  }).sort((a, b) => b.lines - a.lines || a.country.localeCompare(b.country));
}

export type ValueHsRow = { hs: string; description: string; unit: string; currency: string; value: number; quantity: number; price: number | null; companies: number; lines: number; share: number };

/** Planned import value per HS in ONE currency. Unit price only when the HS uses a single unit. */
export function valueByHs(lines: P47Line[], currency: string): ValueHsRow[] {
  const ls = lines.filter((l) => l.currency === currency);
  const total = sum(ls.map((l) => l.total));
  return uniq(ls.map((l) => l.hs)).map((hs) => {
    const x = ls.filter((l) => l.hs === hs);
    const units = uniq(x.map((l) => l.unit));
    const value = sum(x.map((l) => l.total)), quantity = sum(x.map((l) => l.quantity));
    return {
      hs, description: x[0].hsDescription, unit: units.length === 1 ? units[0] : "", currency, value,
      quantity: units.length === 1 ? quantity : NaN, price: units.length === 1 && quantity > 0 ? value / quantity : null,
      companies: uniq(x.map((l) => l.applicationId)).length, lines: x.length, share: total > 0 ? value / total : 0,
    };
  }).sort((a, b) => b.value - a.value);
}

export const currenciesOf = (lines: P47Line[]) => uniq(lines.map((l) => l.currency)).sort((a, b) => (a === "USD" ? -1 : b === "USD" ? 1 : a.localeCompare(b)));

export type Dimension = "hs" | "merek" | "negara" | "perusahaan";

/** Ranking by number of product lines (country: product-country relations) — quantities mix units. */
export function concentration(lines: P47Line[], dim: Dimension, n: number): { items: { label: string; key: string; v: number }[]; total: number } {
  if (dim === "negara") {
    const rel = lines.flatMap((l) => l.countries);
    return { items: topN(countBy(rel, (c) => c), n).map(([k, v]) => ({ label: k, key: k, v })), total: rel.length };
  }
  const key = (l: P47Line) => (dim === "hs" ? l.hs : dim === "merek" ? l.brandName : l.company);
  const label = (k: string) => (dim === "hs" ? `${k} · ${lines.find((l) => l.hs === k)?.komoditas || lines.find((l) => l.hs === k)?.subKelompok || ""}` : k);
  return { items: topN(countBy(lines, key), n).map(([k, v]) => ({ label: label(k), key: k, v })), total: lines.length };
}

export type TrendGroup = "bulanan" | "hs" | "merek" | "perusahaan";

/** Monthly planned quantity in one unit, by the month the application was submitted. */
export function trend(lines: P47Line[], apps: P47Application[], period: { from: string; to: string }, unit: string, group: TrendGroup, top = 3) {
  const months: string[] = [];
  for (let d = new Date(`${period.from}T00:00:00Z`); d.toISOString().slice(0, 10) <= period.to; d.setUTCMonth(d.getUTCMonth() + 1)) months.push(d.toISOString().slice(0, 7));
  const monthOf = new Map(apps.map((a) => [a.id, a.submittedAt.slice(0, 7)]));
  const ls = lines.filter((l) => l.unit === unit);
  const series = (filter: (l: P47Line) => boolean) => months.map((m) => sum(ls.filter((l) => filter(l) && monthOf.get(l.applicationId) === m).map((l) => l.quantity)));
  if (group === "bulanan") return { months, series: [{ name: `Total rencana kebutuhan (${unit})`, values: series(() => true) }] };
  const key = (l: P47Line) => (group === "hs" ? l.hs : group === "merek" ? l.brandName : l.company);
  const keys = topN(new Map(uniq(ls.map(key)).map((k) => [k, sum(ls.filter((l) => key(l) === k).map((l) => l.quantity))])), top).map(([k]) => k);
  return { months, series: keys.map((k) => ({ name: k, values: series((l) => key(l) === k) })) };
}

export const unitsOf = (lines: P47Line[]) => topN(countBy(lines, (l) => l.unit || "—"), 99).map(([u]) => u).filter((u) => u !== "—");
