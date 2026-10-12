import { VIU_NON_INDUSTRI_KBLI } from "../../../schemes/viu-bahan-baku-non-industri/terms";
import { lhviuStatus } from "../derive";
import { compact, countBy, fd, fdLong, joinId, nf, sum, topN, uniq, withWords } from "../format";
import { concentrationOf, type Dimension } from "../report-bab8";
import { MATERIALITY_LABEL, materialityOf } from "../summary";
import type { P47Place, P47Report, Status } from "../types";
import type { NonIndustriDataset, NonIndustriLine, NonIndustriModuleKey } from "./types";

/*
 * Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Non Industri (Pelaporan Pasal 47 Permenperin
 * 27/2025): ten chapters in the structure of the Barang Konsumsi report, each a list of blocks (sub-heads,
 * paragraphs, figures, tables, highlights, limits) that the printable report lays out on A4 pages.
 * Every figure is counted from the dataset; what the system does not hold (price, origin country, mitra
 * identity) is stated as absent rather than estimated.
 */

export const SUBJECT = "Bahan Baku/Penolong Perusahaan Non Industri";
export const SOURCE = "Sistem Verifikasi Impor, diolah";
const BASIS = "Pasal 37 ayat (2) huruf b";
const KBLI = new Set<string>(VIU_NON_INDUSTRI_KBLI);
const UNKNOWN = "Tidak diisi";

export type Seg = { label: string; value: number };
export type Fig =
  | { k: "kpis"; tiles: [string, string, string][] }
  | { k: "hbar"; rows: { key: string; desc?: string; value: number }[]; total?: number; keyWidth?: number; unit?: string }
  | { k: "donuts"; items: { cap: string; center: string; sub: string; segs: Seg[] }[] }
  | { k: "columns"; items: Seg[] };
export type Block =
  | { t: "sub"; num: string; title: string }
  | { t: "p"; text: string }
  | { t: "fig"; num: string; title: string; source: string; fig: Fig }
  | { t: "table"; num: string; title: string; headers: string[]; rows: (string | number)[][]; source: string }
  | { t: "highlights"; items: string[] }
  | { t: "limits"; items: string[] };
export type Chapter = { n: number; title: string; lead: string; scope: string[]; stats: [string, string][]; blocks: Block[] };

export type NonIndustriReportModel = {
  chapters: Chapter[];
  intro: string[];
  summary: { tiles: [string, string, string][]; highlights: string[]; alerts: string[] };
  conclusion: { title: string; paragraphs: string[] }[];
};

// Helpers ---------------------------------------------------------------------------------------------
const periodText = (ds: NonIndustriDataset) => `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
const ratio = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1).replace(".", ",")}%` : "—");
const ranked = (items: string[], n = 99) => topN(countBy(items, (x) => x), n);
const own = (segs: Seg[], label: string) => segs.find((s) => s.label === label)?.value ?? 0;
const segsOf = (items: string[], order: string[] = []): Seg[] => {
  const counts = countBy(items, (x) => x);
  const keys = [...order.filter((o) => counts.has(o)), ...[...counts.keys()].filter((k) => !order.includes(k)).sort()];
  return keys.map((label) => ({ label, value: counts.get(label) ?? 0 }));
};
const title = (s: string) => s.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const loc = (p: P47Place | null | undefined) => (p ? [title(p.city), title(p.province)].filter(Boolean).join(", ") || "—" : "—");
const statusCounts = (xs: Status[]) => segsOf(xs.map((s) => s.label), ["Sesuai", "Tidak Sesuai", "Belum Dianalisis"]);
const phraseCounts = (segs: Seg[], noun: string) => joinId(segs.map((s) => `${s.value} ${noun} ${s.label.toLowerCase()}`));

/** The unit most product lines use; volumes are only compared within this unit. */
export function dominantUnit(lines: NonIndustriLine[]): string {
  return ranked(lines.map((l) => l.unit).filter(Boolean), 1)[0]?.[0] ?? "";
}

export type HsRow = { hs: string; chapter: string; description: string; companies: number; lines: number; quantity: number; unit: string };
/** One row per HS; the quantity is summed only within one unit, otherwise NaN ("satuan berbeda"). */
export function hsRows(lines: NonIndustriLine[]): HsRow[] {
  const byHs = new Map<string, NonIndustriLine[]>();
  for (const l of lines) byHs.set(l.hs || "—", [...(byHs.get(l.hs || "—") ?? []), l]);
  return [...byHs.entries()]
    .map(([hs, ls]) => {
      const units = uniq(ls.map((l) => l.unit || "—"));
      return {
        hs, chapter: hs === "—" ? "—" : hs.replace(/\D/g, "").slice(0, 2), description: ls.find((l) => l.hsDescription)?.hsDescription ?? "",
        companies: uniq(ls.map((l) => l.applicationId)).length, lines: ls.length,
        quantity: units.length === 1 ? sum(ls.map((l) => l.quantity)) : Number.NaN, unit: units.length === 1 ? (units[0] === "—" ? "" : units[0]) : units.join(" / "),
      };
    })
    .sort((a, b) => (Number.isNaN(b.quantity) ? -1 : b.quantity) - (Number.isNaN(a.quantity) ? -1 : a.quantity) || b.lines - a.lines || a.hs.localeCompare(b.hs));
}

/** Volume per application in the dominant unit, plus the units it also uses. */
function volumeByApp(ds: NonIndustriDataset, unit: string) {
  return ds.applications.map((a) => {
    const ls = ds.lines.filter((l) => l.applicationId === a.id);
    return {
      app: a, lines: ls.length, hs: uniq(ls.map((l) => l.hs).filter(Boolean)).length,
      volume: sum(ls.filter((l) => l.unit === unit).map((l) => l.quantity)), otherUnits: uniq(ls.map((l) => l.unit).filter((u) => u && u !== unit)),
    };
  }).sort((a, b) => b.volume - a.volume || a.app.company.localeCompare(b.app.company));
}

