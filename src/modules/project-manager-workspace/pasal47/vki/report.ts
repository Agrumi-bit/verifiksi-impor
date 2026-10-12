import { loc, own, periodOf, phraseCounts, ranked, ratio, segsOf, statusCounts, title } from "./engine/helpers";
import type { Block, Chapter, ChapterReportModel, Seg } from "./engine/model";
import { compact, fd, fdLong, joinId, nf, sum, uniq, withWords } from "../format";
import { lhviuStatus } from "../derive";
import { MATERIALITY_LABEL, materialityOf } from "../summary";
import type { P47Place, P47Report } from "../types";
import type { VkiDataset, VkiMaterial, VkiModuleKey } from "./types";

/*
 * Laporan Pelaksanaan VKI (Pelaporan Pasal 47 Permenperin 27/2025): ten chapters in the structure of the
 * Laporan Pelaksanaan VIU — data perusahaan, produk dan kapasitas produksi, bahan baku/penolong, rencana
 * impor, mesin, tenaga kerja dan energi listrik, penjualan, analisis teknis, fasilitas, temuan. Every
 * figure is counted from the dataset; quantities are only added up within one unit.
 */

export const SUBJECT = "Kemampuan Industri Perusahaan API-P/Perusahaan Industri";
export const SOURCE = "Sistem Verifikasi Impor, diolah";
const UNKNOWN = "Tidak diisi";

const periodText = (ds: VkiDataset) => periodOf(ds.period);
/** The unit most rows use; quantities are only compared within this unit. */
export const mainUnit = (units: string[]) => ranked(units.filter(Boolean), 1)[0]?.[0] ?? "";
const sumIn = <T,>(rows: T[], unit: string, unitOf: (r: T) => string, value: (r: T) => number | null) => sum(rows.filter((r) => unitOf(r) === unit).map((r) => value(r) ?? 0));
const hsChapter = (hs: string) => (hs ? `Bab ${hs.replace(/\D/g, "").slice(0, 2)}` : "—");

export type MaterialHsRow = { hs: string; description: string; companies: number; materials: number; need: number; imported: number; unit: string };
/** One row per HS of the bahan baku; need and import are summed only within one unit, otherwise NaN. */
export function materialHsRows(materials: VkiMaterial[]): MaterialHsRow[] {
  const byHs = new Map<string, VkiMaterial[]>();
  for (const m of materials) byHs.set(m.hs || "—", [...(byHs.get(m.hs || "—") ?? []), m]);
  return [...byHs.entries()].map(([hs, ms]) => {
    const units = uniq(ms.map((m) => m.unit || "—"));
    const one = units.length === 1;
    return {
      hs, description: ms.find((m) => m.hsDescription)?.hsDescription ?? "", companies: uniq(ms.map((m) => m.applicationId)).length, materials: ms.length,
      need: one ? sum(ms.map((m) => m.needTotal ?? 0)) : Number.NaN, imported: one ? sum(ms.map((m) => m.needImport ?? 0)) : Number.NaN, unit: one ? (units[0] === "—" ? "" : units[0]) : units.join(" / "),
    };
  }).sort((a, b) => (Number.isNaN(b.need) ? -1 : b.need) - (Number.isNaN(a.need) ? -1 : a.need) || a.hs.localeCompare(b.hs));
}

/** Countries named in the free-text "negara asal" of the import plan ("Tiongkok, Vietnam" → two). */
export const countriesOf = (text: string) => text.split(/[,;/]|\bdan\b/i).map((c) => c.trim()).filter(Boolean).map((c) => c.toUpperCase());

