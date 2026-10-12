/* Mesin laporan khusus VIU Non Industri — salinan terpisah; perubahan di sini tidak memengaruhi skema lain. */
import { countBy, fdLong, joinId, topN } from "../../format";
import type { P47Place, Status } from "../../types";
import type { Seg } from "./model";

/** Small counting and wording helpers shared by the chapter reports (VIU Non Industri, VKI). */
export const periodOf = (period: { from: string; to: string }) => `${fdLong(period.from)} sampai dengan ${fdLong(period.to)}`;
export const ratio = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1).replace(".", ",")}%` : "—");
export const ranked = (items: string[], n = 99) => topN(countBy(items, (x) => x), n);
export const own = (segs: Seg[], label: string) => segs.find((s) => s.label === label)?.value ?? 0;
export const segsOf = (items: string[], order: string[] = []): Seg[] => {
  const counts = countBy(items, (x) => x);
  const keys = [...order.filter((o) => counts.has(o)), ...[...counts.keys()].filter((k) => !order.includes(k)).sort()];
  return keys.map((label) => ({ label, value: counts.get(label) ?? 0 }));
};
export const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
export const loc = (p: P47Place | null | undefined) => (p ? [title(p.city), title(p.province)].filter(Boolean).join(", ") || "—" : "—");
export const statusCounts = (xs: Status[]) => segsOf(xs.map((s) => s.label), ["Sesuai", "Tidak Sesuai", "Belum Dianalisis"]);
export const phraseCounts = (segs: Seg[], noun: string) => joinId(segs.map((s) => `${s.value} ${noun} ${s.label.toLowerCase()}`));
