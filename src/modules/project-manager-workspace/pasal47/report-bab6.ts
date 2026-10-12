import { unitsOf } from "./derive";
import { fdLong, joinId, nf, sum, uniq, withWords } from "./format";
import type { P47Dataset, P47Line } from "./types";

/*
 * Bab 6 "Persediaan Produk Tekstil" of the Laporan Pelaksanaan VIU: the stock each Perusahaan API-U
 * declared per product line at verification, compared with its rencana impor, and the Kapasitas Gudang
 * analysis of the Technical Analyst (kapasitas, stok terkini and volume pengajuan in m³). Quantities are
 * never summed across units.
 */

const pct1 = (part: number, total: number) => (total > 0 ? (part > 0 && (part / total) * 100 < 0.05 ? "<0,1%" : `${((part / total) * 100).toFixed(1).replace(".", ",")}%`) : "0%");
const qtyIn = (ls: P47Line[], unit: string, f: (l: P47Line) => number) => sum(ls.filter((l) => l.unit === unit).map(f));

/** Gudang of one permohonan as measured in the surveyor's gudang report (luas m², kapasitas efektif m³). */
export type StorageRow = { company: string; city: string; gudang: number; area: number | null; capacity: number | null };

export type Bab6 = {
  units: string[];
  unit: string;
  stockByUnit: number[];
  planByUnit: number[];
  stocked: P47Line[];
  zero: P47Line[];
  companies: { company: string; lines: number; stocked: number; stock: number[]; plan: number[]; ratio: number | null; warehouses: number }[];
  groups: { kelompok: string; lines: number; stocked: number; stock: number; other: string }[];
  storage: StorageRow[];
  companyHeaders: string[];
  companyTable: (string | number)[][];
  storageTable: (string | number)[][];
  highlights: string[];
  sub61: string[]; sub62: string[]; sub63: string[]; sub64: string[]; sub65: string[];
  limits: string[];
};

