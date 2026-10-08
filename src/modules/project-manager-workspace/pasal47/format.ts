import type { Status, Tone } from "./types";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

export const nf = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** "2026-01-14" → "14 Jan 2026"; "—" when empty. */
export function fd(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${Number(d)} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function fdLong(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${Number(d)} ${MONTHS_LONG[Number(m) - 1]} ${y}`;
}

export const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`;

export const CURRENCY_SYMBOL: Record<string, string> = { USD: "US$", CNY: "CN¥", EUR: "€", IDR: "Rp", JPY: "¥", SGD: "S$" };
export const sym = (currency: string) => CURRENCY_SYMBOL[currency] ?? currency;

export function compact(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e12) return `${(v / 1e12).toFixed(1).replace(".", ",")} T`;
  if (abs >= 1e9) return `${(v / 1e9).toFixed(1).replace(".", ",")} M`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(1).replace(".", ",")} jt`;
  if (abs >= 1e3) return `${Math.round(v / 1e3)} rb`;
  return nf(Math.round(v));
}

export const money = (currency: string, v: number) => `${sym(currency)} ${compact(v)}`;
export const moneyFull = (currency: string, v: number) => `${sym(currency)} ${nf(Math.round(v))}`;
export const pct = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "—");

export const status = (label: string, tone: Tone): Status => ({ label, tone });

export const uniq = <T,>(values: T[]) => [...new Set(values)];
export const sum = (values: number[]) => values.reduce((a, b) => a + b, 0);

export function countBy<T>(items: T[], key: (item: T) => string): Map<string, number> {
  const map = new Map<string, number>();
  for (const item of items) {
    const k = key(item);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

export function topN(map: Map<string, number>, n: number): [string, number][] {
  return [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, n);
}
