import { unitsOf } from "./derive";
import { compact, fdLong, joinId, nf, sum, sym, uniq, withWords } from "./format";
import { rupiahValuer } from "./report-value";
import type { P47Dataset, P47Line } from "./types";

/*
 * Bab 2 "Komoditas & Pos Tarif/HS" of the Laporan Pelaksanaan VIU — kelompok komoditas, sebaran pos
 * tarif menurut bab BTKI, rencana kebutuhan per pos tarif, rencana impor per bulan terbit LHVIU and
 * ragam komoditas per perusahaan. Counted from the dataset; quantities never summed across units and
 * values never across currencies.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pct1 = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "0%");
const monthLong = (key: string) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/** Bab BTKI (first two digits of the pos tarif) with a short Indonesian description. */
const BTKI_BAB: Record<string, string> = {
  "50": "Sutra", "51": "Wol dan bulu hewan", "52": "Kapas", "53": "Serat tekstil nabati lainnya", "54": "Filamen buatan",
  "55": "Serat stapel buatan", "56": "Gumpalan, kain kempa, tali", "57": "Karpet & penutup lantai", "58": "Kain tenun khusus",
  "59": "Kain diresapi/dilapisi", "60": "Kain rajutan", "61": "Pakaian rajutan", "62": "Pakaian bukan rajutan",
  "63": "Barang tekstil jadi lainnya", "64": "Alas kaki", "65": "Tutup kepala", "96": "Barang lain-lain (mis. popok 96.19)",
};
const hsDigits = (hs: string) => hs.replace(/^ex\.?\s*/i, "").replace(/[^0-9]/g, "");
export const btkiBab = (hs: string) => hsDigits(hs).slice(0, 2) || "—";
export const btkiLabel = (bab: string) => `Bab ${bab}${BTKI_BAB[bab] ? ` · ${BTKI_BAB[bab]}` : ""}`;
const isTextileChapter = (bab: string) => Number(bab) >= 50 && Number(bab) <= 63;

export type Bab2Group = { kelompok: string; hs: number; lines: number; companies: number; qty: number[] };
export type Bab2Month = { key: string; label: string; viu: number; lines: number; qty: number; value: number; companies: [string, number, number][] };
export type RankItem = { key: string; label: string; value: number; note: string };

export type Bab2 = {
  units: string[];
  unit: string;
  currency: string;
  /** Product lines in a foreign currency without a kurs — left out of every value. */
  unconverted: number;
  totalQty: number[];
  totalValue: number;
  groups: Bab2Group[];
  chapters: { bab: string; label: string; qty: number; value: number; lines: number }[];
  topVolume: RankItem[];
  topValue: RankItem[];
  hsTable: (string | number)[][];
  months: Bab2Month[];
  undatedViu: number;
  monthSeries: { label: string; values: number[] }[];
  companyTable: (string | number)[][];
  groupTable: (string | number)[][];
  highlights: string[];
  sub21: string[];
  sub22: string[];
  sub23: string[];
  sub24: string[];
  sub25: string[];
  limits: string[];
};