export function bab6(ds: P47Dataset): Bab6 {
  const units = unitsOf(ds.lines);
  const unit = units[0] ?? "PCS";
  const lines = ds.lines;
  const stockByUnit = units.map((u) => qtyIn(lines, u, (l) => l.stock));
  const planByUnit = units.map((u) => qtyIn(lines, u, (l) => l.quantity));
  const stocked = lines.filter((l) => l.stock > 0);
  const zero = lines.filter((l) => !(l.stock > 0));

  const companies = uniq(lines.map((l) => l.company)).map((company) => {
    const ls = lines.filter((l) => l.company === company);
    const stock = units.map((u) => qtyIn(ls, u, (l) => l.stock));
    const plan = units.map((u) => qtyIn(ls, u, (l) => l.quantity));
    const appIds = new Set(ls.map((l) => l.applicationId));
    return {
      company, lines: ls.length, stocked: ls.filter((l) => l.stock > 0).length, stock, plan, ratio: plan[0] ? stock[0] / plan[0] : null,
      warehouses: ds.warehouses.filter((w) => appIds.has(w.applicationId)).length,
    };
  }).sort((a, b) => b.stock[0] - a.stock[0] || b.lines - a.lines);

  const groups = uniq(lines.map((l) => l.kelompok || "Tidak dicatat")).map((kelompok) => {
    const ls = lines.filter((l) => (l.kelompok || "Tidak dicatat") === kelompok);
    // Stock held in the other units is named, not added to the main unit.
    const other = units.slice(1).map((u) => [u, qtyIn(ls, u, (l) => l.stock)] as const).filter(([, q]) => q > 0).map(([u, q]) => `${nf(Math.round(q))} ${u}`).join(", ");
    return { kelompok, lines: ls.length, stocked: ls.filter((l) => l.stock > 0).length, stock: qtyIn(ls, unit, (l) => l.stock), other };
  }).sort((a, b) => b.stock - a.stock || b.lines - a.lines);

  // Luas and kapasitas gudang from the surveyor's gudang report (verifikasi lapangan), summed per permohonan.
  const appsWithLines = uniq(lines.map((l) => l.applicationId));
  const appById = new Map(ds.applications.map((a) => [a.id, a]));
  const sumOrNull = (vals: (number | null | undefined)[]) => {
    const xs = vals.filter((v): v is number => typeof v === "number" && v > 0);
    return xs.length ? sum(xs) : null;
  };
  const storage: StorageRow[] = appsWithLines.map((appId) => {
    const gudang = appById.get(appId)?.gudang ?? [];
    return {
      company: lines.find((l) => l.applicationId === appId)?.company ?? "—",
      city: uniq(gudang.map((g) => g.city.trim()).filter(Boolean)).join(", ") || "—",
      gudang: gudang.length,
      area: sumOrNull(gudang.map((g) => g.area)),
      capacity: sumOrNull(gudang.map((g) => g.capacity)),
    };
  }).sort((a, b) => (b.capacity ?? -1) - (a.capacity ?? -1) || (b.area ?? -1) - (a.area ?? -1));

  const unitCols = (vals: number[]) => units.map((_, i) => Math.round(vals[i] ?? 0));
  const companyHeaders = ["Perusahaan", "Product Line", "Line Berstok", ...units.map((u) => `Persediaan (${u})`), `Rencana Impor (${unit})`, "Persediaan ÷ Rencana", "Gudang"];
  const companyTable = companies.map((c) => [c.company, c.lines, c.stocked, ...unitCols(c.stock), Math.round(c.plan[0] ?? 0), c.ratio === null ? "—" : pct1(c.stock[0], c.plan[0]), c.warehouses]);
  const fmtNum = (v: number | null) => (v === null ? "—" : nf(Math.round(v)));
  const storageTable = storage.map((s) => [s.company, s.city, fmtNum(s.area), fmtNum(s.capacity)]);

  // Narrative -------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const limits = [
    "Persediaan merupakan data yang dilaporkan perusahaan per product line pada saat pengajuan dan verifikasi, dan tidak diperbarui setelah LHVIU terbit.",
    "Luas gudang (m²) dan kapasitas gudang (m³) berasal dari laporan survei verifikasi lapangan gudang; gudang yang belum disurvei atau belum diukur tidak memiliki luas dan kapasitas.",
    "Kapasitas gudang adalah kapasitas efektif: luas digunakan × tinggi efektif × utilisasi aman, sebagaimana dihitung pada laporan survei gudang; satuannya berbeda dengan persediaan per product line sehingga tidak dibandingkan langsung.",
    "Kuantitas tidak dijumlahkan lintas satuan.",
  ];
  const empty = { units, unit, stockByUnit, planByUnit, stocked, zero, companies, groups, storage, companyHeaders, companyTable, storageTable };
  if (!lines.length) {
    return { ...empty, highlights: [], sub61: [`Selama periode pelaporan ${period} belum terdapat product line rencana impor.`], sub62: [], sub63: [], sub64: [], sub65: [], limits };
  }

  const withStock = companies.filter((c) => c.stocked > 0);
  const noStock = companies.filter((c) => c.stocked === 0);
  const top = withStock[0];
  const unitText = units.map((u, i) => `${nf(Math.round(stockByUnit[i]))} ${u}`);
  const measured = storage.filter((s) => s.capacity !== null || s.area !== null);
  const withCapacity = storage.filter((s) => s.capacity !== null);
  const notMeasured = storage.filter((s) => s.capacity === null && s.area === null);
  const totalArea = sum(storage.map((s) => s.area ?? 0));
  const totalCapacity = sum(storage.map((s) => s.capacity ?? 0));
  const topGroup = groups.find((g) => g.stock > 0);

  const sub61 = [
    "Persediaan (stok) Produk Tekstil dilaporkan Perusahaan API-U per product line pada saat pengajuan permohonan VIU. Data persediaan memberikan gambaran kegiatan usaha yang sedang berjalan dan bukan merupakan syarat penerbitan LHVIU.",
    `Selama periode pelaporan ${period}, ${withWords(companies.length)} Perusahaan API-U melaporkan persediaan untuk ${nf(lines.length)} product line. Sebanyak ${nf(zero.length)} product line (${pct1(zero.length, lines.length)}) dilaporkan dengan stok nol, dan ${withWords(noStock.length)} perusahaan tidak memiliki persediaan sama sekali. Total persediaan yang dilaporkan adalah ${joinId(unitText)}, setara ${pct1(stockByUnit[0], planByUnit[0])} dari total rencana impor dalam satuan ${unit} (Gambar 6.1).`,
  ];
  const sub62 = [
    top
      ? `${withStock.length <= 3 ? `Persediaan terkonsentrasi pada sejumlah kecil perusahaan; ${withStock.length} dari ${companies.length} perusahaan melaporkan persediaan lebih dari nol.` : `Sebanyak ${withWords(withStock.length)} dari ${companies.length} perusahaan melaporkan persediaan lebih dari nol.`} ${top.company} melaporkan persediaan terbesar sebesar ${nf(Math.round(top.stock[0]))} ${unit} (${pct1(top.stock[0], stockByUnit[0])} dari total persediaan ${unit})${withStock[1] ? `, diikuti ${withStock.slice(1, 3).map((c) => `${c.company} (${nf(Math.round(c.stock[0]))} ${unit})`).join(" dan ")}` : ""} (Gambar 6.2 dan Tabel 6.2). Rasio persediaan terhadap rencana impor menunjukkan perbandingan besaran persediaan dengan volume yang direncanakan untuk diimpor dan tidak dimaksudkan sebagai indikator kepatuhan.`
      : "Tidak ada perusahaan yang melaporkan persediaan lebih dari nol pada saat pengajuan.",
  ];
  const sub63 = [
    topGroup
      ? `Menurut kelompok komoditas, persediaan terbesar berada pada ${topGroup.kelompok} (${nf(Math.round(topGroup.stock))} ${unit}, ${topGroup.stocked} dari ${topGroup.lines} product line berstok)${groups.filter((g) => g.stock > 0).length > 1 ? `, diikuti ${groups.filter((g) => g.stock > 0).slice(1, 3).map((g) => `${g.kelompok} (${nf(Math.round(g.stock))} ${unit})`).join(" dan ")}` : ""} (Gambar 6.3).`
      : "",
  ].filter(Boolean);
  const sub64 = [
    "Luas dan kapasitas gudang diambil dari laporan survei verifikasi lapangan gudang. Luas gudang adalah luas total yang diukur surveyor, sedangkan kapasitas gudang adalah kapasitas efektif dalam m³, yaitu luas digunakan dikalikan tinggi efektif dan utilisasi aman.",
    measured.length
      ? `Luas atau kapasitas gudang tercatat pada ${measured.length} dari ${storage.length} permohonan, dengan total luas ${nf(Math.round(totalArea))} m² dan total kapasitas ${nf(Math.round(totalCapacity))} m³.${withCapacity[0] ? ` Kapasitas terbesar dimiliki ${withCapacity[0].company} (${nf(Math.round(withCapacity[0].capacity ?? 0))} m³)${withCapacity[1] ? `, diikuti ${withCapacity.slice(1, 3).map((s) => `${s.company} (${nf(Math.round(s.capacity ?? 0))} m³)`).join(" dan ")}` : ""}.` : ""}${notMeasured.length ? ` Luas dan kapasitas gudang ${notMeasured.length} permohonan belum tercatat pada laporan survei.` : ""} (Gambar 6.4 dan Tabel 6.1).`
      : "Luas dan kapasitas gudang belum tercatat pada laporan survei gudang untuk permohonan periode ini.",
  ];
  const sub65 = [
    `Tabel 6.2 menyajikan persediaan setiap Perusahaan API-U: jumlah product line, product line berstok, persediaan per satuan, rencana impor, rasio persediaan terhadap rencana impor, dan jumlah gudang. Data lokasi dan kepemilikan gudang dianalisis pada Bab 9.`,
  ];

  const highlights = [
    `${withWords(companies.length)} Perusahaan API-U melaporkan persediaan untuk ${nf(lines.length)} product line; ${nf(zero.length)} product line (${pct1(zero.length, lines.length)}) dilaporkan dengan stok nol.`,
    `${noStock.length} dari ${companies.length} perusahaan (${pct1(noStock.length, companies.length)}) tidak memiliki persediaan pada saat pengajuan.`,
    `Total persediaan yang dilaporkan adalah ${joinId(unitText)}, setara ${pct1(stockByUnit[0], planByUnit[0])} dari total rencana impor dalam satuan ${unit}.`,
    top ? `Persediaan terbesar dilaporkan oleh ${top.company} sebesar ${nf(Math.round(top.stock[0]))} ${unit} (${pct1(top.stock[0], stockByUnit[0])} dari total persediaan ${unit}).` : "",
    measured.length ? `Laporan survei gudang mencatat total luas ${nf(Math.round(totalArea))} m² dan kapasitas ${nf(Math.round(totalCapacity))} m³ pada ${measured.length} dari ${storage.length} permohonan.` : "",
  ].filter(Boolean);

  return { ...empty, highlights, sub61, sub62, sub63, sub64, sub65, limits };
}
