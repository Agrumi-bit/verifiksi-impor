import { unitsOf } from "./derive";
import { compact, fdLong, joinId, nf, sum, uniq, withWords } from "./format";
import { btkiBab, btkiLabel } from "./report-bab2";
import { rupiahValuer } from "./report-value";
import type { P47Dataset } from "./types";
import { COUNTRY_ALIASES, COUNTRY_SHAPES, EXTRA_REGIONS, type CountryShape } from "./world-map";

/*
 * Bab 3 "Negara Asal" of the Laporan Pelaksanaan VIU. A product line may list several negara asal
 * without a quantity split, so volume and value per country are estimates with equal allocation:
 * each line's quantity and Rupiah value divided evenly over the countries it lists (as the reference
 * report does). Counts of relations (line × country) are exact.
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const pct1 = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "0%");
const rp = (v: number) => `Rp ${compact(v)}`;
const monthLong = (key: string) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const REGION_ORDER = ["Asia Timur", "ASEAN", "Asia Selatan", "Amerika", "Eropa", "Lainnya"];

export const countryKey = (name: string) => {
  const k = name.toUpperCase().replace(/[^A-Z]/g, "");
  return COUNTRY_ALIASES[k] ?? k;
};
const titleCase = (s: string) => s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase());
export function countryInfo(raw: string): { key: string; name: string; region: string; shape: CountryShape | null } {
  const key = countryKey(raw);
  const shape = COUNTRY_SHAPES[key] ?? null;
  return { key, name: shape?.name ?? titleCase(raw.trim()), region: shape?.region ?? EXTRA_REGIONS[key] ?? "Lainnya", shape };
}

export type CountryAgg = {
  key: string; name: string; region: string; shape: CountryShape | null;
  lines: number; viu: number; companies: number; hs: number; brands: number;
  qty: number; value: number; byMonth: Record<string, number>; byBab: Record<string, number>;
  hsValue: Record<string, { value: number; label: string }>; importers: Record<string, number>;
};

export type Bab3 = {
  unit: string;
  totalQty: number;
  totalValue: number;
  countries: CountryAgg[];
  relations: number;
  multi: number;
  regions: { region: string; countries: number; value: number; qty: number }[];
  regionTable: (string | number)[][];
  countryTable: (string | number)[][];
  months: { key: string; label: string }[];
  top5Series: { label: string; values: number[] }[];
  top5Table: { headers: string[]; rows: (string | number)[][] };
  babs: string[];
  stack: { label: string; parts: number[]; total: number }[];
  profiles: { c: CountryAgg; shareValue: number; shareQty: number; topHs: { hs: string; label: string; value: number }[]; topImporters: [string, number][] }[];
  buckets: { key: string; value: number; companies: number }[];
  singleTopQty: number;
  companyTable: (string | number)[][];
  bins: number[];
  unmapped: string[];
  highlights: string[];
  sub31: string[]; sub32: string[]; sub33: string[]; sub34: string[]; sub35: string[]; sub36: string[]; sub37: string[];
  limits: string[];
};

export function bab3(ds: P47Dataset): Bab3 {
  const lines = ds.lines;
  const unit = unitsOf(lines)[0] ?? "PCS";
  const toRp = rupiahValuer(ds);
  const issuedMonth = new Map(ds.applications.map((a) => [a.id, a.lhviu?.issuedAt?.slice(0, 7) ?? null]));

  const map = new Map<string, CountryAgg & { _apps: Set<string>; _cos: Set<string>; _hs: Set<string>; _br: Set<string> }>();
  let totalQty = 0;
  let totalValue = 0;
  for (const l of lines) {
    const value = toRp(l) ?? 0;
    const qty = l.unit === unit ? l.quantity : 0;
    totalQty += qty;
    totalValue += value;
    const list = uniq(l.countries.map((c) => c.trim()).filter(Boolean));
    const n = list.length || 1;
    for (const raw of list) {
      const info = countryInfo(raw);
      const a = map.get(info.key) ?? { ...info, lines: 0, viu: 0, companies: 0, hs: 0, brands: 0, qty: 0, value: 0, byMonth: {}, byBab: {}, hsValue: {}, importers: {}, _apps: new Set(), _cos: new Set(), _hs: new Set(), _br: new Set() };
      a.lines += 1;
      a.qty += qty / n;
      a.value += value / n;
      a._apps.add(l.applicationId);
      a._cos.add(l.company);
      a._hs.add(l.hs);
      a._br.add(l.brandId);
      const m = issuedMonth.get(l.applicationId);
      if (m) a.byMonth[m] = (a.byMonth[m] ?? 0) + value / n;
      const bab = btkiBab(l.hs);
      a.byBab[bab] = (a.byBab[bab] ?? 0) + value / n;
      a.hsValue[l.hs] = { value: (a.hsValue[l.hs]?.value ?? 0) + value / n, label: l.hsDescription || l.komoditas || "" };
      a.importers[l.company] = (a.importers[l.company] ?? 0) + value / n;
      map.set(info.key, a);
    }
  }
  const countries: CountryAgg[] = [...map.values()]
    .map(({ _apps, _cos, _hs, _br, ...a }) => ({ ...a, viu: _apps.size, companies: _cos.size, hs: _hs.size, brands: _br.size }))
    .sort((a, b) => b.value - a.value || b.lines - a.lines);
  const relations = sum(countries.map((c) => c.lines));
  const multi = lines.filter((l) => uniq(l.countries).length > 1).length;

  const regions = REGION_ORDER.map((region) => {
    const cs = countries.filter((c) => c.region === region);
    return { region, countries: cs.length, value: sum(cs.map((c) => c.value)), qty: sum(cs.map((c) => c.qty)) };
  }).filter((r) => r.countries > 0).sort((a, b) => b.value - a.value);
  const regionTable: (string | number)[][] = [
    ...regions.map((r) => [r.region, r.countries, Math.round(r.value), pct1(r.value, totalValue), Math.round(r.qty), pct1(r.qty, totalQty)]),
    ["Total", countries.length, Math.round(totalValue), "100%", Math.round(totalQty), "100%"],
  ];
  const countryTable = countries.map((c) => [c.name, c.region, c.viu, c.companies, c.lines, Math.round(c.qty), pct1(c.qty, totalQty), Math.round(c.value), pct1(c.value, totalValue)]);

  // Months of the period (by LHVIU issuance) and the top-5 trend.
  const months: { key: string; label: string }[] = [];
  for (let d = new Date(`${ds.period.from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= ds.period.to.slice(0, 7) && months.length < 24; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const key = d.toISOString().slice(0, 7);
    months.push({ key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}` });
  }
  const top5 = countries.slice(0, 5);
  const top5Series = top5.map((c) => ({ label: c.name, values: months.map((m) => c.byMonth[m.key] ?? 0) }));
  const activeMonths = months.filter((m) => top5.some((c) => (c.byMonth[m.key] ?? 0) > 0));
  const top5Table = {
    headers: ["Negara Asal", ...activeMonths.map((m) => MONTHS[Number(m.key.slice(5, 7)) - 1]), "Jumlah"],
    rows: top5.map((c) => [c.name, ...activeMonths.map((m) => Math.round(c.byMonth[m.key] ?? 0)), Math.round(sum(Object.values(c.byMonth)))]),
  };

  // Negara × bab HS (top 10 countries, top 4 babs + Lainnya).
  const babTotals = new Map<string, number>();
  for (const c of countries) for (const [b, v] of Object.entries(c.byBab)) babTotals.set(b, (babTotals.get(b) ?? 0) + v);
  const babs = [...babTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([b]) => b);
  const stack = countries.slice(0, 10).map((c) => {
    const parts = babs.map((b) => c.byBab[b] ?? 0);
    const other = c.value - sum(parts);
    return { label: c.name, parts: [...parts, Math.max(other, 0)], total: c.value };
  });

  const profiles = countries.slice(0, 3).map((c) => ({
    c, shareValue: totalValue ? c.value / totalValue : 0, shareQty: totalQty ? c.qty / totalQty : 0,
    topHs: Object.entries(c.hsValue).sort((a, b) => b[1].value - a[1].value).slice(0, 5).map(([hs, x]) => ({ hs, label: x.label, value: x.value })),
    topImporters: Object.entries(c.importers).sort((a, b) => b[1] - a[1]).slice(0, 3) as [string, number][],
  }));

  const bucketOf = (n: number) => (n <= 1 ? "1 negara" : n <= 5 ? "2–5 negara" : n <= 10 ? "6–10 negara" : n <= 20 ? "11–20 negara" : "> 20 negara");
  const buckets = ["1 negara", "2–5 negara", "6–10 negara", "11–20 negara", "> 20 negara"].map((key) => {
    const ls = lines.filter((l) => bucketOf(uniq(l.countries).length) === key);
    return { key, value: ls.length, companies: uniq(ls.map((l) => l.applicationId)).length };
  });
  const top = countries[0];
  const singleTop = top ? lines.filter((l) => uniq(l.countries).length === 1 && countryKey(l.countries[0]) === top.key) : [];
  const singleTopQty = sum(singleTop.filter((l) => l.unit === unit).map((l) => l.quantity));

  const perCompany = ds.applications.map((a) => {
    const ls = lines.filter((l) => l.applicationId === a.id);
    const rel = new Map<string, number>();
    for (const l of ls) for (const c of uniq(l.countries)) rel.set(countryInfo(c).name, (rel.get(countryInfo(c).name) ?? 0) + 1);
    const ranked = [...rel.entries()].sort((x, y) => y[1] - x[1]).map(([n]) => n);
    return {
      company: a.company, lines: ls.length, countries: rel.size, single: ls.filter((l) => uniq(l.countries).length === 1).length,
      avg: ls.length ? sum(ls.map((l) => uniq(l.countries).length)) / ls.length : 0,
      main: ranked.length > 3 ? `${ranked.slice(0, 3).join(", ")} +${ranked.length - 3} lainnya` : ranked.join(", "),
    };
  }).sort((a, b) => b.countries - a.countries || b.lines - a.lines);
  const companyTable = perCompany.map((c) => [c.company, c.lines, c.countries, c.single, Number(c.avg.toFixed(1)), c.main || "—"]);

  // Choropleth bins: quintile thresholds of estimated value among countries on the map.
  const vals = countries.filter((c) => c.shape).map((c) => c.value).sort((a, b) => a - b);
  const bins = vals.length ? uniq([0.2, 0.4, 0.6, 0.8].map((q) => vals[Math.min(vals.length - 1, Math.floor(q * vals.length))])).filter((b) => b < vals[vals.length - 1]) : [];
  const unmapped = countries.filter((c) => !c.shape).map((c) => c.name);

  // Narrative --------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  if (!lines.length || !countries.length) {
    const none = [`Selama periode pelaporan ${period} belum terdapat product line dengan negara asal.`];
    return { unit, totalQty, totalValue, countries, relations, multi, regions, regionTable, countryTable, months, top5Series, top5Table, babs, stack, profiles, buckets, singleTopQty, companyTable, bins, unmapped, highlights: [], sub31: none, sub32: [], sub33: [], sub34: [], sub35: [], sub36: [], sub37: [], limits: [] };
  }
  const second = countries.slice(1, 3);
  const auto = lines.filter((l) => l.countryAutoFilled).length;
  const indonesia = countries.find((c) => c.key === "INDONESIA");
  const byLines = [...countries].sort((a, b) => b.lines - a.lines);
  const contrast = byLines.find((c, i) => i > 0 && countries.indexOf(c) > i + 1);
  const peakMonth = top ? Object.entries(top.byMonth).sort((a, b) => b[1] - a[1])[0] : undefined;
  const topBab = top ? Object.entries(top.byBab).sort((a, b) => b[1] - a[1]) : [];
  const singleOnly = perCompany.filter((c) => c.countries === 1 && c.lines > 0).length;
  const most = perCompany[0];

  const sub31 = [
    `Rencana impor ${withWords(uniq(lines.map((l) => l.applicationId)).length)} permohonan VIU mencantumkan ${withWords(countries.length)} negara asal yang tersebar di ${withWords(regions.length)} kawasan, yaitu ${joinId(regions.map((r) => r.region))}. Secara keseluruhan terdapat ${nf(relations)} relasi product line–negara asal atau rata-rata ${(relations / lines.length).toFixed(1).replace(".", ",")} negara per product line (Gambar 3.1).`,
    `Peta pada Gambar 3.2 menunjukkan sebaran geografis negara asal dengan intensitas warna menurut estimasi rencana nilai. ${regions[0] ? `Estimasi nilai terkonsentrasi di kawasan ${regions[0].region} (${pct1(regions[0].value, totalValue)} dari total nilai).` : ""}${unmapped.length ? ` ${joinId(unmapped)} tidak tergambar pada peta.` : ""}`,
  ];
  const sub32 = [
    `${multi ? `Karena ${nf(multi)} product line (${pct1(multi, lines.length)}) mencantumkan lebih dari satu negara asal tanpa alokasi kuantitas, volume` : "Volume"} dan nilai per negara asal dalam bab ini disajikan sebagai estimasi dengan alokasi merata, yaitu kuantitas dan nilai setiap product line dibagi sama rata ke seluruh negara asal yang dicantumkan. Estimasi ini merupakan pendekatan analitis dan tidak menggantikan data alokasi kuantitas per negara dari perusahaan.`,
    `Berdasarkan estimasi tersebut, ${top.name} berkontribusi ${pct1(top.value, totalValue)} terhadap total rencana nilai (${rp(top.value)}) dan ${pct1(top.qty, totalQty)} terhadap total rencana volume${second.length ? `, diikuti ${joinId(second.map((c) => `${c.name} dengan share nilai ${pct1(c.value, totalValue)} dan share volume ${pct1(c.qty, totalQty)}`))}` : ""} (Gambar 3.3, Tabel 3.1, dan Gambar 3.4; rincian seluruh negara pada Tabel 3.2 di halaman berikut).`,
    contrast
      ? `Jumlah pencantuman yang besar tidak selalu sejalan dengan nilai yang besar. ${contrast.name} tercantum pada ${nf(contrast.lines)} product line, tetapi estimasi nilainya hanya ${rp(contrast.value)} (${pct1(contrast.value, totalValue)}), karena product line yang mencantumkannya umumnya juga mencantumkan banyak negara asal lain sehingga porsi alokasi per negara menjadi kecil.`
      : "",
  ].filter(Boolean);
  const sub33 = [
    peakMonth
      ? `Gambar 3.5 menyajikan tren estimasi rencana nilai lima negara asal teratas menurut bulan terbit LHVIU; angkanya disajikan pada Tabel 3.3. Rencana impor asal ${top.name} terbesar tercakup dalam VIU yang diselesaikan pada ${monthLong(peakMonth[0])} (${rp(peakMonth[1])}). Negara asal lain mengikuti waktu penerbitan LHVIU perusahaan yang mencantumkannya.`
      : "Tanggal terbit LHVIU belum dicatat pada sistem, sehingga tren rencana impor per negara menurut periode pelaksanaan VIU belum dapat disajikan.",
    "Tren ini merupakan tren rencana hasil VIU, bukan realisasi impor.",
  ];
  const sub34 = [
    topBab.length
      ? `Gambar 3.6 menunjukkan komposisi bab HS untuk sepuluh negara asal teratas menurut estimasi rencana nilai. Produk asal ${top.name} didominasi ${btkiLabel(topBab[0][0])} (${pct1(topBab[0][1], top.value)} dari estimasi nilai negara tersebut)${topBab[1] ? `, diikuti ${btkiLabel(topBab[1][0])} (${pct1(topBab[1][1], top.value)})` : ""}.`
      : "",
  ].filter(Boolean);
  const p0 = profiles[0];
  const sub35 = [
    `Gambar 3.7 merangkum ${withWords(profiles.length)} negara asal dengan estimasi nilai terbesar, yaitu ${joinId(profiles.map((p) => p.c.name))}: rencana volume, rencana nilai, share, pos tarif/HS utama, dan importir utama.`,
    p0
      ? `Sebagai contoh, ${p0.c.name} merupakan negara asal terbesar dengan estimasi rencana volume ${nf(Math.round(p0.c.qty))} ${unit} dan rencana nilai ${rp(p0.c.value)}, atau ${pct1(p0.c.value, totalValue)} terhadap total rencana nilai. Rencana impor asal ${p0.c.name} diajukan oleh ${p0.c.companies} perusahaan dengan importir utama ${joinId(p0.topImporters.map(([n]) => n))}.`
      : "",
  ].filter(Boolean);
  const b1 = buckets[0];
  const over20 = buckets[4];
  const sub36 = [
    `Sebanyak ${nf(b1.value)} product line (${pct1(b1.value, lines.length)}) mencantumkan satu negara asal. Sisanya, ${nf(lines.length - b1.value)} product line (${pct1(lines.length - b1.value, lines.length)}), mencantumkan dua negara asal atau lebih${over20.value ? `; ${nf(over20.value)} product line di antaranya mencantumkan lebih dari 20 negara asal` : ""} (Gambar 3.8).`,
    top && singleTopQty
      ? `Karena product line dengan beberapa negara asal tidak memuat alokasi kuantitas per negara, volume impor menurut negara asal tidak dapat dihitung secara pasti. Batas bawah yang dapat dipastikan adalah product line dengan negara asal tunggal ${top.name}, yaitu ${nf(singleTopQty)} ${unit} atau ${pct1(singleTopQty, totalQty)} dari total rencana kebutuhan dalam satuan ${unit}.`
      : "",
  ].filter(Boolean);
  const sub37 = [
    most ? `Sebanyak ${singleOnly} dari ${perCompany.filter((c) => c.lines > 0).length} perusahaan hanya mencantumkan satu negara asal. Jumlah negara asal terbanyak dicantumkan oleh ${most.company} (${most.countries} negara)${perCompany[1] && perCompany[1].countries > 1 ? `, diikuti ${perCompany[1].company} (${perCompany[1].countries} negara)` : ""} (Tabel 3.4).` : "",
    over20.value || buckets[3].value
      ? "Pencantuman negara asal dalam jumlah besar pada setiap product line mengindikasikan bahwa perusahaan kemungkinan mencantumkan seluruh negara produksi yang dimungkinkan untuk merek tersebut, bukan negara asal pengiriman yang direncanakan. Kondisi ini membatasi penggunaan data negara asal untuk analisis volume dan perlu menjadi perhatian dalam verifikasi berikutnya."
      : "",
  ].filter(Boolean);

  const highlights = [
    `Rencana impor mencantumkan ${countries.length} negara asal; ${top.name} tercantum pada ${nf(top.lines)} dari ${nf(lines.length)} product line dan ${top.viu} VIU.`,
    `Dengan estimasi alokasi merata, ${top.name} berkontribusi ${pct1(top.value, totalValue)} terhadap total rencana nilai (${rp(top.value)}) dan ${pct1(top.qty, totalQty)} terhadap total rencana volume.`,
    second.length ? `${joinId(second.map((c) => c.name))} menempati urutan berikutnya dengan share nilai ${second.length > 1 ? `masing-masing ${second.map((c) => pct1(c.value, totalValue)).join(" dan ")}` : pct1(second[0].value, totalValue)}.` : "",
    topBab.length && p0 ? `Produk asal ${top.name} didominasi ${btkiLabel(topBab[0][0])}; importir utamanya adalah ${joinId(p0.topImporters.map(([n]) => n))}.` : "",
    multi ? `${nf(multi)} dari ${nf(lines.length)} product line (${pct1(multi, lines.length)}) mencantumkan lebih dari satu negara asal tanpa alokasi kuantitas, sehingga volume dan nilai per negara disajikan sebagai estimasi.` : "",
  ].filter(Boolean);

  const limits = [
    multi ? `${nf(multi)} dari ${nf(lines.length)} product line mencantumkan lebih dari satu negara asal tanpa alokasi kuantitas, sehingga volume per negara asal tidak dapat dihitung secara pasti.` : "",
    "Volume dan nilai per negara asal merupakan estimasi dengan alokasi merata ke seluruh negara asal yang dicantumkan pada product line, bukan data alokasi dari perusahaan.",
    "Nilai dihitung dalam Rupiah; product line dalam mata uang asing tanpa kurs dari Analisis Teknis tidak termasuk dalam estimasi nilai.",
    "Nama negara mengikuti penulisan pada Product Information permohonan; ejaan berbeda untuk negara yang sama digabungkan.",
    auto ? `Negara asal ${auto} product line diisi sistem (REP. RAKYAT CINA) karena kosong saat diajukan dan perlu dikonfirmasi.` : "",
    indonesia ? `Indonesia tercantum sebagai negara asal pada ${indonesia.lines} product line dan memerlukan klarifikasi.` : "",
    "Peta disederhanakan (skala 1:110 juta); negara kecil seperti Hongkong dan Singapura ditandai dengan titik.",
  ].filter(Boolean);

  return { unit, totalQty, totalValue, countries, relations, multi, regions, regionTable, countryTable, months, top5Series, top5Table, babs, stack, profiles, buckets, singleTopQty, companyTable, bins, unmapped, highlights, sub31, sub32, sub33, sub34, sub35, sub36, sub37, limits };
}