export function bab2(ds: P47Dataset): Bab2 {
  const lines = ds.lines;
  const units = unitsOf(lines).slice(0, 2);
  const unit = units[0] ?? "PCS";
  // Values in Rupiah: IDR as is, foreign currencies converted with the analyst's kurs (report-value.ts).
  const currency = "IDR";
  const toRupiah = rupiahValuer(ds);
  const unconverted = lines.filter((l) => toRupiah(l) === null).length;
  const qtyIn = (ls: P47Line[], u: string) => sum(ls.filter((l) => l.unit === u).map((l) => l.quantity));
  const valueOf = (ls: P47Line[]) => sum(ls.map((l) => toRupiah(l) ?? 0));
  const money = (v: number) => `${sym(currency)} ${compact(v)}`;
  const companiesOf = (ls: P47Line[]) => uniq(ls.map((l) => l.applicationId)).length;
  const totalQty = units.map((u) => qtyIn(lines, u));
  const totalValue = valueOf(lines);
  const allHs = uniq(lines.map((l) => l.hs));
  const appsWithLines = uniq(lines.map((l) => l.applicationId));

  // 2.1 Kelompok komoditas -------------------------------------------------------------------
  const groups: Bab2Group[] = uniq(lines.map((l) => l.kelompok || "Tidak diisi"))
    .map((kelompok) => {
      const ls = lines.filter((l) => (l.kelompok || "Tidak diisi") === kelompok);
      return { kelompok, hs: uniq(ls.map((l) => l.hs)).length, lines: ls.length, companies: companiesOf(ls), qty: units.map((u) => qtyIn(ls, u)) };
    })
    .sort((a, b) => b.lines - a.lines);
  const groupTable: (string | number)[][] = [
    ...groups.map((g) => [g.kelompok, g.hs, g.lines, g.companies, ...g.qty]),
    ["Total", allHs.length, lines.length, appsWithLines.length, ...totalQty],
  ];

  // 2.2 Bab BTKI -----------------------------------------------------------------------------
  const chapters = uniq(lines.map((l) => btkiBab(l.hs)))
    .map((bab) => {
      const ls = lines.filter((l) => btkiBab(l.hs) === bab);
      return { bab, label: btkiLabel(bab), qty: qtyIn(ls, unit), value: valueOf(ls), lines: ls.length };
    })
    .sort((a, b) => b.lines - a.lines);
  const exHs = allHs.filter((h) => /^ex/i.test(h.trim()));
  const outside = uniq(allHs.filter((h) => !isTextileChapter(btkiBab(h))));

  // 2.3 Per pos tarif ------------------------------------------------------------------------
  const perHs = allHs.map((hs) => {
    const ls = lines.filter((l) => l.hs === hs);
    const hsUnits = uniq(ls.map((l) => l.unit || "—"));
    return {
      hs, ls, description: ls[0].hsDescription || ls[0].komoditas || ls[0].subKelompok || "", kelompok: ls[0].kelompok || "",
      companies: companiesOf(ls), qtyMain: qtyIn(ls, unit), value: valueOf(ls), units: hsUnits,
      quantity: hsUnits.length === 1 ? sum(ls.map((l) => l.quantity)) : NaN,
    };
  });
  const rank = (key: "qtyMain" | "value") => [...perHs].filter((h) => h[key] > 0).sort((a, b) => b[key] - a[key]).slice(0, 10)
    .map((h): RankItem => ({ key: h.hs, label: h.description, value: h[key], note: `${h.companies} API-U` }));
  const topVolume = rank("qtyMain");
  const topValue = rank("value");
  const hsTable = [...perHs]
    .sort((a, b) => b.qtyMain - a.qtyMain || b.ls.length - a.ls.length)
    .map((h) => [h.hs, h.description || "—", h.kelompok || "—", h.companies, h.ls.length, Number.isNaN(h.quantity) ? "Satuan berbeda" : h.quantity, h.units.join(" / ")]);

  // 2.4 Per bulan terbit LHVIU ---------------------------------------------------------------
  const months: Bab2Month[] = [];
  for (let d = new Date(`${ds.period.from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= ds.period.to.slice(0, 7) && months.length < 24; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const key = d.toISOString().slice(0, 7);
    months.push({ key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`, viu: 0, lines: 0, qty: 0, value: 0, companies: [] });
  }
  let undatedViu = 0;
  for (const app of ds.applications) {
    const ls = lines.filter((l) => l.applicationId === app.id);
    const month = app.lhviu?.issuedAt ? months.find((m) => m.key === app.lhviu!.issuedAt!.slice(0, 7)) : undefined;
    if (!month) {
      if (app.lhviu) undatedViu += 1;
      continue;
    }
    month.viu += 1;
    month.lines += ls.length;
    month.qty += qtyIn(ls, unit);
    month.value += valueOf(ls);
    month.companies.push([app.company, qtyIn(ls, unit), valueOf(ls)]);
  }
  const topChapters = chapters.slice(0, 4).map((c) => c.bab);
  const monthSeries = topChapters.map((bab) => ({
    label: btkiLabel(bab),
    values: months.map((m) => {
      const ids = new Set(ds.applications.filter((a) => a.lhviu?.issuedAt?.slice(0, 7) === m.key).map((a) => a.id));
      return qtyIn(lines.filter((l) => ids.has(l.applicationId) && btkiBab(l.hs) === bab), unit);
    }),
  }));

  // 2.5 Per perusahaan -----------------------------------------------------------------------
  const perCompany = ds.applications
    .map((a) => {
      const ls = lines.filter((l) => l.applicationId === a.id);
      const byGroup = uniq(ls.map((l) => l.kelompok || "Tidak diisi"));
      const main = byGroup.map((g) => [g, ls.filter((l) => (l.kelompok || "Tidak diisi") === g).length] as const).sort((x, y) => y[1] - x[1])[0]?.[0] ?? "—";
      return { company: a.company, lines: ls.length, hs: uniq(ls.map((l) => l.hs)).length, main, groups: byGroup.length, qty: units.map((u) => qtyIn(ls, u)) };
    })
    .sort((a, b) => b.lines - a.lines);
  const companyTable = perCompany.map((c) => [c.company, c.lines, c.hs, c.main, c.groups, ...c.qty]);

  // Narrative --------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const qtyText = units.map((u, i) => `${nf(totalQty[i])} ${u}`);
  const single = perHs.filter((h) => h.companies === 1).length;
  const g0 = groups[0];
  const top5Vol = sum(topVolume.slice(0, 5).map((t) => t.value));
  const top5Val = sum(topValue.slice(0, 5).map((t) => t.value));
  const both = topVolume.slice(0, 5).map((t) => t.key).filter((k) => topValue.slice(0, 5).some((t) => t.key === k));
  const activeMonths = months.filter((m) => m.viu);
  const peakQty = activeMonths.reduce<Bab2Month | null>((a, m) => (!a || m.qty > a.qty ? m : a), null);
  const peakVal = activeMonths.reduce<Bab2Month | null>((a, m) => (!a || m.value > a.value ? m : a), null);
  const datedQty = sum(months.map((m) => m.qty));
  const datedVal = sum(months.map((m) => m.value));
  const emptyMonths = months.filter((m) => !m.viu && m.key <= (ds.generatedAt || ds.period.to).slice(0, 7));
  const multiGroup = perCompany.filter((c) => c.groups > 1).map((c) => c.company);
  const small = perCompany.filter((c) => c.lines > 0 && c.lines <= 3).length;
  const noLines = perCompany.filter((c) => c.lines === 0).map((c) => c.company);

  if (!lines.length) {
    const none = [`Selama periode pelaporan ${period} belum terdapat product line pada permohonan VIU Produk Tekstil sebagai Barang Konsumsi.`];
    return { units, unit, currency, unconverted, totalQty, totalValue, groups, chapters, topVolume, topValue, hsTable, months, undatedViu, monthSeries, companyTable, groupTable, highlights: [], sub21: none, sub22: [], sub23: [], sub24: [], sub25: [], limits: [] };
  }

  const sub21 = [
    `Rencana impor pada ${withWords(appsWithLines.length)} permohonan VIU periode ${period} terdiri atas ${nf(lines.length)} product line Produk Tekstil yang mencakup ${withWords(allHs.length)} pos tarif/HS. Setiap product line merupakan kombinasi produk, merek, pos tarif/HS, dan negara asal yang diajukan perusahaan, sehingga satu pos tarif/HS dapat muncul pada lebih dari satu product line.`,
    `Berdasarkan kelompok komoditas, ${g0.kelompok} merupakan kelompok terbesar dengan ${nf(g0.lines)} product line (${pct1(g0.lines, lines.length)}) yang diajukan oleh ${g0.companies} perusahaan${groups.length > 1 ? `, diikuti ${joinId(groups.slice(1, 3).map((g) => `${g.kelompok} dengan ${nf(g.lines)} product line (${pct1(g.lines, lines.length)}) dari ${g.companies} perusahaan`))}` : ""} (Gambar 2.1 dan Tabel 2.1).`,
  ];

  const ch0 = chapters[0];
  const byQty = [...chapters].filter((c) => c.qty > 0).sort((a, b) => b.qty - a.qty);
  const byVal = [...chapters].filter((c) => c.value > 0).sort((a, b) => b.value - a.value);
  const sub22 = [
    `Ditinjau dari bab Buku Tarif Kepabeanan Indonesia (BTKI), pos tarif yang diajukan tersebar pada ${withWords(chapters.length)} bab, didominasi ${ch0.label} dengan ${nf(ch0.lines)} product line atau ${pct1(ch0.lines, lines.length)} dari seluruh product line.`,
    byQty.length
      ? `Menurut bab HS, rencana volume dalam satuan ${unit} didominasi ${joinId(byQty.slice(0, 3).map((c) => `${c.label} dengan ${nf(c.qty)} ${unit} (${pct1(c.qty, totalQty[0])})`))}.${byVal.length ? ` Berdasarkan nilai, ${byVal[0].label} merupakan kelompok terbesar dengan ${money(byVal[0].value)} (${pct1(byVal[0].value, totalValue)} dari total nilai)` : ""} (Gambar 2.2).`
      : "",
    [
      exHs.length ? `Sebanyak ${exHs.length} pos tarif/HS diajukan dengan awalan "ex", yang menandakan bahwa hanya sebagian uraian barang dalam pos tarif tersebut yang dimaksud.` : "",
      outside.length ? `Pos tarif ${joinId(outside)} berada di luar Bab 50–63 BTKI (kelompok tekstil dan produk tekstil); cakupannya sebagai Produk Tekstil perlu dikonfirmasi terhadap lampiran Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.` : "Seluruh pos tarif/HS yang diajukan berada dalam Bab 50–63 BTKI (kelompok tekstil dan produk tekstil).",
    ].filter(Boolean).join(" "),
  ].filter(Boolean);

  const tv = topVolume[0];
  const tval = topValue[0];
  const sub23 = [
    `Rencana kebutuhan impor dijumlahkan hanya di dalam satu pos tarif/HS dengan satuan yang sama. Total rencana kebutuhan selama periode pelaporan adalah ${joinId(qtyText)}${unitsOf(lines).length > units.length ? `, ditambah satuan lain (${joinId(unitsOf(lines).slice(units.length))})` : ""}.`,
    tv
      ? `Pos tarif dengan volume terbanyak adalah ${tv.key}${tv.label ? ` (${tv.label})` : ""} sebesar ${nf(tv.value)} ${unit}${tval ? `, sedangkan pos tarif dengan nilai terbesar adalah ${tval.key}${tval.label ? ` (${tval.label})` : ""} sebesar ${money(tval.value)} atau ${pct1(tval.value, totalValue)} dari total nilai rencana impor` : ""}. Lima pos tarif dengan volume terbanyak mencakup ${pct1(top5Vol, totalQty[0])} dari total volume ${unit}${topValue.length ? `, sedangkan lima pos tarif dengan nilai terbesar mencakup ${pct1(top5Val, totalValue)} dari total nilai` : ""}.${both.length ? ` Pos tarif ${joinId(both)} termasuk dalam lima besar menurut volume maupun nilai` : ""} (Gambar 2.3).`
      : "",
    `Sebanyak ${single} dari ${allHs.length} pos tarif/HS (${pct1(single, allHs.length)}) hanya diajukan oleh satu perusahaan. Rincian seluruh pos tarif/HS disajikan pada Tabel 2.2 di halaman berikut.`,
  ].filter(Boolean);

  const sub24 = [
    "Subbagian ini menyajikan rencana impor yang tercakup dalam LHVIU menurut bulan penerbitannya. Angka pada setiap bulan menunjukkan besaran rencana impor yang tercakup dalam VIU yang diselesaikan pada bulan tersebut, bukan realisasi impor pada bulan tersebut.",
    peakQty
      ? `Rencana volume tertinggi tercakup dalam VIU yang diselesaikan pada ${monthLong(peakQty.key)}, yaitu ${nf(peakQty.qty)} ${unit} dari ${peakQty.viu} VIU (${pct1(peakQty.qty, datedQty)} dari volume yang bulan terbitnya tercatat).${peakVal ? ` Rencana nilai tertinggi tercakup dalam VIU ${monthLong(peakVal.key)} sebesar ${money(peakVal.value)} (${pct1(peakVal.value, datedVal)}).` : ""}${emptyMonths.length ? ` Pada ${joinId(emptyMonths.map((m) => monthLong(m.key)))} tidak terdapat VIU yang diselesaikan` : ""} (Gambar 2.4 dan Tabel 2.3).`
      : "Bulan terbit LHVIU belum dicatat pada sistem, sehingga rencana impor belum dapat disajikan menurut periode pelaksanaan VIU.",
    undatedViu ? `Sebanyak ${undatedViu} VIU belum dicatat tanggal terbit LHVIU-nya dan tidak termasuk dalam sebaran per bulan.` : "",
    peakQty && monthSeries.length ? `Gambar 2.5 menyajikan rencana volume per bab HS menurut bulan terbit LHVIU untuk ${withWords(monthSeries.length)} bab HS dengan product line terbanyak.` : "",
  ].filter(Boolean);

  const sub25 = [
    perCompany.length
      ? `Ragam komoditas antarperusahaan bervariasi. ${joinId(perCompany.slice(0, 2).map((c) => `${c.company} mengajukan ${c.lines} product line dengan ${c.hs} pos tarif/HS`))}.${small ? ` Sebaliknya, ${small} perusahaan mengajukan tidak lebih dari 3 (tiga) product line.` : ""}`
      : "",
    !multiGroup.length
      ? "Seluruh perusahaan mengajukan komoditas dalam satu kelompok komoditas (Tabel 2.4)."
      : multiGroup.length * 2 > perCompany.length
        ? `Sebagian besar perusahaan (${multiGroup.length} dari ${perCompany.length}) mengajukan komoditas lintas kelompok, sedangkan ${perCompany.length - multiGroup.length} perusahaan berfokus pada satu kelompok komoditas (Tabel 2.4).`
        : `Sebagian besar perusahaan berfokus pada satu kelompok komoditas. ${multiGroup.length <= 5 ? `${joinId(multiGroup)} merupakan perusahaan` : `Sebanyak ${multiGroup.length} perusahaan`} yang mengajukan komoditas lintas kelompok (Tabel 2.4).`,
    noLines.length ? `Permohonan ${joinId(noLines)} belum memuat product line.` : "",
  ].filter(Boolean);

  const highlights = [
    `Rencana impor ${appsWithLines.length} permohonan terdiri atas ${nf(lines.length)} product line yang mencakup ${allHs.length} pos tarif/HS dalam ${groups.length} kelompok komoditas.`,
    `Kelompok ${g0.kelompok} mendominasi dengan ${nf(g0.lines)} product line (${pct1(g0.lines, lines.length)}) dan ${g0.hs} pos tarif/HS.`,
    `Rencana kebutuhan mencapai ${joinId(qtyText)}${topVolume.length ? `; lima pos tarif terbesar menyerap ${pct1(top5Vol, totalQty[0])} dari total kebutuhan dalam satuan ${unit}` : ""}.`,
    tv ? `Pos tarif dengan volume terbanyak adalah ${tv.key} (${nf(tv.value)} ${unit})${tval ? `; nilai terbesar pada ${tval.key} (${money(tval.value)}, ${pct1(tval.value, totalValue)} dari total nilai)` : ""}.` : "",
    peakQty ? `Rencana volume terbesar tercakup dalam VIU yang diselesaikan pada ${monthLong(peakQty.key)} (${nf(peakQty.qty)} ${unit} dari ${peakQty.viu} VIU).` : `Bulan terbit ${undatedViu} LHVIU belum dicatat, sehingga sebaran per periode belum lengkap.`,
    `Sebanyak ${single} dari ${allHs.length} pos tarif/HS (${pct1(single, allHs.length)}) hanya diajukan oleh satu perusahaan.`,
  ].filter(Boolean);

  const limits = [
    "Periode pelaksanaan VIU ditentukan dari Tanggal Terbit LHVIU yang dicatat Project Manager; angka per bulan menunjukkan rencana impor yang tercakup dalam VIU yang diselesaikan, bukan realisasi impor.",
    `Nilai rencana impor dihitung dari kuantitas dikalikan harga satuan rata-rata dan disajikan dalam Rupiah; nilai dalam mata uang asing dikonversi dengan kurs yang dicatat Technical Analyst${unconverted ? `, sedangkan ${unconverted} product line dalam mata uang asing tanpa kurs tidak termasuk dalam nilai` : ""}.`,
    `Kuantitas tidak dijumlahkan lintas satuan; komposisi volume memakai satuan ${unit}.`,
    "Uraian barang diambil dari uraian HS pada Product Information permohonan, bukan dari uraian resmi BTKI.",
    "Kesesuaian setiap pos tarif/HS terhadap daftar dalam lampiran peraturan tidak dinilai dalam bab ini.",
  ];

  return { units, unit, currency, unconverted, totalQty, totalValue, groups, chapters, topVolume, topValue, hsTable, months, undatedViu, monthSeries, companyTable, groupTable, highlights, sub21, sub22, sub23, sub24, sub25, limits };
}
