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

export type StorageRow = { company: string; city: string; capacity: number | null; stock: number | null; plan: number | null; used: number | null; decision: string };

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

  // Kapasitas Gudang analysis: the Technical Analyst's figures sit on the application's first gudang.
  const appsWithLines = uniq(lines.map((l) => l.applicationId));
  const storage: StorageRow[] = appsWithLines.map((appId) => {
    const ws = ds.warehouses.filter((w) => w.applicationId === appId);
    const w = ws.find((x) => x.capacity !== null || x.analystStock !== null || x.analystPlan !== null) ?? ws[0];
    const capacity = w?.capacity ?? null;
    const stock = w?.analystStock ?? null;
    const plan = w?.analystPlan ?? null;
    return {
      company: lines.find((l) => l.applicationId === appId)?.company ?? "—", city: uniq(ws.map((x) => x.place.city).filter(Boolean)).join(", ") || "—",
      capacity, stock, plan, used: capacity ? ((stock ?? 0) + (plan ?? 0)) / capacity : null, decision: w?.analystDecision ?? "Belum Dianalisis",
    };
  }).sort((a, b) => (b.used ?? -1) - (a.used ?? -1));

  const unitCols = (vals: number[]) => units.map((_, i) => Math.round(vals[i] ?? 0));
  const companyHeaders = ["Perusahaan", "Product Line", "Line Berstok", ...units.map((u) => `Persediaan (${u})`), `Rencana Impor (${unit})`, "Persediaan ÷ Rencana", "Gudang"];
  const companyTable = companies.map((c) => [c.company, c.lines, c.stocked, ...unitCols(c.stock), Math.round(c.plan[0] ?? 0), c.ratio === null ? "—" : pct1(c.stock[0], c.plan[0]), c.warehouses]);
  const fmtM3 = (v: number | null) => (v === null ? "—" : nf(Math.round(v * 100) / 100));
  const storageTable = storage.map((s) => [s.company, s.city, fmtM3(s.capacity), fmtM3(s.stock), fmtM3(s.plan), s.used === null ? "—" : `${Math.round(s.used * 100)}%`, s.decision]);

  // Narrative -------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const limits = [
    "Persediaan merupakan data yang dilaporkan perusahaan per product line pada saat pengajuan dan verifikasi, dan tidak diperbarui setelah LHVIU terbit.",
    "Kapasitas gudang, stok terkini, dan volume pengajuan impor dalam satuan m³ diisi Technical Analyst pada analisis Kapasitas Gudang; satuannya berbeda dengan persediaan per product line sehingga tidak dibandingkan langsung.",
    "Kapasitas terpakai dihitung sebagai (stok terkini + volume pengajuan impor) ÷ kapasitas gudang, mengikuti analisis Technical Analyst.",
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
  const analysed = storage.filter((s) => s.capacity !== null);
  const over = analysed.filter((s) => (s.used ?? 0) > 1);
  const notAnalysed = storage.filter((s) => s.capacity === null);
  const tidakSesuai = storage.filter((s) => s.decision === "Tidak Sesuai");
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
    "Technical Analyst menilai kecukupan gudang dengan membandingkan stok terkini dan volume pengajuan impor terhadap kapasitas gudang API-U dalam satuan m³; pengajuan dinilai rasional bila kapasitas terpakai tidak melebihi 100%.",
    analysed.length
      ? `Analisis kapasitas gudang tersedia untuk ${analysed.length} dari ${storage.length} permohonan. ${over.length ? `${withWords(over.length)} permohonan memiliki kapasitas terpakai di atas 100%, yaitu ${joinId(over.map((s) => `${s.company} (${Math.round((s.used ?? 0) * 100)}%)`))}` : "Seluruh permohonan yang dianalisis memiliki kapasitas terpakai tidak lebih dari 100%"}${tidakSesuai.length ? `; ${tidakSesuai.length} permohonan dinyatakan tidak sesuai oleh analis` : ""}${notAnalysed.length ? `. Kapasitas gudang ${notAnalysed.length} permohonan belum dianalisis` : ""} (Gambar 6.4 dan Tabel 6.1).`
      : "Analisis kapasitas gudang oleh Technical Analyst belum tersedia untuk permohonan pada periode ini.",
  ];
  const sub65 = [
    `Tabel 6.2 menyajikan persediaan setiap Perusahaan API-U: jumlah product line, product line berstok, persediaan per satuan, rencana impor, rasio persediaan terhadap rencana impor, dan jumlah gudang. Data lokasi dan kepemilikan gudang dianalisis pada Bab 9.`,
  ];

  const highlights = [
    `${withWords(companies.length)} Perusahaan API-U melaporkan persediaan untuk ${nf(lines.length)} product line; ${nf(zero.length)} product line (${pct1(zero.length, lines.length)}) dilaporkan dengan stok nol.`,
    `${noStock.length} dari ${companies.length} perusahaan (${pct1(noStock.length, companies.length)}) tidak memiliki persediaan pada saat pengajuan.`,
    `Total persediaan yang dilaporkan adalah ${joinId(unitText)}, setara ${pct1(stockByUnit[0], planByUnit[0])} dari total rencana impor dalam satuan ${unit}.`,
    top ? `Persediaan terbesar dilaporkan oleh ${top.company} sebesar ${nf(Math.round(top.stock[0]))} ${unit} (${pct1(top.stock[0], stockByUnit[0])} dari total persediaan ${unit}).` : "",
    analysed.length ? `Kapasitas terpakai gudang ${over.length} dari ${analysed.length} permohonan yang dianalisis melebihi 100%.` : "",
  ].filter(Boolean);

  return { ...empty, highlights, sub61, sub62, sub63, sub64, sub65, limits };
}