function bab1(ds: VkiDataset): Chapter {
  const apps = ds.applications;
  const companies = uniq(apps.map((a) => a.companyId ?? a.company));
  const statusSegs = segsOf(apps.map((a) => lhviuStatus(a).label), ["Terbit", "Belum Diunggah", "Dalam Proses"]);
  const validUntil = (iso: string) => `${Number(iso.slice(0, 4)) + 3}${iso.slice(4, 10)}`;
  const issued = apps.filter((a) => a.lhviu?.issuedAt).map((a) => ({ a, until: validUntil(a.lhviu!.issuedAt!) })).sort((x, y) => x.until.localeCompare(y.until));
  const kbli = new Map<string, { code: string; description: string; companies: string[] }>();
  for (const a of apps) for (const k of a.kbli) {
    if (!k.code) continue;
    const row = kbli.get(k.code) ?? { code: k.code, description: k.description, companies: [] };
    if (!row.companies.includes(a.company)) row.companies.push(a.company);
    kbli.set(k.code, row);
  }
  const kbliList = [...kbli.values()].sort((a, b) => b.companies.length - a.companies.length || a.code.localeCompare(b.code));
  const industrial = kbliList.filter((k) => /^1[0-9]|^3[0-3]/.test(k.code));
  const dates = apps.map((a) => a.submittedAt).filter(Boolean).sort();
  const blocks: Block[] = [{ t: "sub", num: "1.1", title: "Profil Perusahaan Industri" }];
  if (!apps.length) {
    blocks.push({ t: "p", text: `Pada periode ${periodText(ds)} belum terdapat Perusahaan API-P atau Perusahaan Industri yang mengajukan Verifikasi Kemampuan Industri (VKI), sehingga bab ini tidak memuat data perusahaan.` });
  } else {
    blocks.push(
      { t: "p", text: `Bab ini menyajikan profil Perusahaan API-P atau Perusahaan Industri yang mengajukan Verifikasi Kemampuan Industri (VKI) pada periode ${periodText(ds)}. Tercatat ${withWords(companies.length)} perusahaan dengan ${withWords(apps.length)} permohonan, diajukan sejak ${fdLong(dates[0])}${dates.length > 1 && dates.at(-1) !== dates[0] ? ` hingga ${fdLong(dates.at(-1)!)}` : ""}. VKI dilakukan terhadap perusahaan yang memiliki kontrak kerja sama dan/atau kontrak jual beli bahan baku dan/atau bahan penolong dengan Perusahaan API-U (Pasal 25).` },
      { t: "fig", num: "1.1", title: "Ikhtisar Perusahaan Industri", source: SOURCE, fig: { k: "kpis", tiles: [
        [String(companies.length), "PERUSAHAAN INDUSTRI", "mengajukan VKI"],
        [String(apps.length), "PERMOHONAN", "dalam periode laporan"],
        [`${own(statusSegs, "Terbit")}/${apps.length}`, "LHVKI TERBIT", "file LHVKI diunggah"],
        [String(apps.reduce((n, a) => n + a.pabrik.length, 0)), "PABRIK", "lokasi pabrik"],
      ] } },
    );
  }
  blocks.push({ t: "sub", num: "1.2", title: "KBLI dan Bidang Usaha" });
  blocks.push({ t: "p", text: apps.length
    ? `KBLI dan bidang usaha perusahaan dimuat dalam LHVKI (Pasal 32 ayat (3) huruf b). KBLI Utama yang paling banyak dimiliki adalah ${joinId(kbliList.slice(0, 3).map((k) => `${k.code} (${k.description.toLowerCase()}, ${k.companies.length} perusahaan)`))}. ${industrial.length} dari ${kbliList.length} kode KBLI Utama yang tercatat termasuk golongan industri pengolahan (KBLI 10–33).`
    : "Belum ada KBLI yang dapat dinilai pada periode ini." });
  blocks.push({ t: "table", num: "1.1", title: "KBLI Utama Perusahaan Industri", headers: ["Kode KBLI", "Uraian", "Jumlah Perusahaan", "Industri Pengolahan"], rows: kbliList.map((k) => [k.code, k.description, k.companies.length, /^1[0-9]|^3[0-3]/.test(k.code) ? "Ya" : "Tidak"]), source: SOURCE });
  blocks.push({ t: "sub", num: "1.3", title: "Daftar Perusahaan dan Status LHVKI" });
  blocks.push({ t: "p", text: apps.length ? `Status Laporan Hasil Verifikasi Kemampuan Industri (LHVKI) atas ${apps.length} permohonan: ${phraseCounts(statusSegs, "permohonan")}. Status ditentukan dari file LHVKI yang diunggah Project Manager; nomor dan tanggal terbit dicantumkan bila telah dicatat. LHVKI berlaku 3 (tiga) tahun sejak diterbitkan (Pasal 32 ayat (4))${issued.length ? `; masa berlaku paling awal berakhir ${fdLong(issued[0].until)} (${issued[0].a.company})` : ""}. Permohonan dimasukkan ke periode laporan menurut Tanggal Terbit LHVKI, atau Tanggal Pengajuan bila LHVKI belum dicatat.` : "Belum ada LHVKI pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "1.2", title: "Status LHVKI", source: SOURCE, fig: { k: "donuts", items: [{ cap: "Status LHVKI per permohonan", center: String(apps.length), sub: "permohonan", segs: statusSegs }] } });
  blocks.push({ t: "table", num: "1.2", title: "Daftar Perusahaan Industri dan Status LHVKI", headers: ["Perusahaan", "NIB", "Tanggal Pengajuan", "Lokasi Pabrik", "Nomor LHVKI", "Tanggal Terbit", "Status LHVKI"],
    rows: [...apps].sort((a, b) => a.company.localeCompare(b.company)).map((a) => [a.company, a.nib || "—", fd(a.submittedAt), uniq(a.pabrik.map(loc)).join("; ") || "—", a.lhviu?.number ?? "—", fd(a.lhviu?.issuedAt), lhviuStatus(a).label]), source: SOURCE });
  if (apps.length) blocks.push({ t: "highlights", items: [`${withWords(companies.length)} perusahaan industri mengajukan ${apps.length} permohonan VKI.`, `${own(statusSegs, "Terbit")} dari ${apps.length} LHVKI telah terbit.`] });
  blocks.push({ t: "limits", items: ["KBLI mengikuti profil perusahaan pada sistem.", "Nomor dan tanggal terbit LHVKI mengikuti data yang dicatat Project Manager pada tab LHVKI."] });
  return { n: 1, title: "Data Perusahaan Industri", lead: "Profil Perusahaan API-P/Perusahaan Industri yang mengajukan VKI: KBLI, lokasi pabrik dan status LHVKI.", scope: ["Profil perusahaan", "KBLI dan bidang usaha", "Status LHVKI"], stats: [[String(companies.length), "Perusahaan"], [String(apps.length), "Permohonan"], [String(own(statusSegs, "Terbit")), "LHVKI terbit"]], blocks };
}

function bab2(ds: VkiDataset): Chapter {
  const caps = ds.capacities;
  const prods = ds.products;
  const pUnit = mainUnit(prods.map((p) => p.productionUnit));
  const produced = sumIn(prods, pUnit, (p) => p.productionUnit, (p) => p.producedLastYear);
  const planned = sumIn(prods, pUnit, (p) => p.productionUnit, (p) => p.plannedProduction);
  const cUnit = mainUnit(caps.map((c) => c.unit));
  const perApp = ds.applications.map((a) => {
    const capacity = sumIn(caps.filter((c) => c.applicationId === a.id), cUnit, (c) => c.unit, (c) => c.capacity);
    const ps = prods.filter((p) => p.applicationId === a.id);
    const prod = sumIn(ps, cUnit, (p) => p.productionUnit, (p) => p.producedLastYear);
    const plan = sumIn(ps, cUnit, (p) => p.productionUnit, (p) => p.plannedProduction);
    return { a, capacity, prod, plan, util: capacity ? prod / capacity : null, planUtil: capacity ? plan / capacity : null };
  }).sort((x, y) => y.capacity - x.capacity);
  const over = perApp.filter((r) => (r.planUtil ?? 0) > 1);
  const blocks: Block[] = [{ t: "sub", num: "2.1", title: "Produk yang Dihasilkan" }];
  const categories = ranked(prods.map((p) => p.category || p.name));
  blocks.push({ t: "p", text: prods.length
    ? `Perusahaan industri mencatat ${withWords(prods.length)} produk pada ${uniq(prods.map((p) => p.hs).filter(Boolean)).length} pos tarif/HS. Produk terbanyak berupa ${joinId(categories.slice(0, 3).map(([c, n]) => `${c.toLowerCase()} (${n})`))}.${pUnit ? ` Dalam satuan ${pUnit}, produksi tahun sebelumnya sebesar ${nf(produced)} ${pUnit} dan rencana produksi per tahun sebesar ${nf(planned)} ${pUnit}${produced ? ` (${planned >= produced ? "naik" : "turun"} ${ratio(Math.abs(planned - produced), produced)})` : ""}.` : ""}`
    : "Belum ada produk yang dicatat pada periode ini." });
  if (prods.length) blocks.push({ t: "fig", num: "2.1", title: "Produk menurut Kategori", source: SOURCE, fig: { k: "hbar", rows: categories.slice(0, 8).map(([c, n]) => ({ key: c, value: n })), total: prods.length, keyWidth: 200 } });
  blocks.push({ t: "table", num: "2.1", title: "Produksi per Produk", headers: ["Perusahaan", "Produk", "Pos Tarif/HS", "Produksi Tahun Sebelumnya", "Rencana Produksi", "Satuan"],
    rows: prods.map((p) => [p.company, p.name, p.hs || "—", p.producedLastYear ?? "—", p.plannedProduction ?? "—", p.productionUnit || "—"]), source: `${SOURCE}. Produksi per tahun.` });
  blocks.push({ t: "sub", num: "2.2", title: "Kapasitas Produksi Terpasang" });
  blocks.push({ t: "p", text: caps.length
    ? `Kapasitas terpasang menurut perizinan dicatat per KBLI dan jenis produk (Pasal 30 ayat (2) huruf a). Dalam satuan ${cUnit || "yang paling banyak digunakan"}, total kapasitas terpasang sebesar ${nf(sumIn(caps, cUnit, (c) => c.unit, (c) => c.capacity))} ${cUnit}. ${perApp.some((r) => r.util !== null) ? `Utilisasi produksi tahun sebelumnya terhadap kapasitas terpasang berkisar ${ratio(Math.min(...perApp.filter((r) => r.util !== null).map((r) => r.util!)), 1)} hingga ${ratio(Math.max(...perApp.filter((r) => r.util !== null).map((r) => r.util!)), 1)}.` : ""} ${over.length ? `Rencana produksi ${over.length} perusahaan melebihi kapasitas terpasang (${joinId(over.map((r) => r.a.company))}).` : "Tidak ada rencana produksi yang melebihi kapasitas terpasang."}`
    : "Belum ada kapasitas terpasang yang dicatat pada periode ini." });
  if (perApp.some((r) => r.capacity)) blocks.push({ t: "fig", num: "2.2", title: `Kapasitas Terpasang per Perusahaan (${cUnit})`, source: `${SOURCE}. Hanya kapasitas dalam satuan ${cUnit}.`, fig: { k: "hbar", rows: perApp.filter((r) => r.capacity).slice(0, 10).map((r) => ({ key: r.a.company, desc: r.util === null ? "utilisasi —" : `utilisasi ${ratio(r.util, 1)}`, value: r.capacity })), keyWidth: 200 } });
  blocks.push({ t: "table", num: "2.2", title: "Kapasitas Produksi Terpasang", headers: ["Perusahaan", "Jenis Produk", "KBLI", "Berdasarkan Izin", "Kapasitas Terpasang", "Satuan"],
    rows: caps.map((c) => [c.company, c.product, c.kbli || "—", c.basis || "—", c.capacity ?? "—", c.unit || "—"]), source: SOURCE });
  if (prods.length || caps.length) blocks.push({ t: "highlights", items: [`${prods.length} produk dicatat pada ${uniq(prods.map((p) => p.hs).filter(Boolean)).length} pos tarif/HS.`, over.length ? `Rencana produksi ${over.length} perusahaan melebihi kapasitas terpasang.` : "Rencana produksi berada dalam batas kapasitas terpasang."] });
  blocks.push({ t: "limits", items: ["Kapasitas terpasang mengikuti perizinan berusaha yang dicatat; produksi dan rencana produksi mengikuti isian perusahaan.", "Utilisasi hanya dihitung bila produksi dan kapasitas memakai satuan yang sama."] });
  return { n: 2, title: "Produk & Kapasitas Produksi", lead: "Produk yang dihasilkan, produksi tahun sebelumnya, rencana produksi dan kapasitas terpasang menurut perizinan.", scope: ["Produk yang dihasilkan", "Kapasitas produksi terpasang"], stats: [[String(prods.length), "Produk"], [compact(sumIn(caps, cUnit, (c) => c.unit, (c) => c.capacity)), `Kapasitas (${cUnit || "—"})`]], blocks };
}

function bab3(ds: VkiDataset): Chapter {
  const ms = ds.materials;
  const rows = materialHsRows(ms);
  const unit = mainUnit(ms.map((m) => m.unit));
  const kinds = segsOf(ms.map((m) => m.category || UNKNOWN), ["Bahan Baku", "Bahan Penolong", "Bahan Baku / Bahan Penolong", UNKNOWN]);
  const chapters = ranked(ms.map((m) => hsChapter(m.hs)));
  const blocks: Block[] = [{ t: "sub", num: "3.1", title: "Ragam Bahan Baku/Penolong" }];
  blocks.push({ t: "p", text: ms.length
    ? `Perusahaan industri mencatat ${withWords(ms.length)} bahan baku/penolong pada ${rows.length} pos tarif/HS: ${phraseCounts(kinds, "jenis")}. Pos tarif terbanyak berada pada ${joinId(chapters.slice(0, 3).map(([c, n]) => `${c} (${n})`))} BTKI. Kebutuhan bahan baku dihitung dari rasio konversi produk terhadap bahan baku dan rencana produksi (Pasal 30 ayat (2) huruf a).`
    : "Belum ada bahan baku/penolong yang dicatat pada periode ini." });
  if (ms.length) blocks.push({ t: "fig", num: "3.1", title: "Bahan Baku/Penolong menurut Bab HS (BTKI)", source: `${SOURCE}. Bab HS = dua digit pertama pos tarif.`, fig: { k: "hbar", rows: chapters.slice(0, 10).map(([c, n]) => ({ key: c, value: n })), total: ms.length, keyWidth: 70 } });
  blocks.push({ t: "sub", num: "3.2", title: "Kebutuhan Bahan Baku per Pos Tarif/HS" });
  const top = rows.filter((r) => r.unit === unit && r.need > 0).slice(0, 10);
  blocks.push({ t: "p", text: top.length ? `Kebutuhan dijumlahkan hanya di dalam satu pos tarif dengan satuan yang sama. Dalam satuan ${unit}, kebutuhan terbesar terdapat pada pos tarif ${joinId(top.slice(0, 3).map((r) => `${r.hs} (${nf(r.need)} ${unit})`))}; total kebutuhan dalam satuan ini sebesar ${nf(sumIn(ms, unit, (m) => m.unit, (m) => m.needTotal))} ${unit}.` : "Belum ada kebutuhan bahan baku yang dapat dijumlahkan." });
  if (top.length) blocks.push({ t: "fig", num: "3.2", title: `Sepuluh Pos Tarif/HS dengan Kebutuhan Terbesar (${unit})`, source: `${SOURCE}. Hanya bahan baku dalam satuan ${unit}.`, fig: { k: "hbar", rows: top.map((r) => ({ key: r.hs, desc: r.description, value: r.need })), keyWidth: 90 } });
  blocks.push({ t: "table", num: "3.1", title: "Kebutuhan Bahan Baku/Penolong per Pos Tarif/HS", headers: ["Pos Tarif/HS", "Uraian Barang", "Jumlah Perusahaan", "Kebutuhan per Tahun", "Rencana Impor", "Satuan"],
    rows: rows.map((r) => [r.hs, r.description || "—", r.companies, Number.isNaN(r.need) ? "Satuan berbeda" : r.need, Number.isNaN(r.imported) ? "Satuan berbeda" : r.imported, r.unit || "—"]), source: SOURCE });
  if (ms.length) blocks.push({ t: "highlights", items: [`${ms.length} bahan baku/penolong pada ${rows.length} pos tarif/HS.`, top[0] ? `Kebutuhan terbesar pada pos tarif ${top[0].hs}: ${nf(top[0].need)} ${unit} per tahun.` : ""].filter(Boolean) });
  blocks.push({ t: "limits", items: ["Kebutuhan bahan baku mengikuti isian perusahaan pada data penggunaan bahan baku.", "Kuantitas dengan satuan berbeda tidak dijumlahkan."] });
  return { n: 3, title: "Bahan Baku & Pos Tarif/HS", lead: "Bahan baku dan bahan penolong yang digunakan menurut pos tarif/HS dan kebutuhannya per tahun.", scope: ["Ragam bahan baku/penolong", "Kebutuhan per pos tarif"], stats: [[String(ms.length), "Bahan baku/penolong"], [String(rows.length), "Pos tarif/HS"]], blocks };
}

function bab4(ds: VkiDataset): Chapter {
  const ms = ds.materials;
  const unit = mainUnit(ms.map((m) => m.unit));
  const domestic = sumIn(ms, unit, (m) => m.unit, (m) => m.needDomestic);
  const imported = sumIn(ms, unit, (m) => m.unit, (m) => m.needImport);
  const stock = sumIn(ms, unit, (m) => m.unit, (m) => m.stock);
  const countries = ranked(ms.filter((m) => (m.needImport ?? 0) > 0).flatMap((m) => countriesOf(m.importCountry)));
  const withImport = ms.filter((m) => (m.needImport ?? 0) > 0);
  const noCountry = withImport.filter((m) => !m.importCountry);
  const perApp = ds.applications.map((a) => {
    const mine = ms.filter((m) => m.applicationId === a.id);
    return { a, domestic: sumIn(mine, unit, (m) => m.unit, (m) => m.needDomestic), imported: sumIn(mine, unit, (m) => m.unit, (m) => m.needImport) };
  }).filter((r) => r.domestic || r.imported).sort((x, y) => y.imported - x.imported);
  const blocks: Block[] = [{ t: "sub", num: "4.1", title: "Sumber Pemenuhan Kebutuhan Bahan Baku" }];
  blocks.push({ t: "p", text: domestic + imported
    ? `Dalam satuan ${unit}, kebutuhan bahan baku/penolong per tahun direncanakan dipenuhi dari dalam negeri sebesar ${nf(domestic)} ${unit} (${ratio(domestic, domestic + imported)}) dan dari impor sebesar ${nf(imported)} ${unit} (${ratio(imported, domestic + imported)}). Stok bahan baku yang tercatat sebesar ${nf(stock)} ${unit}. Rencana impor terbesar diajukan oleh ${joinId(perApp.slice(0, 3).map((r) => `${r.a.company} (${nf(r.imported)} ${unit})`))}.`
    : "Belum ada rencana kebutuhan bahan baku yang dapat dijumlahkan pada periode ini." });
  if (domestic + imported) blocks.push({ t: "fig", num: "4.1", title: `Rencana Kebutuhan Dalam Negeri dan Impor per Perusahaan (${unit})`, source: `${SOURCE}. Hanya bahan baku dalam satuan ${unit}.`, fig: { k: "hbar", rows: perApp.slice(0, 10).map((r) => ({ key: r.a.company, desc: `dalam negeri ${compact(r.domestic)} · impor ${ratio(r.imported, r.domestic + r.imported)}`, value: r.imported })), keyWidth: 200 } });
  blocks.push({ t: "sub", num: "4.2", title: "Negara Asal Rencana Impor" });
  blocks.push({ t: "p", text: withImport.length
    ? `${withImport.length} bahan baku/penolong direncanakan diimpor sebagian atau seluruhnya. ${countries.length ? `Negara asal yang paling banyak disebut adalah ${joinId(countries.slice(0, 4).map(([c, n]) => `${title(c)} (${n})`))}.` : ""}${noCountry.length ? ` ${noCountry.length} bahan baku impor belum mencantumkan negara asal.` : ""}`
    : "Belum ada rencana impor bahan baku pada periode ini." });
  if (countries.length) blocks.push({ t: "fig", num: "4.2", title: "Negara Asal Rencana Impor Bahan Baku", source: `${SOURCE}. Jumlah bahan baku impor yang menyebut negara tersebut.`, fig: { k: "hbar", rows: countries.slice(0, 10).map(([c, n]) => ({ key: title(c), value: n })), total: withImport.length, keyWidth: 150 } });
  blocks.push({ t: "table", num: "4.1", title: "Rencana Kebutuhan dan Impor Bahan Baku/Penolong", headers: ["Perusahaan", "Bahan Baku", "Stok", "Dalam Negeri", "Impor", "Negara Asal", "Satuan"],
    rows: ms.map((m) => [m.company, m.name, m.stock ?? "—", m.needDomestic ?? "—", m.needImport ?? "—", m.importCountry || "—", m.unit || "—"]), source: SOURCE });
  if (domestic + imported) blocks.push({ t: "highlights", items: [`${ratio(imported, domestic + imported)} kebutuhan bahan baku (${unit}) direncanakan dipenuhi dari impor.`, countries[0] ? `Negara asal yang paling banyak disebut: ${title(countries[0][0])}.` : ""].filter(Boolean) });
  blocks.push({ t: "limits", items: ["Rencana impor dan negara asal mengikuti isian perusahaan; negara asal ditulis bebas dan dipisahkan menurut tanda koma.", "Rencana impor merupakan rencana, bukan realisasi impor."] });
  return { n: 4, title: "Rencana Impor & Negara Asal", lead: "Pemenuhan kebutuhan bahan baku dari dalam negeri dan impor, beserta negara asal rencana impor.", scope: ["Sumber pemenuhan kebutuhan", "Negara asal rencana impor"], stats: [[ratio(imported, domestic + imported), "Porsi impor"], [String(countries.length), "Negara asal"]], blocks };
}

function bab5(ds: VkiDataset): Chapter {
  const mc = ds.machines;
  const units = sum(mc.map((m) => m.count));
  const cond = segsOf(mc.flatMap((m) => Array<string>(Math.max(1, Math.round(m.count))).fill(m.condition || UNKNOWN)), ["Aktif", "Tidak Aktif", UNKNOWN]);
  const proc = ranked(mc.flatMap((m) => Array<string>(Math.max(1, Math.round(m.count))).fill(m.process || UNKNOWN)));
  const perApp = ds.applications.map((a) => ({ a, n: sum(mc.filter((m) => m.applicationId === a.id).map((m) => m.count)) })).sort((x, y) => y.n - x.n);
  const none = perApp.filter((r) => !r.n);
  const blocks: Block[] = [{ t: "sub", num: "5.1", title: "Mesin dan Peralatan Produksi" }];
  blocks.push({ t: "p", text: mc.length
    ? `Perusahaan industri melaporkan ${nf(units)} unit mesin dan peralatan (${mc.length} jenis), sebagaimana disyaratkan Pasal 30 ayat (2) huruf b angka 4. Menurut kondisi, ${phraseCounts(cond, "unit")}. Proses produksi yang paling banyak didukung mesin adalah ${joinId(proc.slice(0, 3).map(([p, n]) => `${p.toLowerCase()} (${n} unit)`))}.${none.length ? ` ${none.length} perusahaan belum mencatat data mesin.` : ""}`
    : "Belum ada data mesin yang dicatat pada periode ini." });
  if (mc.length) blocks.push({ t: "fig", num: "5.1", title: "Mesin menurut Kondisi dan Proses Produksi", source: `${SOURCE}. Jumlah unit.`, fig: { k: "donuts", items: [{ cap: "Kondisi mesin", center: nf(units), sub: "unit", segs: cond }, { cap: "Proses produksi", center: String(proc.length), sub: "proses", segs: proc.slice(0, 5).map(([label, value]) => ({ label, value })) }] } });
  blocks.push({ t: "table", num: "5.1", title: "Daftar Mesin dan Peralatan", headers: ["Perusahaan", "Mesin", "Merek/Model", "Jumlah", "Proses", "Kapasitas", "Kondisi"],
    rows: mc.map((m) => [m.company, m.name, m.brand || "—", m.count, m.process || "—", m.capacity === null ? "—" : `${nf(m.capacity)} ${m.capacityUnit}`.trim(), m.condition || "—"]), source: SOURCE });
  if (mc.length) blocks.push({ t: "highlights", items: [`${nf(units)} unit mesin, ${own(cond, "Aktif")} unit dalam kondisi aktif.`, perApp[0]?.n ? `Mesin terbanyak dimiliki ${perApp[0].a.company} (${nf(perApp[0].n)} unit).` : ""].filter(Boolean) });
  blocks.push({ t: "limits", items: ["Data mesin mengikuti isian perusahaan dan diperiksa pada verifikasi lapangan."] });
  return { n: 5, title: "Mesin & Peralatan", lead: "Mesin dan peralatan produksi yang dimiliki perusahaan, kondisinya dan proses produksi yang didukung.", scope: ["Mesin dan peralatan produksi"], stats: [[nf(units), "Unit mesin"], [String(own(cond, "Aktif")), "Unit aktif"]], blocks };
}

function bab6(ds: VkiDataset): Chapter {
  const wf = ds.workforce;
  const el = ds.electricity;
  const total = sum(wf.map((w) => w.count));
  const catSum = [...new Set(wf.map((w) => w.category))].map((c) => ({ label: c, value: sum(wf.filter((w) => w.category === c).map((w) => w.count)) })).sort((a, b) => b.value - a.value);
  const perApp = ds.applications.map((a) => {
    const months = el.filter((e) => e.applicationId === a.id && e.kwh !== null);
    return { a, people: sum(wf.filter((w) => w.applicationId === a.id).map((w) => w.count)), months: months.length, avgKwh: months.length ? sum(months.map((m) => m.kwh ?? 0)) / months.length : null, avgRp: months.length ? sum(months.map((m) => m.nominal ?? 0)) / months.length : null };
  }).sort((x, y) => y.people - x.people);
  const noBills = perApp.filter((r) => r.months < 3);
  const blocks: Block[] = [{ t: "sub", num: "6.1", title: "Tenaga Kerja" }];
  blocks.push({ t: "p", text: wf.length
    ? `Perusahaan industri melaporkan ${nf(total)} tenaga kerja (Pasal 30 ayat (2) huruf b angka 3), terdiri atas ${joinId(catSum.slice(0, 4).map((c) => `${c.label.toLowerCase()} ${nf(c.value)} orang`))}. Tenaga kerja terbanyak dimiliki ${perApp[0]?.a.company} (${nf(perApp[0]?.people ?? 0)} orang).`
    : "Belum ada data tenaga kerja yang dicatat pada periode ini." });
  if (wf.length) blocks.push({ t: "fig", num: "6.1", title: "Tenaga Kerja per Perusahaan", source: `${SOURCE}. Jumlah orang.`, fig: { k: "hbar", rows: perApp.filter((r) => r.people).slice(0, 10).map((r) => ({ key: r.a.company, value: r.people })), total, keyWidth: 200 } });
  blocks.push({ t: "sub", num: "6.2", title: "Pemakaian Energi Listrik" });
  blocks.push({ t: "p", text: el.length
    ? `Bukti pembayaran listrik 3 (tiga) bulan sebelumnya disyaratkan Pasal 30 ayat (2) huruf b angka 8 dan dianalisis Technical Analyst untuk menilai kesesuaian pemakaian energi dengan kapasitas produksi. Rata-rata pemakaian per bulan tercatat pada ${perApp.filter((r) => r.avgKwh !== null).length} perusahaan${noBills.length ? `; ${noBills.length} perusahaan mencatat kurang dari 3 bulan tagihan (${joinId(noBills.map((r) => r.a.company))})` : ""}.`
    : "Belum ada data pemakaian listrik yang dicatat pada periode ini." });
  blocks.push({ t: "table", num: "6.1", title: "Tenaga Kerja dan Pemakaian Listrik per Perusahaan", headers: ["Perusahaan", "Tenaga Kerja (orang)", "Bulan Tagihan", "Rata-rata kWh/Bulan", "Rata-rata Tagihan (Rp)"],
    rows: perApp.map((r) => [r.a.company, r.people, r.months, r.avgKwh === null ? "—" : Math.round(r.avgKwh), r.avgRp === null ? "—" : Math.round(r.avgRp)]), source: SOURCE });
  if (wf.length || el.length) blocks.push({ t: "highlights", items: [`${nf(total)} tenaga kerja dilaporkan.`, noBills.length ? `${noBills.length} perusahaan mencatat kurang dari 3 bulan tagihan listrik.` : "Seluruh perusahaan mencatat sedikitnya 3 bulan tagihan listrik."] });
  blocks.push({ t: "limits", items: ["Jumlah tenaga kerja dan pemakaian listrik mengikuti isian perusahaan beserta dokumen pendukungnya."] });
  return { n: 6, title: "Tenaga Kerja & Energi Listrik", lead: "Jumlah tenaga kerja dan pemakaian energi listrik sebagai indikator kegiatan produksi.", scope: ["Tenaga kerja", "Pemakaian energi listrik"], stats: [[nf(total), "Tenaga kerja"], [String(el.length), "Bulan tagihan"]], blocks };
}

function bab7(ds: VkiDataset): Chapter {
  const ps = ds.products.filter((p) => p.salesDomestic !== null || p.salesExport !== null);
  const unit = mainUnit(ps.map((p) => p.salesUnit));
  const dom = sumIn(ps, unit, (p) => p.salesUnit, (p) => p.salesDomestic);
  const exp = sumIn(ps, unit, (p) => p.salesUnit, (p) => p.salesExport);
  const dest = ranked(ps.filter((p) => (p.salesExport ?? 0) > 0).flatMap((p) => countriesOf(p.exportDestination)));
  const exporters = uniq(ps.filter((p) => (p.salesExport ?? 0) > 0).map((p) => p.company));
  const blocks: Block[] = [{ t: "sub", num: "7.1", title: "Penjualan Dalam Negeri dan Ekspor" }];
  blocks.push({ t: "p", text: dom + exp
    ? `Dalam satuan ${unit}, penjualan produk direncanakan ${nf(dom)} ${unit} di dalam negeri (${ratio(dom, dom + exp)}) dan ${nf(exp)} ${unit} untuk ekspor (${ratio(exp, dom + exp)}). ${exporters.length ? `${exporters.length} perusahaan melakukan ekspor${dest.length ? `, terutama ke ${joinId(dest.slice(0, 4).map(([c, n]) => `${title(c)} (${n})`))}` : ""}.` : "Tidak ada perusahaan yang mencatat penjualan ekspor."} Bahan baku impor VKI digunakan untuk produksi sendiri dan tidak untuk diperjualbelikan.`
    : "Belum ada data penjualan produk pada periode ini." });
  if (dest.length) blocks.push({ t: "fig", num: "7.1", title: "Negara Tujuan Ekspor", source: `${SOURCE}. Jumlah produk yang diekspor ke negara tersebut.`, fig: { k: "hbar", rows: dest.slice(0, 10).map(([c, n]) => ({ key: title(c), value: n })), keyWidth: 150 } });
  blocks.push({ t: "table", num: "7.1", title: "Penjualan Produk", headers: ["Perusahaan", "Produk", "Dalam Negeri", "Ekspor", "Negara Tujuan", "Satuan"],
    rows: ps.map((p) => [p.company, p.name, p.salesDomestic ?? "—", p.salesExport ?? "—", p.exportDestination || "—", p.salesUnit || "—"]), source: SOURCE });
  if (dom + exp) blocks.push({ t: "highlights", items: [`${ratio(exp, dom + exp)} penjualan (${unit}) untuk ekspor.`, `${exporters.length} perusahaan mencatat penjualan ekspor.`] });
  blocks.push({ t: "limits", items: ["Penjualan mengikuti isian perusahaan; negara tujuan ditulis bebas dan dipisahkan menurut tanda koma."] });
  return { n: 7, title: "Penjualan Produk", lead: "Penjualan produk di dalam negeri dan ekspor beserta negara tujuan.", scope: ["Penjualan dalam negeri dan ekspor"], stats: [[ratio(exp, dom + exp), "Porsi ekspor"], [String(exporters.length), "Eksportir"]], blocks };
}

const MODULE_LABEL: Record<VkiModuleKey, string> = { listrik: "Energi Listrik", kapasitas: "Kapasitas Produksi", bahanbaku: "Kebutuhan Bahan Baku" };

function bab8(ds: VkiDataset): Chapter {
  const keys: VkiModuleKey[] = ["listrik", "kapasitas", "bahanbaku"];
  const per = keys.map((k) => ({ k, segs: statusCounts(ds.analysis.filter((x) => x.moduleKey === k).map((x) => x.status)) }));
  const apps = ds.applications;
  const allOk = apps.filter((a) => keys.every((k) => ds.analysis.find((x) => x.applicationId === a.id && x.moduleKey === k)?.status.label === "Sesuai"));
  const notOk = ds.analysis.filter((x) => x.status.label === "Tidak Sesuai");
  const concl = ds.analysis.filter((x) => x.conclusion);
  const blocks: Block[] = [{ t: "sub", num: "8.1", title: "Hasil Analisis Teknis per Modul" }];
  blocks.push({ t: "p", text: apps.length
    ? `Analisis teknis VKI (Pasal 31 ayat (2) huruf b dan Pasal 32 ayat (3) huruf c–f) terdiri atas tiga modul: kebutuhan dan pemakaian energi listrik, kapasitas produksi, dan kebutuhan bahan baku. ${per.map((p) => `Pada modul ${MODULE_LABEL[p.k]}, ${phraseCounts(p.segs, "permohonan")}`).join(". ")}. ${allOk.length} dari ${apps.length} permohonan dinyatakan sesuai pada ketiga modul.`
    : "Belum ada analisis teknis pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "8.1", title: "Keputusan Technical Analyst per Modul", source: SOURCE, fig: { k: "donuts", items: per.map((p) => ({ cap: MODULE_LABEL[p.k], center: String(sum(p.segs.map((s) => s.value))), sub: "permohonan", segs: p.segs })) } });
  blocks.push({ t: "table", num: "8.1", title: "Keputusan Analisis Teknis per Permohonan", headers: ["Perusahaan", "Nomor Permohonan", ...keys.map((k) => MODULE_LABEL[k])],
    rows: apps.map((a) => [a.company, a.applicationNumber, ...keys.map((k) => ds.analysis.find((x) => x.applicationId === a.id && x.moduleKey === k)?.status.label ?? "—")]), source: SOURCE });
  blocks.push({ t: "sub", num: "8.2", title: "Kesimpulan Analisis Teknis" });
  blocks.push({ t: "p", text: notOk.length ? `${notOk.length} keputusan modul dinyatakan Tidak Sesuai, yaitu ${joinId(notOk.map((x) => `${x.company} (${MODULE_LABEL[x.moduleKey]})`))}.` : concl.length ? "Tidak ada modul yang dinyatakan Tidak Sesuai. Kesimpulan Technical Analyst disajikan pada Tabel 8.2." : "Belum ada kesimpulan analisis teknis yang dicatat." });
  if (concl.length) blocks.push({ t: "table", num: "8.2", title: "Kesimpulan Technical Analyst", headers: ["Perusahaan", "Modul", "Keputusan", "Kesimpulan"], rows: concl.map((x) => [x.company, MODULE_LABEL[x.moduleKey], x.status.label, x.conclusion]), source: SOURCE });
  if (apps.length) blocks.push({ t: "highlights", items: [`${allOk.length} dari ${apps.length} permohonan sesuai pada ketiga modul analisis teknis.`, notOk.length ? `${notOk.length} keputusan modul Tidak Sesuai.` : "Tidak ada keputusan modul Tidak Sesuai."] });
  blocks.push({ t: "limits", items: ["Keputusan dan kesimpulan mengikuti hasil analisis teknis yang disimpan Technical Analyst; modul yang belum dianalisis dicatat sebagai Belum Dianalisis."] });
  return { n: 8, title: "Analisis Teknis", lead: "Keputusan Technical Analyst atas energi listrik, kapasitas produksi dan kebutuhan bahan baku.", scope: ["Hasil per modul", "Kesimpulan analisis teknis"], stats: [[String(allOk.length), "Sesuai 3 modul"], [String(notOk.length), "Modul tidak sesuai"]], blocks };
}

function bab9(ds: VkiDataset): Chapter {
  const apps = ds.applications;
  const groups: [string, P47Place[]][] = [["kantor", apps.flatMap((a) => (a.kantor ? [a.kantor] : []))], ["pabrik", apps.flatMap((a) => a.pabrik)], ["gudang", apps.flatMap((a) => a.gudang)]];
  const ownSegs = (ps: P47Place[]) => segsOf(ps.map((p) => p.ownership || UNKNOWN), ["Milik Sendiri", "Sewa", UNKNOWN]);
  const conclSegs = (ps: P47Place[]) => segsOf(ps.map((p) => p.fieldConclusion || "Belum disimpulkan"), ["Sesuai", "Tidak Sesuai", "Belum disimpulkan"]);
  const cText = (segs: Seg[], n: number, what: string) => [`${own(segs, "Sesuai")} dari ${n} lokasi ${what} sesuai`, own(segs, "Tidak Sesuai") ? `${own(segs, "Tidak Sesuai")} tidak sesuai` : "", own(segs, "Belum disimpulkan") ? `${own(segs, "Belum disimpulkan")} belum disimpulkan` : ""].filter(Boolean).join(", ");
  const provinces = ranked(groups[1][1].map((p) => title(p.province) || UNKNOWN));
  const blocks: Block[] = [{ t: "sub", num: "9.1", title: "Kantor, Pabrik dan Gudang" }];
  blocks.push({ t: "p", text: apps.length
    ? `Perusahaan industri mencatat ${groups.map(([w, ps]) => `${ps.length} ${w}`).join(", ")}. ${groups.map(([w, ps]) => `${own(ownSegs(ps), "Milik Sendiri")} ${w} berstatus milik sendiri`).join(", ")}. Pabrik terbanyak berada di ${joinId(provinces.slice(0, 3).map(([p, n]) => `${p} (${n})`)) || "—"}.`
    : "Belum ada lokasi pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "9.1", title: "Status Kepemilikan Lokasi", source: `${SOURCE}. Status bangunan pada data lokasi.`, fig: { k: "donuts", items: groups.filter(([, ps]) => ps.length).map(([w, ps]) => ({ cap: title(w), center: String(ps.length), sub: w, segs: ownSegs(ps) })) } });
  blocks.push({ t: "sub", num: "9.2", title: "Hasil Verifikasi Lapangan" });
  blocks.push({ t: "p", text: apps.length
    ? `Verifikasi lapangan menilai kesesuaian data dan dokumen dengan kondisi di lapangan (Pasal 31 ayat (2) huruf a). Surveyor menyimpulkan ${groups.filter(([, ps]) => ps.length).map(([w, ps]) => cText(conclSegs(ps), ps.length, w)).join("; ")}.`
    : "Belum ada hasil verifikasi lapangan pada periode ini." });
  if (apps.length) blocks.push({ t: "fig", num: "9.2", title: "Kesimpulan Verifikasi Lapangan", source: `${SOURCE}. Kesimpulan surveyor per lokasi.`, fig: { k: "donuts", items: groups.filter(([, ps]) => ps.length).map(([w, ps]) => ({ cap: `Lokasi ${w}`, center: String(ps.length), sub: w, segs: conclSegs(ps) })) } });
  blocks.push({ t: "table", num: "9.1", title: "Lokasi Perusahaan Industri", headers: ["Perusahaan", "Lokasi Kantor", "Lokasi Pabrik", "Status Pabrik", "Lokasi Gudang", "Kesimpulan Lapangan"],
    rows: [...apps].sort((a, b) => a.company.localeCompare(b.company)).map((a) => [a.company, loc(a.kantor), uniq(a.pabrik.map(loc)).join("; ") || "—", uniq(a.pabrik.map((p) => p.ownership || UNKNOWN)).join(", ") || "—", uniq(a.gudang.map(loc)).join("; ") || "—", uniq([a.kantor, ...a.pabrik, ...a.gudang].filter(Boolean).map((p) => p!.fieldConclusion || "Belum")).join(", ") || "—"]), source: SOURCE });
  if (apps.length) blocks.push({ t: "highlights", items: [`${groups[1][1].length} pabrik tercatat.`, `Verifikasi lapangan pabrik: ${cText(conclSegs(groups[1][1]), groups[1][1].length, "pabrik")}.`] });
  blocks.push({ t: "limits", items: ["Lokasi dan status kepemilikan mengikuti data lokasi perusahaan yang dipilih pada permohonan."] });
  return { n: 9, title: "Fasilitas & Lokasi", lead: "Kantor, pabrik dan gudang perusahaan industri: kepemilikan, lokasi dan hasil verifikasi lapangan.", scope: ["Kantor, pabrik dan gudang", "Hasil verifikasi lapangan"], stats: [[String(groups[1][1].length), "Pabrik"], [String(groups[2][1].length), "Gudang"]], blocks };
}

function bab10(ds: VkiDataset, report: P47Report): Chapter {
  const f = ds.findings;
  const sources = segsOf(f.map((x) => x.source), ["Verifikasi Dokumen", "Survei Lapangan", "Analisis Teknis", "Verifikasi Produk"]);
  const severity = segsOf(f.map((x) => x.severity), ["Critical", "Major", "Minor"]);
  const mat = segsOf(f.map((x) => MATERIALITY_LABEL[materialityOf(report, x.key)]), ["Material", "Needs Review", "Non-Material"]);
  const material = f.filter((x) => materialityOf(report, x.key) === "MATERIAL");
  const rank = { Critical: 0, Major: 1, Minor: 2 } as const;
  const rec: string[] = [];
  if (material.length) rec.push(`Menindaklanjuti ${material.length} temuan material sebelum laporan disampaikan, terutama pada ${joinId(uniq(material.map((x) => x.company)).slice(0, 3))}.`);
  if (own(mat, "Needs Review")) rec.push(`Menetapkan materialitas ${own(mat, "Needs Review")} temuan yang masih berstatus Needs Review.`);
  const ta = ds.analysis.filter((x) => x.status.label === "Belum Dianalisis");
  if (ta.length) rec.push(`Menyelesaikan ${ta.length} modul analisis teknis yang belum dianalisis.`);
  const noLhvki = ds.applications.filter((a) => lhviuStatus(a).label === "Belum Diunggah");
  if (noLhvki.length) rec.push(`Mengunggah LHVKI untuk ${noLhvki.length} permohonan yang telah selesai diverifikasi.`);
  const noDate = ds.applications.filter((a) => a.lhviu && !a.lhviu.issuedAt);
  if (noDate.length) rec.push(`Mencatat nomor dan tanggal terbit ${noDate.length} LHVKI agar masa berlaku 3 (tiga) tahun dapat dipantau.`);
  if (!rec.length) rec.push("Tidak ada tindak lanjut yang perlu dilakukan sebelum laporan disampaikan.");
  const blocks: Block[] = [{ t: "sub", num: "10.1", title: "Temuan Pelaksanaan Verifikasi" }];
  blocks.push({ t: "p", text: f.length ? `Selama periode laporan tercatat ${withWords(f.length)} temuan dari ${uniq(f.map((x) => x.applicationId)).length} permohonan: ${phraseCounts(sources, "temuan dari")}. Menurut tingkat keparahan, ${phraseCounts(severity, "temuan")}.` : "Tidak ada temuan yang tercatat pada periode ini." });
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

function intro(ds: VkiDataset, report: P47Report): string[] {
  return [
    `Laporan ini disusun sebagai pelaporan pelaksanaan Verifikasi Kemampuan Industri (VKI) sebagaimana diamanatkan Pasal 47 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, untuk disampaikan kepada Menteri Perindustrian melalui Direktur Jenderal Industri Kimia, Farmasi dan Tekstil. Laporan mencakup periode ${periodText(ds)}.`,
    "VKI dilakukan terhadap Perusahaan API-P atau Perusahaan Industri yang memiliki kontrak kerja sama dan/atau kontrak jual beli bahan baku dan/atau bahan penolong dengan Perusahaan API-U (Pasal 25), atas impor Tekstil dan/atau Produk Tekstil yang digunakan sebagai bahan baku dan/atau bahan penolong produksinya sendiri. Verifikasi meliputi pemeriksaan data dan dokumen (Pasal 30 ayat (2)), verifikasi lapangan atas kesesuaian data dengan kondisi di lapangan, serta analisis teknis kebutuhan energi listrik, kapasitas produksi dan kebutuhan bahan baku (Pasal 31), yang hasilnya dituangkan dalam LHVKI (Pasal 32 ayat (3)).",
    `Seluruh angka dalam laporan dihimpun dari data permohonan, hasil verifikasi dokumen, laporan survei lapangan dan analisis teknis yang tercatat pada sistem per ${fdLong(ds.generatedAt)}. Permohonan dimasukkan ke periode laporan menurut Tanggal Terbit LHVKI, atau Tanggal Pengajuan bila tanggal terbit belum dicatat. Kuantitas hanya dijumlahkan di dalam satuan yang sama.`,
    `Laporan terdiri atas sepuluh bab: data perusahaan industri; produk dan kapasitas produksi; bahan baku dan pos tarif; rencana impor dan negara asal; mesin dan peralatan; tenaga kerja dan energi listrik; penjualan produk; analisis teknis; fasilitas dan lokasi; serta temuan dan rekomendasi, diikuti kesimpulan. Status laporan saat ini: ${report.status === "APPROVED" ? "disetujui" : report.status === "REVIEWED" ? "telah ditelaah" : "draf"}.`,
  ];
}

/** The whole VKI report model for one period. */
export function vkiReport(ds: VkiDataset, report: P47Report): ChapterReportModel {
  const chapters = [bab1(ds), bab2(ds), bab3(ds), bab4(ds), bab5(ds), bab6(ds), bab7(ds), bab8(ds), bab9(ds), bab10(ds, report)];
  const apps = ds.applications;
  const mUnit = mainUnit(ds.materials.map((m) => m.unit));
  const firstHighlight = (c: Chapter) => c.blocks.find((b): b is Extract<Block, { t: "highlights" }> => b.t === "highlights")?.items[0];
  const material = ds.findings.filter((x) => materialityOf(report, x.key) === "MATERIAL").length;
  const conclusion = !apps.length
    ? [{ title: "Kesimpulan", paragraphs: [`Pada periode ${periodText(ds)} belum terdapat pelaksanaan Verifikasi Kemampuan Industri. Laporan ini disampaikan sebagai laporan nihil.`] }]
    : [
        { title: "Pelaksanaan VKI", paragraphs: [`Pada periode ${periodText(ds)} telah dilaksanakan VKI atas ${apps.length} permohonan dari ${uniq(apps.map((a) => a.companyId ?? a.company)).length} perusahaan industri; ${apps.filter((a) => a.lhviu).length} LHVKI telah terbit.`] },
        { title: "Pokok Hasil", paragraphs: chapters.map(firstHighlight).filter((t): t is string => Boolean(t)) },
        { title: "Temuan", paragraphs: [ds.findings.length ? `Tercatat ${ds.findings.length} temuan, ${material} di antaranya ditetapkan material oleh Project Manager. Rekomendasi tindak lanjut disajikan pada Bab 10.` : "Tidak ada temuan yang tercatat selama periode laporan."] },
        ...(report.pmNote.trim() ? [{ title: "Catatan Project Manager", paragraphs: report.pmNote.trim().split(/\n+/) }] : []),
      ];
  return {
    chapters,
    intro: intro(ds, report),
    summary: {
      tiles: [
        [String(uniq(apps.map((a) => a.companyId ?? a.company)).length), "PERUSAHAAN INDUSTRI", `${apps.length} permohonan`],
        [`${apps.filter((a) => a.lhviu).length}/${apps.length}`, "LHVKI TERBIT", "file LHVKI diunggah"],
        [String(ds.products.length), "PRODUK", `${uniq(ds.products.map((p) => p.hs).filter(Boolean)).length} pos tarif/HS`],
        [compact(sumIn(ds.materials, mUnit, (m) => m.unit, (m) => m.needImport)), "RENCANA IMPOR", mUnit ? `bahan baku dalam ${mUnit}` : "—"],
        [nf(sum(ds.machines.map((m) => m.count))), "MESIN", `${nf(sum(ds.workforce.map((w) => w.count)))} tenaga kerja`],
        [String(ds.findings.length), "TEMUAN", `${material} material`],
      ],
      highlights: apps.length ? chapters.map((c) => [c, firstHighlight(c)] as const).filter(([, t]) => t).map(([c, t]) => `Bab ${c.n} — ${t}`) : [],
      alerts: [
        ...(apps.length ? [] : ["Belum ada permohonan VKI pada periode ini; laporan berisi laporan nihil."]),
        ...(apps.some((a) => !a.lhviu) ? [`${apps.filter((a) => !a.lhviu).length} permohonan belum memiliki LHVKI.`] : []),
        ...(ds.analysis.some((x) => x.status.label === "Belum Dianalisis") ? [`${ds.analysis.filter((x) => x.status.label === "Belum Dianalisis").length} modul analisis teknis belum dianalisis.`] : []),
        ...(ds.findings.some((x) => !report.materiality[x.key]) ? [`${ds.findings.filter((x) => !report.materiality[x.key]).length} temuan belum ditetapkan materialitasnya.`] : []),
      ],
    },
    conclusion,
  };
}