// Chapters ---------------------------------------------------------------------------------------------
function bab1(ds: NonIndustriDataset): Chapter {
  const apps = ds.applications;
  const companies = uniq(apps.map((a) => a.companyId ?? a.company));
  const gudang = apps.flatMap((a) => a.gudang);
  const lhviu = segsOf(apps.map((a) => lhviuStatus(a).label), ["Terbit", "Belum Diunggah", "Dalam Proses"]);
  const kbli = new Map<string, { code: string; description: string; companies: string[] }>();
  for (const a of apps) for (const k of a.kbli) {
    if (!k.code) continue;
    const row = kbli.get(k.code) ?? { code: k.code, description: k.description, companies: [] };
    if (!row.companies.includes(a.company)) row.companies.push(a.company);
    kbli.set(k.code, row);
  }
  const kbliList = [...kbli.values()].sort((a, b) => b.companies.length - a.companies.length || a.code.localeCompare(b.code));
  const matching = apps.filter((a) => a.kbli.some((k) => KBLI.has(k.code)));
  const dates = apps.map((a) => a.submittedAt).filter(Boolean).sort();
  const blocks: Block[] = [{ t: "sub", num: "1.1", title: "Profil Perusahaan API-U" }];
  if (!apps.length) {
    blocks.push({ t: "p", text: `Pada periode ${periodText(ds)} belum terdapat Perusahaan API-U yang mengajukan VIU ${SUBJECT}, sehingga bab ini tidak memuat data perusahaan.` });
  } else {
    blocks.push(
      { t: "p", text: `Bab ini menyajikan profil Perusahaan API-U yang mengajukan Verifikasi Importir Umum (VIU) ${SUBJECT} pada periode ${periodText(ds)}. Tercatat ${withWords(companies.length)} Perusahaan API-U dengan ${withWords(apps.length)} permohonan, diajukan sejak ${fdLong(dates[0])}${dates.length > 1 && dates.at(-1) !== dates[0] ? ` hingga ${fdLong(dates.at(-1)!)}` : ""}. Data bersumber dari profil perusahaan dan data permohonan yang disampaikan melalui sistem.` },
      { t: "fig", num: "1.1", title: "Ikhtisar Perusahaan API-U", source: SOURCE, fig: { k: "kpis", tiles: [
        [String(companies.length), "PERUSAHAAN API-U", "mengajukan VIU Non Industri"],
        [String(apps.length), "PERMOHONAN", "dalam periode laporan"],
        [`${own(lhviu, "Terbit")}/${apps.length}`, "LHVIU TERBIT", "file LHVIU diunggah"],
        [String(gudang.length), "GUDANG", "dilaporkan pada permohonan"],
      ] } },
    );
  }
  blocks.push({ t: "sub", num: "1.2", title: "Kesesuaian KBLI Utama" });
  blocks.push({ t: "p", text: apps.length
    ? `Sesuai ${BASIS} angka 2 huruf b) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, Perusahaan API-U yang mengimpor bahan baku/penolong untuk Perusahaan Non Industri harus memiliki KBLI Utama perdagangan besar ${joinId([...KBLI])}. ${matching.length} dari ${apps.length} permohonan diajukan perusahaan yang memiliki KBLI Utama tersebut${matching.length === apps.length ? "." : `; ${apps.length - matching.length} permohonan lainnya perlu dikonfirmasi kesesuaiannya (${joinId(apps.filter((a) => !matching.includes(a)).map((a) => a.company))}).`}`
    : "Belum ada KBLI Utama yang dapat dinilai pada periode ini." });
  blocks.push({ t: "table", num: "1.1", title: "KBLI Utama Perusahaan API-U", headers: ["Kode KBLI", "Uraian", "Jumlah Perusahaan", "Termasuk Persyaratan"], rows: kbliList.map((k) => [k.code, k.description, k.companies.length, KBLI.has(k.code) ? "Ya" : "Tidak"]), source: `${SOURCE}. Persyaratan menurut ${BASIS} angka 2 huruf b).` });
  blocks.push({ t: "sub", num: "1.3", title: "Daftar Perusahaan API-U dan Status LHVIU" });
  blocks.push({ t: "p", text: apps.length
    ? `Status Laporan Hasil Verifikasi Importir Umum (LHVIU) atas ${apps.length} permohonan: ${phraseCounts(lhviu, "permohonan")}. Status ditentukan dari file LHVIU yang diunggah Project Manager; nomor dan tanggal terbit dicantumkan bila telah dicatat. Permohonan dimasukkan ke periode laporan menurut Tanggal Terbit LHVIU, atau Tanggal Pengajuan bila LHVIU belum dicatat.`
    : "Belum ada LHVIU pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "1.2", title: "Status LHVIU", source: SOURCE, fig: { k: "donuts", items: [{ cap: "Status LHVIU per permohonan", center: String(apps.length), sub: "permohonan", segs: lhviu }] } });
  blocks.push({ t: "table", num: "1.2", title: "Daftar Perusahaan API-U dan Status LHVIU", headers: ["Perusahaan", "NIB", "Tanggal Pengajuan", "Nomor LHVIU", "Tanggal Terbit", "Status LHVIU"],
    rows: [...apps].sort((a, b) => a.company.localeCompare(b.company)).map((a) => [a.company, a.nib || "—", fd(a.submittedAt), a.lhviu?.number ?? "—", fd(a.lhviu?.issuedAt), lhviuStatus(a).label]), source: SOURCE });
  const highlights = apps.length ? [
    `${withWords(companies.length)} Perusahaan API-U mengajukan ${apps.length} permohonan VIU Non Industri.`,
    `${matching.length} dari ${apps.length} permohonan diajukan perusahaan dengan KBLI Utama yang dipersyaratkan.`,
    `${own(lhviu, "Terbit")} dari ${apps.length} LHVIU telah terbit.`,
  ] : [];
  if (highlights.length) blocks.push({ t: "highlights", items: highlights });
  blocks.push({ t: "limits", items: ["KBLI Utama mengikuti profil perusahaan pada sistem.", "Nomor dan tanggal terbit LHVIU mengikuti data yang dicatat Project Manager pada tab LHVIU."] });
  return { n: 1, title: "Data Perusahaan API-U", lead: "Profil Perusahaan API-U pelaksana VIU Bahan Baku/Penolong Perusahaan Non Industri: KBLI Utama dan status LHVIU.", scope: ["Profil perusahaan", "Kesesuaian KBLI Utama", "Status LHVIU"], stats: [[String(companies.length), "Perusahaan API-U"], [String(apps.length), "Permohonan"], [String(own(lhviu, "Terbit")), "LHVIU terbit"]], blocks };
}

function bab2(ds: NonIndustriDataset): Chapter {
  const rows = hsRows(ds.lines);
  const unit = dominantUnit(ds.lines);
  const materials = uniq(ds.lines.map((l) => l.material.toLowerCase()));
  const chapters = ranked(rows.flatMap((r) => Array<string>(r.lines).fill(r.chapter)));
  const topVol = rows.filter((r) => r.unit === unit && r.quantity > 0).slice(0, 10);
  const blocks: Block[] = [{ t: "sub", num: "2.1", title: "Ragam Bahan Baku/Penolong" }];
  if (!ds.lines.length) {
    blocks.push({ t: "p", text: `Pada periode ${periodText(ds)} belum terdapat bahan baku/penolong yang diajukan.` });
  } else {
    blocks.push({ t: "p", text: `Permohonan pada periode ini memuat ${withWords(ds.lines.length)} product line bahan baku/penolong yang terdiri atas ${withWords(materials.length)} jenis material dan ${withWords(rows.length)} pos tarif/HS. Pos tarif terbanyak berada pada Bab ${joinId(chapters.slice(0, 3).map(([c, n]) => `${c} (${n} product line)`))} Buku Tarif Kepabeanan Indonesia (BTKI).` });
    blocks.push({ t: "fig", num: "2.1", title: "Product Line menurut Bab HS (BTKI)", source: `${SOURCE}. Bab HS = dua digit pertama pos tarif.`, fig: { k: "hbar", rows: chapters.slice(0, 10).map(([c, n]) => ({ key: `Bab ${c}`, value: n })), total: ds.lines.length, keyWidth: 70 } });
  }
  blocks.push({ t: "sub", num: "2.2", title: "Rencana Kebutuhan per Pos Tarif/HS" });
  blocks.push({ t: "p", text: topVol.length
    ? `Rencana kebutuhan dijumlahkan hanya di dalam satu pos tarif dengan satuan yang sama. Dalam satuan ${unit} (satuan yang paling banyak digunakan), rencana kebutuhan terbesar terdapat pada pos tarif ${joinId(topVol.slice(0, 3).map((r) => `${r.hs} (${nf(r.quantity)} ${unit})`))}. Total rencana kebutuhan dalam satuan ${unit} sebesar ${nf(sum(ds.lines.filter((l) => l.unit === unit).map((l) => l.quantity)))} ${unit}.`
    : "Belum ada rencana kebutuhan yang dapat dijumlahkan." });
  if (topVol.length) blocks.push({ t: "fig", num: "2.2", title: `Sepuluh Pos Tarif/HS dengan Rencana Kebutuhan Terbesar (${unit})`, source: `${SOURCE}. Hanya product line dalam satuan ${unit}.`, fig: { k: "hbar", rows: topVol.map((r) => ({ key: r.hs, desc: r.description, value: r.quantity })), keyWidth: 90, unit } });
  blocks.push({ t: "table", num: "2.1", title: "Rencana Kebutuhan per Pos Tarif/HS", headers: ["Pos Tarif/HS", "Uraian Barang", "Jumlah API-U", "Product Line", "Rencana Kebutuhan", "Satuan"],
    rows: rows.map((r) => [r.hs, r.description || "—", r.companies, r.lines, Number.isNaN(r.quantity) ? "Satuan berbeda" : r.quantity, r.unit || "—"]), source: SOURCE });
  blocks.push({ t: "sub", num: "2.3", title: "Jenis Material" });
  const byMaterial = new Map<string, NonIndustriLine[]>();
  for (const l of ds.lines) byMaterial.set(l.material, [...(byMaterial.get(l.material) ?? []), l]);
  const matRows = [...byMaterial.entries()].map(([m, ls]) => {
    const units = uniq(ls.map((l) => l.unit || "—"));
    return [m, joinId(uniq(ls.map((l) => l.hs).filter(Boolean)).slice(0, 3)) || "—", uniq(ls.map((l) => l.applicationId)).length, units.length === 1 ? sum(ls.map((l) => l.quantity)) : "Satuan berbeda", units.join(" / ")] as (string | number)[];
  }).sort((a, b) => Number(b[2]) - Number(a[2]) || String(a[0]).localeCompare(String(b[0])));
  blocks.push({ t: "p", text: matRows.length ? `Jenis material yang paling banyak diajukan adalah ${joinId(matRows.slice(0, 3).map((r) => `${r[0]} (${r[2]} permohonan)`))}.` : "Belum ada jenis material yang diajukan." });
  blocks.push({ t: "table", num: "2.2", title: "Jenis Material Bahan Baku/Penolong", headers: ["Jenis Material", "Pos Tarif/HS", "Jumlah Permohonan", "Rencana Kebutuhan", "Satuan"], rows: matRows, source: SOURCE });
  if (ds.lines.length) blocks.push({ t: "highlights", items: [
    `${ds.lines.length} product line pada ${rows.length} pos tarif/HS dan ${materials.length} jenis material.`,
    topVol[0] ? `Rencana kebutuhan terbesar pada pos tarif ${topVol[0].hs}: ${nf(topVol[0].quantity)} ${unit}.` : "",
  ].filter(Boolean) });
  blocks.push({ t: "limits", items: ["Rencana kebutuhan merupakan rencana yang diajukan pemohon, bukan realisasi impor.", "Kuantitas dengan satuan berbeda tidak dijumlahkan.", "Sistem tidak menghimpun harga dan negara asal bahan baku/penolong, sehingga analisis nilai dan negara asal tidak disajikan."] });
  return { n: 2, title: "Bahan Baku & Pos Tarif/HS", lead: "Bahan baku/penolong yang diajukan menurut pos tarif/HS, Bab BTKI dan jenis material.", scope: ["Ragam bahan baku/penolong", "Rencana kebutuhan per pos tarif", "Jenis material"], stats: [[String(ds.lines.length), "Product line"], [String(rows.length), "Pos tarif/HS"], [String(materials.length), "Jenis material"]], blocks };
}

function bab3(ds: NonIndustriDataset): Chapter {
  const uses = ranked(ds.lines.map((l) => l.intendedUse || UNKNOWN));
  const needs = ds.needs;
  const needStatus = statusCounts(needs.map((n) => n.status));
  const withNeed = needs.filter((n) => n.contractNeed !== null);
  const cover = (n: (typeof needs)[number]) => (n.contractNeed ? ((n.stock ?? 0) + (n.requested ?? 0)) / n.contractNeed : null);
  const over = withNeed.filter((n) => (cover(n) ?? 0) > 1);
  const blocks: Block[] = [{ t: "sub", num: "3.1", title: "Peruntukan Bahan Baku/Penolong" }];
  blocks.push({ t: "p", text: ds.lines.length
    ? `Bahan baku/penolong VIU Non Industri diimpor untuk digunakan oleh Perusahaan Non Industri mitra. Peruntukan yang dinyatakan pemohon paling banyak adalah ${joinId(uses.slice(0, 3).map(([u, n]) => `${u.toLowerCase()} (${n} product line)`))}${own(uses.map(([label, value]) => ({ label, value })), UNKNOWN) ? `; ${own(uses.map(([label, value]) => ({ label, value })), UNKNOWN)} product line belum mencantumkan peruntukan` : ""}.`
    : "Belum ada peruntukan bahan baku/penolong yang dinyatakan pada periode ini." });
  if (ds.lines.length) blocks.push({ t: "fig", num: "3.1", title: "Peruntukan Bahan Baku/Penolong", source: `${SOURCE}. Peruntukan sebagaimana diisi pemohon.`, fig: { k: "hbar", rows: uses.slice(0, 8).map(([u, n]) => ({ key: u, value: n })), total: ds.lines.length, keyWidth: 200 } });
  blocks.push({ t: "sub", num: "3.2", title: "Kebutuhan Mitra Non Industri terhadap Rencana Impor" });
  blocks.push({ t: "p", text: needs.length
    ? `Technical Analyst menilai kesesuaian rencana impor API-U terhadap kebutuhan Perusahaan Non Industri mitra sesuai kontrak (Pasal 39 ayat (4) huruf d). Hasilnya: ${phraseCounts(needStatus, "permohonan")}. ${withNeed.length ? `Kebutuhan kontrak tercatat pada ${withNeed.length} permohonan; ${over.length ? `${over.length} permohonan memiliki stok ditambah volume permohonan yang melebihi kebutuhan kontrak (${joinId(over.map((n) => n.company))}).` : "seluruhnya memiliki stok ditambah volume permohonan yang tidak melebihi kebutuhan kontrak."}` : "Kebutuhan kontrak belum diisi pada analisis teknis."}`
    : "Belum ada analisis kebutuhan mitra non industri pada periode ini." });
  if (needs.length) blocks.push({ t: "fig", num: "3.2", title: "Hasil Analisis Kebutuhan Mitra Non Industri", source: `${SOURCE}. Keputusan Technical Analyst.`, fig: { k: "donuts", items: [{ cap: "Kesesuaian rencana impor dengan kebutuhan mitra", center: String(needs.length), sub: "permohonan", segs: needStatus }] } });
  blocks.push({ t: "table", num: "3.1", title: "Kebutuhan Mitra Non Industri, Stok dan Volume Permohonan", headers: ["Perusahaan", "Pos Tarif/HS", "Kebutuhan Kontrak", "Stok Terkini", "Volume Permohonan", "Cakupan Kebutuhan", "Keputusan"],
    rows: needs.map((n) => [n.company, n.hs || "—", n.contractNeed ?? "—", n.stock ?? "—", n.requested ?? "—", cover(n) === null ? "—" : ratio(cover(n)!, 1), n.status.label]), source: `${SOURCE}. Cakupan = (stok + volume permohonan) ÷ kebutuhan kontrak.` });
  blocks.push({ t: "sub", num: "3.3", title: "Identitas Perusahaan Non Industri Mitra" });
  blocks.push({ t: "p", text: "Pasal 39 ayat (4) huruf c mensyaratkan LHVIU memuat identitas Perusahaan Non Industri mitra (nama, alamat, NIB dan KBLI) beserta kontrak kerja sama dan/atau kontrak jual beli dengan masa perjanjian paling singkat 1 (satu) tahun. Data mitra tersebut diperiksa pada verifikasi dokumen dan dicantumkan pada LHVIU masing-masing permohonan; sistem belum menghimpunnya sebagai data terstruktur, sehingga rekapitulasi mitra per perusahaan belum dapat disajikan dalam laporan ini." });
  if (needs.length) blocks.push({ t: "highlights", items: [`${own(needStatus, "Sesuai")} dari ${needs.length} permohonan dinilai sesuai dengan kebutuhan mitra non industri.`, over.length ? `${over.length} permohonan memiliki stok dan volume permohonan melebihi kebutuhan kontrak.` : ""].filter(Boolean) });
  blocks.push({ t: "limits", items: ["Kebutuhan kontrak, stok dan volume permohonan mengikuti isian Technical Analyst pada modul Kebutuhan Mitra Non Industri.", "Identitas mitra non industri belum tersedia sebagai data terstruktur pada sistem."] });
  return { n: 3, title: "Peruntukan & Kebutuhan Mitra Non Industri", lead: "Peruntukan bahan baku/penolong dan kesesuaian rencana impor dengan kebutuhan Perusahaan Non Industri mitra.", scope: ["Peruntukan bahan baku", "Kebutuhan mitra vs rencana impor", "Identitas mitra"], stats: [[String(uses.length), "Peruntukan"], [String(needs.length), "Analisis kebutuhan"], [String(own(needStatus, "Sesuai")), "Sesuai"]], blocks };
}

function bab4(ds: NonIndustriDataset): Chapter {
  const unit = dominantUnit(ds.lines);
  const perApp = volumeByApp(ds, unit);
  const total = sum(perApp.map((r) => r.volume));
  const months = new Map<string, number>();
  for (const a of ds.applications) if (a.lhviu?.issuedAt) months.set(a.lhviu.issuedAt.slice(0, 7), (months.get(a.lhviu.issuedAt.slice(0, 7)) ?? 0) + 1);
  const monthItems = [...months.entries()].sort().map(([k, v]) => ({ label: fd(`${k}-01`).split(" ").slice(1).join(" "), value: v }));
  const blocks: Block[] = [{ t: "sub", num: "4.1", title: "Rencana Volume Impor per Perusahaan" }];
  blocks.push({ t: "p", text: total
    ? `Dalam satuan ${unit}, total rencana volume impor sebesar ${nf(total)} ${unit}. Rencana terbesar diajukan oleh ${joinId(perApp.slice(0, 3).map((r) => `${r.app.company} (${nf(r.volume)} ${unit}, ${ratio(r.volume, total)})`))}. Rencana dalam satuan lain disebutkan pada kolom Satuan Lain dan tidak dijumlahkan.`
    : "Belum ada rencana volume impor yang dapat dijumlahkan pada periode ini." });
  if (total) blocks.push({ t: "fig", num: "4.1", title: `Rencana Volume Impor per Perusahaan API-U (${unit})`, source: `${SOURCE}. Hanya product line dalam satuan ${unit}.`, fig: { k: "hbar", rows: perApp.filter((r) => r.volume > 0).slice(0, 10).map((r) => ({ key: r.app.company, desc: `${r.lines} product line · ${r.hs} pos tarif`, value: r.volume })), total, keyWidth: 200, unit } });
  blocks.push({ t: "table", num: "4.1", title: "Rencana Volume Impor per Perusahaan API-U", headers: ["Perusahaan", "Nomor Permohonan", "Product Line", "Pos Tarif/HS", `Rencana Volume (${unit || "—"})`, "Satuan Lain"],
    rows: perApp.map((r) => [r.app.company, r.app.applicationNumber, r.lines, r.hs, r.volume, r.otherUnits.join(", ") || "—"]), source: SOURCE });
  blocks.push({ t: "sub", num: "4.2", title: "Penerbitan LHVIU menurut Bulan" });
  blocks.push({ t: "p", text: monthItems.length ? `LHVIU dengan tanggal terbit tercatat diterbitkan pada ${monthItems.length} bulan berbeda; terbanyak pada ${[...monthItems].sort((a, b) => b.value - a.value)[0].label} (${[...monthItems].sort((a, b) => b.value - a.value)[0].value} LHVIU).` : "Belum ada LHVIU dengan tanggal terbit yang tercatat." });
  if (monthItems.length) blocks.push({ t: "fig", num: "4.2", title: "Jumlah LHVIU menurut Bulan Terbit", source: `${SOURCE}. Menurut Tanggal Terbit LHVIU.`, fig: { k: "columns", items: monthItems } });
  if (total) blocks.push({ t: "highlights", items: [`Total rencana volume impor ${nf(total)} ${unit}.`, `Perusahaan dengan rencana terbesar: ${perApp[0].app.company} (${ratio(perApp[0].volume, total)}).`] });
  blocks.push({ t: "limits", items: ["Rencana volume merupakan rencana yang diajukan pemohon, bukan realisasi impor."] });
  return { n: 4, title: "Rencana Volume Impor", lead: "Rencana volume impor bahan baku/penolong per Perusahaan API-U dan sebaran penerbitan LHVIU.", scope: ["Rencana volume per perusahaan", "Penerbitan LHVIU per bulan"], stats: [[compact(total), `Rencana (${unit || "—"})`], [String(perApp.length), "Permohonan"]], blocks };
}

const MODULE_LABEL: Record<NonIndustriModuleKey, string> = { kebutuhanNonIndustri: "Kebutuhan Mitra Non Industri", penyimpanan: "Kapasitas Gudang API-U", modal: "Kepemilikan Modal API-U" };

function bab5(ds: NonIndustriDataset): Chapter {
  const keys: NonIndustriModuleKey[] = ["kebutuhanNonIndustri", "penyimpanan", "modal"];
  const per = keys.map((k) => ({ k, segs: statusCounts(ds.analysis.filter((x) => x.moduleKey === k).map((x) => x.status)) }));
  const apps = ds.applications;
  const allOk = apps.filter((a) => keys.every((k) => ds.analysis.find((x) => x.applicationId === a.id && x.moduleKey === k)?.status.label === "Sesuai"));
  const notOk = ds.analysis.filter((x) => x.status.label === "Tidak Sesuai");
  const blocks: Block[] = [{ t: "sub", num: "5.1", title: "Hasil Analisis Teknis per Modul" }];
  blocks.push({ t: "p", text: apps.length
    ? `Analisis teknis VIU Non Industri terdiri atas tiga modul: kesesuaian rencana impor dengan kebutuhan Perusahaan Non Industri mitra, kapasitas gudang API-U, dan kepemilikan modal API-U. ${per.map((p) => `Pada modul ${MODULE_LABEL[p.k]}, ${phraseCounts(p.segs, "permohonan")}`).join(". ")}. ${allOk.length} dari ${apps.length} permohonan dinyatakan sesuai pada ketiga modul.`
    : "Belum ada analisis teknis pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "5.1", title: "Keputusan Technical Analyst per Modul", source: `${SOURCE}. Keputusan modul analisis teknis.`, fig: { k: "donuts", items: per.map((p) => ({ cap: MODULE_LABEL[p.k], center: String(sum(p.segs.map((s) => s.value))), sub: "permohonan", segs: p.segs })) } });
  blocks.push({ t: "table", num: "5.1", title: "Keputusan Analisis Teknis per Permohonan", headers: ["Perusahaan", "Nomor Permohonan", ...keys.map((k) => MODULE_LABEL[k])],
    rows: apps.map((a) => [a.company, a.applicationNumber, ...keys.map((k) => ds.analysis.find((x) => x.applicationId === a.id && x.moduleKey === k)?.status.label ?? "—")]), source: SOURCE });
  blocks.push({ t: "sub", num: "5.2", title: "Kesimpulan Analisis Teknis" });
  const concl = ds.analysis.filter((x) => x.conclusion);
  blocks.push({ t: "p", text: notOk.length ? `${notOk.length} keputusan modul dinyatakan Tidak Sesuai, yaitu ${joinId(notOk.map((x) => `${x.company} (${MODULE_LABEL[x.moduleKey]})`))}. Kesimpulan Technical Analyst disajikan pada Tabel 5.2.` : concl.length ? "Tidak ada modul yang dinyatakan Tidak Sesuai. Kesimpulan Technical Analyst disajikan pada Tabel 5.2." : "Belum ada kesimpulan analisis teknis yang dicatat." });
  if (concl.length) blocks.push({ t: "table", num: "5.2", title: "Kesimpulan Technical Analyst", headers: ["Perusahaan", "Modul", "Keputusan", "Kesimpulan"], rows: concl.map((x) => [x.company, MODULE_LABEL[x.moduleKey], x.status.label, x.conclusion]), source: SOURCE });
  if (apps.length) blocks.push({ t: "highlights", items: [`${allOk.length} dari ${apps.length} permohonan sesuai pada ketiga modul analisis teknis.`, notOk.length ? `${notOk.length} keputusan modul Tidak Sesuai.` : "Tidak ada keputusan modul Tidak Sesuai."] });
  blocks.push({ t: "limits", items: ["Keputusan dan kesimpulan mengikuti hasil analisis teknis yang disimpan Technical Analyst; modul yang belum dianalisis dicatat sebagai Belum Dianalisis."] });
  return { n: 5, title: "Analisis Teknis", lead: "Keputusan Technical Analyst atas kebutuhan mitra non industri, kapasitas gudang dan kepemilikan modal.", scope: ["Hasil per modul", "Kesimpulan analisis teknis"], stats: [[String(allOk.length), "Sesuai 3 modul"], [String(notOk.length), "Modul tidak sesuai"]], blocks };
}

function bab6(ds: NonIndustriDataset): Chapter {
  const wh = ds.warehouses;
  const byApp = ds.applications.map((a) => {
    const g = wh.filter((w) => w.applicationId === a.id);
    const area = g.some((w) => w.area) ? sum(g.map((w) => w.area ?? 0)) : null;
    const capacity = g.some((w) => w.capacity) ? sum(g.map((w) => w.capacity ?? 0)) : null;
    return { a, g, area, capacity, cities: uniq(g.map((w) => title(w.city)).filter(Boolean)) };
  }).sort((x, y) => (y.capacity ?? -1) - (x.capacity ?? -1));
  const measured = byApp.filter((r) => r.capacity);
  const ta = wh.filter((w) => w.analystCapacity !== null);
  const util = (w: (typeof wh)[number]) => (w.analystCapacity ? ((w.analystStock ?? 0) + (w.analystPlan ?? 0)) / w.analystCapacity : null);
  const overCap = ta.filter((w) => (util(w) ?? 0) > 1);
  const blocks: Block[] = [{ t: "sub", num: "6.1", title: "Luas dan Kapasitas Gudang menurut Laporan Survei" }];
  blocks.push({ t: "p", text: wh.length
    ? `Perusahaan API-U melaporkan ${withWords(wh.length)} gudang. Surveyor mengukur kapasitas efektif (luas digunakan × tinggi efektif × utilisasi aman) pada gudang ${measured.length} dari ${byApp.length} permohonan${measured.length ? `, dengan total ${nf(sum(measured.map((r) => r.capacity ?? 0)))} m³ dan luas ${nf(sum(byApp.map((r) => r.area ?? 0)))} m²` : ""}. ${measured[0] ? `Kapasitas terbesar dimiliki ${measured[0].a.company} (${nf(measured[0].capacity ?? 0)} m³).` : ""}`
    : "Belum ada gudang yang dilaporkan pada periode ini." });
  if (measured.length) blocks.push({ t: "fig", num: "6.1", title: "Sepuluh Permohonan dengan Kapasitas Gudang Terbesar (m³)", source: `${SOURCE}. Laporan survei gudang.`, fig: { k: "hbar", rows: measured.slice(0, 10).map((r) => ({ key: r.a.company, desc: `${nf(r.area ?? 0)} m² · ${r.cities.join(", ") || "—"}`, value: r.capacity ?? 0 })), keyWidth: 200, unit: "m³" } });
  blocks.push({ t: "table", num: "6.1", title: "Luas dan Kapasitas Gudang menurut Laporan Survei Gudang", headers: ["Perusahaan", "Kota Gudang", "Jumlah Gudang", "Luas Gudang (m²)", "Kapasitas Gudang (m³)"],
    rows: byApp.map((r) => [r.a.company, r.cities.join(", ") || "—", r.g.length, r.area ?? "—", r.capacity ?? "—"]), source: `${SOURCE}. Gudang yang belum disurvei ditandai "—".` });
  blocks.push({ t: "sub", num: "6.2", title: "Kapasitas Gudang terhadap Stok dan Rencana Impor" });
  blocks.push({ t: "p", text: ta.length
    ? `Technical Analyst membandingkan kapasitas gudang dengan stok terkini ditambah volume pengajuan impor pada ${ta.length} permohonan. ${overCap.length ? `${overCap.length} permohonan memiliki stok dan rencana impor melebihi kapasitas gudang (${joinId(overCap.map((w) => w.company))}).` : "Seluruhnya memiliki stok dan rencana impor dalam batas kapasitas gudang."}`
    : "Belum ada analisis kapasitas gudang oleh Technical Analyst pada periode ini." });
  blocks.push({ t: "table", num: "6.2", title: "Analisis Kapasitas Gudang oleh Technical Analyst", headers: ["Perusahaan", "Kapasitas (m³)", "Stok Terkini (m³)", "Rencana Impor (m³)", "Utilisasi", "Keputusan"],
    rows: ta.map((w) => [w.company, w.analystCapacity ?? "—", w.analystStock ?? "—", w.analystPlan ?? "—", util(w) === null ? "—" : ratio(util(w)!, 1), w.analystDecision.label]), source: `${SOURCE}. Utilisasi = (stok + rencana impor) ÷ kapasitas.` });
  if (wh.length) blocks.push({ t: "highlights", items: [`${measured.length} dari ${byApp.length} permohonan memiliki kapasitas gudang terukur pada laporan survei.`, overCap.length ? `${overCap.length} permohonan melebihi kapasitas gudang menurut Technical Analyst.` : "Tidak ada permohonan yang melebihi kapasitas gudang menurut Technical Analyst."] });
  blocks.push({ t: "limits", items: ["Luas dan kapasitas mengikuti laporan survei gudang; gudang yang belum disurvei tidak memiliki angka.", "Kapasitas, stok dan rencana impor pada Tabel 6.2 mengikuti isian Technical Analyst (m³)."] });
  return { n: 6, title: "Persediaan & Kapasitas Gudang", lead: "Luas dan kapasitas gudang hasil survei serta perbandingan kapasitas dengan stok dan rencana impor.", scope: ["Luas dan kapasitas gudang", "Kapasitas vs stok dan rencana impor"], stats: [[String(wh.length), "Gudang"], [compact(sum(measured.map((r) => r.capacity ?? 0))), "Kapasitas (m³)"]], blocks };
}

function bab7(ds: NonIndustriDataset): Chapter {
  const v = ds.values;
  const both = v.filter((x) => x.nilaiImpor && x.modalKerja);
  const r = (x: (typeof v)[number]) => (x.nilaiImpor && x.modalKerja ? x.modalKerja / x.nilaiImpor : null);
  const short = both.filter((x) => (r(x) ?? 1) < 1);
  const evidence = ranked(v.flatMap((x) => x.evidence));
  const noEvidence = v.filter((x) => !x.evidence.length);
  const decisions = statusCounts(v.map((x) => x.decision));
  const rp = (n: number) => `Rp ${nf(Math.round(n))}`;
  const blocks: Block[] = [{ t: "sub", num: "7.1", title: "Modal Kerja terhadap Nilai Impor" }];
  blocks.push({ t: "p", text: v.length
    ? `Kemampuan finansial dinilai dengan membandingkan Jumlah Modal Kerja pada Surat Pernyataan Kepemilikan Modal Kerja dengan nilai impor yang dianalisis Technical Analyst. Keduanya tersedia pada ${both.length} dari ${v.length} permohonan, dengan total modal kerja ${rp(sum(both.map((x) => x.modalKerja ?? 0)))} dan nilai impor ${rp(sum(both.map((x) => x.nilaiImpor ?? 0)))}. ${short.length ? `${short.length} permohonan memiliki modal kerja lebih kecil dari nilai impor (${joinId(short.map((x) => x.company))}).` : both.length ? "Seluruh permohonan memiliki modal kerja paling sedikit sama dengan nilai impor." : ""} Keputusan Technical Analyst: ${phraseCounts(decisions, "permohonan")}.`
    : "Belum ada data kemampuan finansial pada periode ini." });
  if (both.length) blocks.push({ t: "fig", num: "7.1", title: "Rasio Modal Kerja terhadap Nilai Impor", source: `${SOURCE}. Rasio = modal kerja ÷ nilai impor; di bawah 100% berarti modal kerja lebih kecil dari nilai impor.`, fig: { k: "hbar", rows: [...both].sort((a, b) => (r(a) ?? 0) - (r(b) ?? 0)).slice(0, 10).map((x) => ({ key: x.company, desc: `${compact(x.modalKerja ?? 0)} ÷ ${compact(x.nilaiImpor ?? 0)}`, value: Math.round((r(x) ?? 0) * 100) })), keyWidth: 200, unit: "%" } });
  blocks.push({ t: "table", num: "7.1", title: "Modal Kerja dan Nilai Impor per Permohonan", headers: ["Perusahaan", "Nilai Impor (Rp)", "Modal Kerja (Rp)", "Rasio Modal/Nilai", "Keputusan"],
    rows: v.map((x) => [x.company, x.nilaiImpor ?? "—", x.modalKerja ?? "—", r(x) === null ? "—" : ratio(r(x)!, 1), x.decision.label]), source: SOURCE });
  blocks.push({ t: "sub", num: "7.2", title: "Bukti Kemampuan Finansial" });
  blocks.push({ t: "p", text: v.length
    ? `Kepemilikan modal kerja tidak dipersyaratkan ${BASIS}, namun ditetapkan sebagai persyaratan internal Lembaga Pelaksana Verifikasi: setiap pemohon menyampaikan Surat Pernyataan Kepemilikan Modal Kerja dan salah satu bukti pendukung. ${evidence.length ? `Bukti yang paling banyak digunakan adalah ${joinId(evidence.slice(0, 3).map(([e, n]) => `${e} (${n})`))}.` : ""}${noEvidence.length ? ` ${noEvidence.length} permohonan belum melampirkan bukti pendukung.` : ""}`
    : "Belum ada bukti kemampuan finansial pada periode ini." });
  if (evidence.length) blocks.push({ t: "fig", num: "7.2", title: "Jenis Bukti Kemampuan Finansial", source: `${SOURCE}. Bukti pendukung yang dilampirkan pemohon.`, fig: { k: "hbar", rows: evidence.map(([e, n]) => ({ key: e, value: n })), total: v.length, keyWidth: 240 } });
  if (v.length) blocks.push({ t: "highlights", items: [`Modal kerja dan nilai impor tersedia pada ${both.length} dari ${v.length} permohonan.`, short.length ? `${short.length} permohonan memiliki modal kerja lebih kecil dari nilai impor.` : "Tidak ada permohonan dengan modal kerja lebih kecil dari nilai impor."] });
  blocks.push({ t: "limits", items: ["Modal kerja mengikuti Surat Pernyataan Kepemilikan Modal Kerja; nilai impor mengikuti isian Technical Analyst dalam Rupiah.", "Persyaratan modal kerja merupakan persyaratan internal Lembaga Pelaksana Verifikasi."] });
  return { n: 7, title: "Kemampuan Finansial", lead: "Modal kerja Perusahaan API-U dibandingkan dengan nilai impor, beserta bukti kemampuan finansial pendukung.", scope: ["Modal kerja vs nilai impor", "Bukti kemampuan finansial"], stats: [[String(both.length), "Data lengkap"], [String(short.length), "Modal < nilai"]], blocks };
}

function bab8(ds: NonIndustriDataset): Chapter {
  const unit = dominantUnit(ds.lines);
  const ls = ds.lines.filter((l) => l.unit === unit && l.quantity > 0);
  const dims: Dimension[] = [
    concentrationOf("company", "Pemohon VIU", ls.map((l) => [l.company, l.quantity])),
    concentrationOf("hs", "Pos Tarif/HS", ls.map((l) => [l.hs || "—", l.quantity]), false, "pos tarif/HS"),
    concentrationOf("chapter", "Bab HS (BTKI)", ls.map((l) => [l.hs ? `Bab ${l.hs.replace(/\D/g, "").slice(0, 2)}` : "—", l.quantity]), false, "Bab HS"),
    concentrationOf("material", "Jenis Material", ls.map((l) => [l.material, l.quantity]), false, "jenis material"),
    concentrationOf("use", "Peruntukan", ls.map((l) => [l.intendedUse || UNKNOWN, l.quantity]), false, "peruntukan"),
  ];
  const byHhi = [...dims].sort((a, b) => b.hhi - a.hhi);
  const pctText = (s: number) => `${(s * 100).toFixed(1).replace(".", ",")}%`;
  const blocks: Block[] = [{ t: "sub", num: "8.1", title: "Ukuran Konsentrasi" }];
  blocks.push({ t: "p", text: `Bab ini mengukur konsentrasi rencana volume impor menurut lima dimensi: Pemohon VIU, pos tarif/HS, Bab HS, jenis material dan peruntukan. Karena sistem tidak menghimpun harga bahan baku/penolong, konsentrasi dihitung dari rencana volume dalam satuan ${unit || "yang paling banyak digunakan"}. Ukuran yang digunakan adalah rasio konsentrasi CR1, CR3 dan CR5 serta Herfindahl-Hirschman Index (HHI, 0–10.000): kurang dari 1.500 rendah, 1.500–2.500 sedang, dan lebih dari 2.500 tinggi.` });
  blocks.push({ t: "sub", num: "8.2", title: "Hasil Pengukuran" });
  if (!ls.length) {
    blocks.push({ t: "p", text: "Belum ada rencana volume yang dapat diukur pada periode ini." });
  } else {
    const high = byHhi.filter((d) => d.level === "Tinggi");
    blocks.push({ t: "p", text: `Konsentrasi tertinggi terdapat pada dimensi ${byHhi[0].phrase} dengan HHI ${nf(byHhi[0].hhi)}${byHhi[1] ? `, diikuti ${byHhi[1].phrase} dengan HHI ${nf(byHhi[1].hhi)}` : ""}. ${high.length ? `${high.length} dari ${dims.length} dimensi tergolong konsentrasi tinggi.` : "Tidak ada dimensi yang tergolong konsentrasi tinggi."} Pemohon terbesar, ${dims[0].items[0]?.label ?? "—"}, mencakup ${pctText(dims[0].cr1)} dari rencana volume; tiga pemohon terbesar mencakup ${pctText(dims[0].cr3)}.` });
    blocks.push({ t: "fig", num: "8.1", title: "Herfindahl-Hirschman Index per Dimensi", source: `${SOURCE}. Rencana volume dalam ${unit}.`, fig: { k: "hbar", rows: byHhi.map((d) => ({ key: d.label, desc: `${d.level} · ${d.items.length} entitas`, value: d.hhi })), total: 10000, keyWidth: 160 } });
  }
  blocks.push({ t: "table", num: "8.1", title: "Konsentrasi Rencana Volume Impor", headers: ["Dimensi", "Jumlah Entitas", "Terbesar", "CR1", "CR3", "HHI", "Tingkat"],
    rows: dims.map((d) => [d.label, d.items.length, d.items[0]?.label ?? "—", pctText(d.cr1), pctText(d.cr3), d.hhi, d.level]), source: `${SOURCE}. Rencana volume dalam ${unit || "—"}.` });
  if (ls.length) blocks.push({ t: "highlights", items: [`Konsentrasi tertinggi pada dimensi ${byHhi[0].phrase} (HHI ${nf(byHhi[0].hhi)}, ${byHhi[0].level.toLowerCase()}).`, `Tiga Pemohon VIU terbesar mencakup ${pctText(dims[0].cr3)} rencana volume.`] });
  blocks.push({ t: "limits", items: ["Konsentrasi dihitung dari rencana volume, bukan nilai atau realisasi impor; product line dalam satuan lain tidak termasuk.", "HHI merupakan alat analisis prioritas pemantauan, bukan indikator kepatuhan."] });
  return { n: 8, title: "Konsentrasi Rencana Impor", lead: "Tingkat konsentrasi rencana volume impor menurut pemohon, pos tarif, Bab HS, jenis material dan peruntukan.", scope: ["Ukuran konsentrasi", "Hasil pengukuran"], stats: [[nf(byHhi[0]?.hhi ?? 0), "HHI tertinggi"], [String(dims.length), "Dimensi"]], blocks };
}

function bab9(ds: NonIndustriDataset): Chapter {
  const apps = ds.applications;
  const kantor = apps.flatMap((a) => (a.kantor ? [a.kantor] : []));
  const gudang = apps.flatMap((a) => a.gudang);
  const ownSegs = (ps: P47Place[]) => segsOf(ps.map((p) => p.ownership || UNKNOWN), ["Milik Sendiri", "Sewa", UNKNOWN]);
  const conclSegs = (ps: P47Place[]) => segsOf(ps.map((p) => p.fieldConclusion || "Belum disimpulkan"), ["Sesuai", "Tidak Sesuai", "Belum disimpulkan"]);
  const regSegs = segsOf(gudang.map((g) => (g.registration ? (g.registration.startsWith("Gudang") ? "Gudang Berikat" : g.registration.split(" ")[0]) : UNKNOWN)), ["TDG", "Gudang Berikat", "TPS", UNKNOWN]);
  const provinces = ranked(gudang.map((g) => title(g.province) || UNKNOWN));
  const end = new Date(`${ds.period.to.slice(0, 10)}T00:00:00Z`);
  end.setUTCMonth(end.getUTCMonth() + 6);
  const horizon = end.toISOString().slice(0, 10);
  const leaseEnding = apps.flatMap((a) => [...(a.kantor ? [a.kantor] : []), ...a.gudang].filter((p) => p.leaseEnd && p.leaseEnd <= horizon).map((p) => ({ company: a.company, end: p.leaseEnd! }))).sort((a, b) => a.end.localeCompare(b.end));
  const cText = (segs: Seg[], n: number, what: string) => [`${own(segs, "Sesuai")} dari ${n} lokasi ${what} sesuai`, own(segs, "Tidak Sesuai") ? `${own(segs, "Tidak Sesuai")} tidak sesuai` : "", own(segs, "Belum disimpulkan") ? `${own(segs, "Belum disimpulkan")} belum disimpulkan` : ""].filter(Boolean).join(", ");
  const blocks: Block[] = [{ t: "sub", num: "9.1", title: "Kantor dan Gudang" }];
  blocks.push({ t: "p", text: apps.length
    ? `Perusahaan API-U mencatat ${kantor.length} kantor dan ${gudang.length} gudang. Dari sisi kepemilikan, ${own(ownSegs(kantor), "Milik Sendiri")} kantor dan ${own(ownSegs(gudang), "Milik Sendiri")} gudang berstatus milik sendiri, sedangkan ${own(ownSegs(kantor), "Sewa")} kantor dan ${own(ownSegs(gudang), "Sewa")} gudang berstatus sewa. Gudang terbanyak berada di ${joinId(provinces.slice(0, 3).map(([p, n]) => `${p} (${n})`))}.`
    : "Belum ada lokasi kantor dan gudang pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "9.1", title: "Status Kepemilikan Kantor dan Gudang", source: `${SOURCE}. Status bangunan pada data lokasi.`, fig: { k: "donuts", items: [{ cap: "Kantor", center: String(kantor.length), sub: "kantor", segs: ownSegs(kantor) }, { cap: "Gudang", center: String(gudang.length), sub: "gudang", segs: ownSegs(gudang) }] } });
  blocks.push({ t: "sub", num: "9.2", title: "Legalitas Gudang dan Verifikasi Lapangan" });
  blocks.push({ t: "p", text: apps.length
    ? `Gudang yang digunakan wajib memiliki tanda daftar gudang dengan masa sewa paling singkat 1 (satu) tahun bila berstatus sewa. ${own(regSegs, UNKNOWN) ? `${gudang.length - own(regSegs, UNKNOWN)} dari ${gudang.length} gudang mencantumkan tanda daftar.` : "Seluruh gudang mencantumkan tanda daftar."} Verifikasi lapangan menyimpulkan ${cText(conclSegs(gudang), gudang.length, "gudang")}, sedangkan untuk kantor ${cText(conclSegs(kantor), kantor.length, "kantor")}.${leaseEnding.length ? ` Masa sewa ${leaseEnding.length} lokasi berakhir paling lambat 6 bulan setelah akhir periode, paling awal ${fdLong(leaseEnding[0].end)} (${leaseEnding[0].company}).` : ""}`
    : "Belum ada data legalitas gudang pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "9.2", title: "Legalitas Gudang dan Kesimpulan Verifikasi Lapangan", source: `${SOURCE}. Kesimpulan surveyor dihitung terpisah untuk lokasi gudang dan kantor.`, fig: { k: "donuts", items: [
    { cap: "Tanda daftar gudang", center: String(gudang.length), sub: "gudang", segs: regSegs },
    { cap: "Kesimpulan lapangan gudang", center: String(gudang.length), sub: "gudang", segs: conclSegs(gudang) },
    { cap: "Kesimpulan lapangan kantor", center: String(kantor.length), sub: "kantor", segs: conclSegs(kantor) },
  ] } });
  blocks.push({ t: "table", num: "9.1", title: "Fasilitas Perusahaan API-U", headers: ["Perusahaan", "Lokasi Kantor", "Status Kantor", "Lokasi Gudang", "Status Gudang", "Tanda Daftar", "Kesimpulan Lapangan"],
    rows: [...apps].sort((a, b) => a.company.localeCompare(b.company)).map((a) => [a.company, loc(a.kantor), a.kantor?.ownership || "—", uniq(a.gudang.map(loc)).join("; ") || "—", uniq(a.gudang.map((g) => g.ownership || UNKNOWN)).join(", ") || "—", a.gudang.length ? `${a.gudang.filter((g) => g.registration).length}/${a.gudang.length}` : "—", uniq([a.kantor, ...a.gudang].filter(Boolean).map((p) => p!.fieldConclusion || "Belum")).join(", ") || "—"]), source: SOURCE });
  if (apps.length) blocks.push({ t: "highlights", items: [`${kantor.length} kantor dan ${gudang.length} gudang tercatat.`, `Verifikasi lapangan: ${cText(conclSegs(gudang), gudang.length, "gudang")}.`] });
  blocks.push({ t: "limits", items: ["Lokasi, status kepemilikan, tanda daftar dan masa sewa mengikuti data lokasi perusahaan yang dipilih pada permohonan.", "Masa sewa yang berakhir dinilai sampai 6 (enam) bulan setelah akhir periode laporan."] });
  return { n: 9, title: "Fasilitas & Lokasi", lead: "Kantor dan gudang Perusahaan API-U: kepemilikan, lokasi, legalitas gudang dan hasil verifikasi lapangan.", scope: ["Kantor dan gudang", "Legalitas gudang dan verifikasi lapangan"], stats: [[String(kantor.length), "Kantor"], [String(gudang.length), "Gudang"]], blocks };
}

function bab10(ds: NonIndustriDataset, report: P47Report): Chapter {
  const f = ds.findings;
  const sources = segsOf(f.map((x) => x.source), ["Verifikasi Dokumen", "Survei Lapangan", "Analisis Teknis", "Verifikasi Produk"]);
  const severity = segsOf(f.map((x) => x.severity), ["Critical", "Major", "Minor"]);
  const mat = segsOf(f.map((x) => MATERIALITY_LABEL[materialityOf(report, x.key)]), ["Material", "Needs Review", "Non-Material"]);
  const material = f.filter((x) => materialityOf(report, x.key) === "MATERIAL");
  const rec: string[] = [];
  const rank = { Critical: 0, Major: 1, Minor: 2 } as const;
  if (material.length) rec.push(`Menindaklanjuti ${material.length} temuan material sebelum laporan disampaikan, terutama pada ${joinId(uniq(material.map((x) => x.company)).slice(0, 3))}.`);
  if (own(mat, "Needs Review")) rec.push(`Menetapkan materialitas ${own(mat, "Needs Review")} temuan yang masih berstatus Needs Review.`);
  const ta = ds.analysis.filter((x) => x.status.label === "Belum Dianalisis");
  if (ta.length) rec.push(`Menyelesaikan ${ta.length} modul analisis teknis yang belum dianalisis.`);
  const noLhviu = ds.applications.filter((a) => lhviuStatus(a).label === "Belum Diunggah");
  if (noLhviu.length) rec.push(`Mengunggah LHVIU untuk ${noLhviu.length} permohonan yang telah selesai diverifikasi.`);
  rec.push("Menghimpun identitas Perusahaan Non Industri mitra dan kontraknya sebagai data terstruktur agar dapat direkapitulasi pada laporan berikutnya.");
  const blocks: Block[] = [{ t: "sub", num: "10.1", title: "Temuan Pelaksanaan Verifikasi" }];
  blocks.push({ t: "p", text: f.length
    ? `Selama periode laporan tercatat ${withWords(f.length)} temuan dari ${uniq(f.map((x) => x.applicationId)).length} permohonan: ${phraseCounts(sources, "temuan dari")}. Menurut tingkat keparahan, ${phraseCounts(severity, "temuan")}.`
    : "Tidak ada temuan yang tercatat pada periode ini." });
  if (f.length) blocks.push({ t: "fig", num: "10.1", title: "Temuan menurut Sumber dan Tingkat Keparahan", source: SOURCE, fig: { k: "donuts", items: [{ cap: "Sumber temuan", center: String(f.length), sub: "temuan", segs: sources }, { cap: "Tingkat keparahan", center: String(f.length), sub: "temuan", segs: severity }] } });
  blocks.push({ t: "sub", num: "10.2", title: "Materialitas Temuan" });
  blocks.push({ t: "p", text: f.length ? `Project Manager menetapkan materialitas setiap temuan untuk pelaporan: ${phraseCounts(mat, "temuan")}. Daftar temuan disajikan pada Tabel 10.1, diurutkan menurut tingkat keparahan.` : "Belum ada temuan yang perlu ditetapkan materialitasnya." });
  blocks.push({ t: "table", num: "10.1", title: "Daftar Temuan dan Materialitas", headers: ["Perusahaan", "Sumber", "Area", "Temuan", "Keparahan", "Materialitas"],
    rows: [...f].sort((a, b) => rank[a.severity] - rank[b.severity] || a.company.localeCompare(b.company)).map((x) => [x.company, x.source, x.area, x.text, x.severity, MATERIALITY_LABEL[materialityOf(report, x.key)]]), source: SOURCE });
  blocks.push({ t: "sub", num: "10.3", title: "Rekomendasi" });
  blocks.push({ t: "highlights", items: rec });
  blocks.push({ t: "limits", items: ["Temuan dihimpun dari survei lapangan, verifikasi dokumen, verifikasi produk dan analisis teknis yang tercatat pada sistem.", "Materialitas ditetapkan Project Manager; temuan yang belum ditetapkan dicatat sebagai Needs Review."] });
  return { n: 10, title: "Temuan & Rekomendasi", lead: "Temuan pelaksanaan verifikasi, materialitasnya untuk pelaporan, dan rekomendasi tindak lanjut.", scope: ["Temuan", "Materialitas", "Rekomendasi"], stats: [[String(f.length), "Temuan"], [String(material.length), "Material"]], blocks };
}

// Front and back matter --------------------------------------------------------------------------------
function intro(ds: NonIndustriDataset, report: P47Report): string[] {
  return [
    `Laporan ini disusun sebagai pelaporan pelaksanaan Verifikasi Importir Umum (VIU) ${SUBJECT} sebagaimana diamanatkan Pasal 47 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, untuk disampaikan kepada Menteri Perindustrian melalui Direktur Jenderal Industri Kimia, Farmasi dan Tekstil. Laporan mencakup periode ${periodText(ds)}.`,
    `VIU ${SUBJECT} dilaksanakan terhadap Perusahaan API-U yang mengimpor Tekstil dan/atau Produk Tekstil untuk digunakan sebagai bahan baku dan/atau bahan penolong bagi Perusahaan Non Industri (${BASIS}). Verifikasi meliputi pemeriksaan dokumen, verifikasi lapangan kantor dan gudang, serta analisis teknis atas kebutuhan Perusahaan Non Industri mitra, kapasitas gudang dan kepemilikan modal, yang hasilnya dituangkan dalam LHVIU (Pasal 39 ayat (4)).`,
    `Seluruh angka dalam laporan dihimpun dari data permohonan, hasil verifikasi dokumen, laporan survei lapangan dan analisis teknis yang tercatat pada sistem per ${fdLong(ds.generatedAt)}. Permohonan dimasukkan ke periode laporan menurut Tanggal Terbit LHVIU, atau Tanggal Pengajuan bila tanggal terbit belum dicatat. Data yang tidak dihimpun sistem — harga, negara asal dan identitas terstruktur mitra non industri — dinyatakan tidak tersedia dan tidak diperkirakan.`,
    `Laporan terdiri atas sepuluh bab: data perusahaan; bahan baku dan pos tarif; peruntukan dan kebutuhan mitra; rencana volume impor; analisis teknis; persediaan dan kapasitas gudang; kemampuan finansial; konsentrasi rencana impor; fasilitas dan lokasi; serta temuan dan rekomendasi, diikuti kesimpulan. Status laporan saat ini: ${report.status === "APPROVED" ? "disetujui" : report.status === "REVIEWED" ? "telah ditelaah" : "draf"}.`,
  ];
}

function conclusion(ds: NonIndustriDataset, report: P47Report, chapters: Chapter[]): { title: string; paragraphs: string[] }[] {
  const apps = ds.applications;
  if (!apps.length) return [{ title: "Kesimpulan", paragraphs: [`Pada periode ${periodText(ds)} belum terdapat pelaksanaan VIU ${SUBJECT}. Laporan ini disampaikan sebagai laporan nihil.`] }];
  const lhviu = apps.filter((a) => a.lhviu).length;
  const material = ds.findings.filter((x) => materialityOf(report, x.key) === "MATERIAL").length;
  const out = [
    { title: "Pelaksanaan VIU", paragraphs: [`Pada periode ${periodText(ds)} telah dilaksanakan VIU ${SUBJECT} atas ${apps.length} permohonan dari ${uniq(apps.map((a) => a.companyId ?? a.company)).length} Perusahaan API-U; ${lhviu} LHVIU telah terbit.`] },
    { title: "Pokok Hasil", paragraphs: chapters.flatMap((c) => c.blocks.filter((b): b is Extract<Block, { t: "highlights" }> => b.t === "highlights").slice(0, 1).flatMap((b) => b.items.slice(0, 1))) },
    { title: "Temuan", paragraphs: [ds.findings.length ? `Tercatat ${ds.findings.length} temuan, ${material} di antaranya ditetapkan material oleh Project Manager. Rekomendasi tindak lanjut disajikan pada Bab 10.` : "Tidak ada temuan yang tercatat selama periode laporan."] },
  ];
  if (report.pmNote.trim()) out.push({ title: "Catatan Project Manager", paragraphs: report.pmNote.trim().split(/\n+/) });
  return out;
}

/** The whole report model for one period. */
export function nonIndustriReport(ds: NonIndustriDataset, report: P47Report): NonIndustriReportModel {
  const chapters = [bab1(ds), bab2(ds), bab3(ds), bab4(ds), bab5(ds), bab6(ds), bab7(ds), bab8(ds), bab9(ds), bab10(ds, report)];
  const apps = ds.applications;
  const unit = dominantUnit(ds.lines);
  const alerts = [
    ...(apps.length ? [] : ["Belum ada permohonan VIU Non Industri pada periode ini; laporan berisi laporan nihil."]),
    ...(apps.filter((a) => !a.lhviu).length ? [`${apps.filter((a) => !a.lhviu).length} permohonan belum memiliki LHVIU.`] : []),
    ...(ds.analysis.some((x) => x.status.label === "Belum Dianalisis") ? [`${ds.analysis.filter((x) => x.status.label === "Belum Dianalisis").length} modul analisis teknis belum dianalisis.`] : []),
    ...(ds.findings.some((x) => !report.materiality[x.key]) ? [`${ds.findings.filter((x) => !report.materiality[x.key]).length} temuan belum ditetapkan materialitasnya.`] : []),
  ];
  return {
    chapters,
    intro: intro(ds, report),
    summary: {
      tiles: [
        [String(uniq(apps.map((a) => a.companyId ?? a.company)).length), "PERUSAHAAN API-U", `${apps.length} permohonan`],
        [`${apps.filter((a) => a.lhviu).length}/${apps.length}`, "LHVIU TERBIT", "file LHVIU diunggah"],
        [String(uniq(ds.lines.map((l) => l.hs).filter(Boolean)).length), "POS TARIF/HS", `${ds.lines.length} product line`],
        [compact(sum(ds.lines.filter((l) => l.unit === unit).map((l) => l.quantity))), "RENCANA VOLUME", unit ? `dalam ${unit}` : "—"],
        [String(ds.warehouses.length), "GUDANG", "dilaporkan"],
        [String(ds.findings.length), "TEMUAN", `${ds.findings.filter((x) => materialityOf(report, x.key) === "MATERIAL").length} material`],
      ],
      highlights: chapters.flatMap((c) => c.blocks.filter((b): b is Extract<Block, { t: "highlights" }> => b.t === "highlights").slice(0, 1).flatMap((b) => b.items.slice(0, 1).map((t) => `Bab ${c.n} — ${t}`))),
      alerts,
    },
    conclusion: conclusion(ds, report, chapters),
  };
}

