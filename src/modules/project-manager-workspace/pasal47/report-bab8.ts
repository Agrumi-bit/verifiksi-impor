import { fdLong, nf, sum, uniq } from "./format";
import { bab3 } from "./report-bab3";
import { rupiahValuer } from "./report-value";
import type { P47Dataset, P47Line } from "./types";

/*
 * Bab 8 "Konsentrasi Rencana Impor" of the Laporan Pelaksanaan VIU: concentration of the rencana nilai
 * impor (Rupiah) by Pemohon VIU, pemilik merek, merek, pos tarif/HS, negara asal (equal-allocation
 * estimate from Bab 3) and kelompok komoditas, measured with CR1/CR3/CR5 and the Herfindahl-Hirschman
 * Index (sum of squared percentage shares, 0–10.000).
 */

const pctText = (share: number) => `${(share * 100).toFixed(1).replace(".", ",")}%`;
const rp = (v: number) => {
  const a = Math.abs(v);
  const f = (x: number, u: string) => `Rp ${x.toLocaleString("id-ID", { maximumFractionDigits: 2 })} ${u}`;
  return a >= 1e12 ? f(v / 1e12, "triliun") : a >= 1e9 ? f(v / 1e9, "miliar") : a >= 1e6 ? f(v / 1e6, "juta") : `Rp ${nf(Math.round(v))}`;
};
const andList = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} dan ${xs[xs.length - 1]}`);

export type ConcLevel = "Rendah" | "Sedang" | "Tinggi";
/** HHI thresholds commonly used by competition authorities. */
export const hhiLevel = (hhi: number): ConcLevel => (hhi > 2500 ? "Tinggi" : hhi >= 1500 ? "Sedang" : "Rendah");

export type Dimension = {
  key: string; label: string; phrase: string; estimate: boolean;
  items: { label: string; value: number; share: number; lines: number }[];
  total: number; cr1: number; cr3: number; cr5: number; hhi: number; level: ConcLevel;
};

/** Shares, CR1/3/5 and HHI of one dimension; entries with no value are left out. */
export function concentrationOf(key: string, label: string, entries: [string, number, number?][], estimate = false, phrase = label): Dimension {
  const map = new Map<string, { value: number; lines: number }>();
  for (const [k, v, n] of entries) {
    if (!(v > 0)) continue;
    const row = map.get(k) ?? { value: 0, lines: 0 };
    row.value += v;
    row.lines += n ?? 1;
    map.set(k, row);
  }
  const total = sum([...map.values()].map((r) => r.value));
  const items = [...map.entries()].map(([l, r]) => ({ label: l, value: r.value, share: total ? r.value / total : 0, lines: r.lines })).sort((a, b) => b.value - a.value);
  const cr = (n: number) => sum(items.slice(0, n).map((i) => i.share));
  const hhi = Math.round(sum(items.map((i) => (i.share * 100) ** 2)));
  return { key, label, phrase, estimate, items, total, cr1: cr(1), cr3: cr(3), cr5: cr(5), hhi, level: hhiLevel(hhi) };
}

export type Bab8 = {
  dims: Dimension[];
  byHhi: Dimension[];
  table: (string | number)[][];
  highlights: string[];
  sub81: string[]; sub82: string[]; sub83: string[];
  limits: string[];
};

export function bab8(ds: P47Dataset): Bab8 {
  const toRp = rupiahValuer(ds);
  const valued = ds.lines.map((l) => [l, toRp(l) ?? 0] as [P47Line, number]);
  const owner = new Map(ds.brands.map((b) => [b.id, b.owner.trim() || "Tidak diisi"]));
  const b3 = bab3(ds);
  const dims = [
    concentrationOf("company", "Pemohon VIU", valued.map(([l, v]) => [l.company, v])),
    concentrationOf("owner", "Pemilik Merek", valued.map(([l, v]) => [owner.get(l.brandId) ?? "Tidak diisi", v]), false, "pemilik merek"),
    concentrationOf("brand", "Merek", valued.map(([l, v]) => [l.brandName || "—", v]), false, "merek"),
    concentrationOf("hs", "Pos Tarif/HS", valued.map(([l, v]) => [l.hs || "—", v]), false, "pos tarif/HS"),
    concentrationOf("country", "Negara Asal (estimasi)", b3.countries.map((c) => [c.name, c.value, c.lines]), true, "negara asal (estimasi)"),
    concentrationOf("group", "Kelompok Komoditas", valued.map(([l, v]) => [l.kelompok || "Tidak dicatat", v]), false, "kelompok komoditas"),
  ];
  const byHhi = [...dims].sort((a, b) => b.hhi - a.hhi);
  const table = dims.map((d) => [d.label, d.items.length, d.items[0]?.label ?? "—", pctText(d.cr1), pctText(d.cr3), pctText(d.cr5), nf(d.hhi), d.level]);

  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const limits = [
    "Konsentrasi dihitung dari rencana nilai impor dalam Rupiah, bukan realisasi impor; product line dalam mata uang asing tanpa kurs tidak termasuk dalam nilai.",
    "Nilai per negara asal merupakan estimasi alokasi merata (Bab 3) karena satu product line dapat mencantumkan beberapa negara asal tanpa alokasi kuantitas.",
    "Pemilik merek mengikuti nama pemilik yang tercatat pada Merek Management; penulisan nama yang berbeda untuk pemilik yang sama dihitung sebagai pemilik berbeda.",
    "HHI merupakan alat analisis untuk menentukan prioritas pemantauan dan bukan indikator kepatuhan menurut peraturan.",
  ];
  const sub81 = [
    "Bab ini mengukur tingkat konsentrasi rencana nilai impor menurut enam dimensi: Pemohon VIU, pemilik merek, merek, pos tarif/HS, negara asal, dan kelompok komoditas. Ukuran yang digunakan adalah rasio konsentrasi (CR1, CR3, dan CR5, yaitu pangsa gabungan 1, 3, dan 5 entitas terbesar) serta Herfindahl-Hirschman Index (HHI), yaitu jumlah kuadrat pangsa setiap entitas dalam persen dengan rentang 0 hingga 10.000.",
    "HHI diklasifikasikan menggunakan ambang yang lazim dipakai otoritas persaingan usaha: kurang dari 1.500 menunjukkan konsentrasi rendah, 1.500–2.500 sedang, dan lebih dari 2.500 tinggi. Indikator ini merupakan alat analisis untuk menentukan prioritas pemantauan dan bukan indikator kepatuhan menurut peraturan. Rincian distribusi setiap dimensi disajikan pada Bab 2 (pos tarif/HS dan kelompok komoditas), Bab 3 (negara asal), Bab 4 (merek dan pemilik merek), dan Bab 7 (Pemohon VIU).",
  ];
  if (!ds.lines.length || !dims[0].total) {
    return { dims, byHhi, table, highlights: [], sub81: [...sub81, `Selama periode pelaporan ${period} belum terdapat rencana nilai impor yang dapat diukur.`], sub82: [], sub83: [], limits };
  }

  const company = dims[0];
  const ownerDim = dims[1];
  const countryDim = dims[4];
  const high = byHhi.filter((d) => d.level === "Tinggi");
  const sub82 = [
    `Konsentrasi tertinggi terdapat pada dimensi ${byHhi[0].phrase} dengan HHI ${nf(byHhi[0].hhi)}${byHhi[1] ? `, diikuti ${byHhi[1].phrase} dengan HHI ${nf(byHhi[1].hhi)}` : ""}. ${high.length ? `${high.length} dari ${dims.length} dimensi tergolong konsentrasi tinggi (HHI di atas 2.500).` : "Tidak ada dimensi yang tergolong konsentrasi tinggi."} Pada dimensi Pemohon VIU, HHI sebesar ${nf(company.hhi)} (${company.level.toLowerCase()}) dengan CR3 ${pctText(company.cr3)}${company.cr3 >= 0.5 ? ", sehingga perubahan rencana impor beberapa pemohon terbesar akan berpengaruh besar terhadap total rencana impor periode ini" : ""} (Gambar 8.1 dan Tabel 8.1).`,
  ];
  const ownerTop = ownerDim.items[0];
  const ownerBrands = ownerTop ? uniq(ds.lines.filter((l) => owner.get(l.brandId) === ownerTop.label).map((l) => l.brandName)) : [];
  const ownerCompanies = ownerTop ? uniq(ds.lines.filter((l) => owner.get(l.brandId) === ownerTop.label).map((l) => l.company)) : [];
  const sub83 = [
    `Lima Pemohon VIU terbesar mencakup ${pctText(company.cr5)} dari total rencana nilai, sedangkan lima pemilik merek terbesar mencakup ${pctText(ownerDim.cr5)}. Pemohon terbesar, ${company.items[0].label}, mencakup ${pctText(company.cr1)} (${rp(company.items[0].value)})${ownerTop ? `; pemilik merek terbesar, ${ownerTop.label}, mencakup ${pctText(ownerTop.share)} melalui merek ${andList(ownerBrands.slice(0, 3))}${ownerCompanies.length > 1 ? ` yang diajukan oleh ${ownerCompanies.length} pemohon` : ` yang diajukan oleh ${ownerCompanies[0]}`}` : ""} (Gambar 8.2).`,
    `Menurut merek, ${dims[2].items[0]?.label ?? "—"} mencakup ${pctText(dims[2].cr1)} dari total rencana nilai; menurut pos tarif/HS, ${dims[3].items[0]?.label ?? "—"} mencakup ${pctText(dims[3].cr1)} (Gambar 8.3).`,
  ];
  const highlights = [
    high.length ? `Rencana nilai impor sangat terkonsentrasi menurut ${andList(high.map((d) => d.phrase))} (HHI di atas 2.500).` : "Tidak ada dimensi rencana nilai impor yang tergolong konsentrasi tinggi (HHI di atas 2.500).",
    `Tiga Pemohon VIU terbesar mencakup ${pctText(company.cr3)} dari total rencana nilai; pemohon terbesar, ${company.items[0].label}, mencakup ${pctText(company.cr1)}.`,
    ownerTop ? `Pemilik merek terbesar, ${ownerTop.label}, mencakup ${pctText(ownerTop.share)} dari total rencana nilai${ownerCompanies.length > 1 ? ` melalui merek yang diajukan oleh ${ownerCompanies.length} pemohon` : ""}.` : "",
    countryDim.items[0] ? `Menurut estimasi alokasi merata, ${countryDim.items[0].label} mencakup ${pctText(countryDim.cr1)} dari rencana nilai menurut negara asal.` : "",
  ].filter(Boolean);

  return { dims, byHhi, table, highlights, sub81, sub82, sub83, limits };
}
