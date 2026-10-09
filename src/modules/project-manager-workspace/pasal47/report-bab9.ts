import { unitsOf } from "./derive";
import { fdLong, nf, sum, uniq, withWords } from "./format";
import type { P47Dataset, P47Place } from "./types";

/*
 * Bab 9 "Analisis Fasilitas & Lokasi Pemohon VIU" of the Laporan Pelaksanaan VIU: kantor and gudang of
 * each Pemohon VIU — location, status kepemilikan, legalitas gudang (tanda daftar gudang, masa sewa),
 * luas measured during verifikasi lapangan and the surveyor's conclusion — and how the gudang compares
 * with the rencana volume impor. One row per permohonan in the detail table.
 */

const pct1 = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "0%");
const andList = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} dan ${xs[xs.length - 1]}`);
const titleCase = (s: string) => s.toLowerCase().replace(/(^|[\s(/-])([a-z])/g, (_, p: string, c: string) => p + c.toUpperCase())
  .replace(/\bDki\b/g, "DKI").replace(/\bDi\b(?= Yogyakarta)/g, "DI");

export const AREA_BUCKETS = [
  { label: "< 500 m²", max: 500 },
  { label: "500–1.000 m²", max: 1000 },
  { label: "1.000–5.000 m²", max: 5000 },
  { label: "5.000–10.000 m²", max: 10000 },
  { label: "> 10.000 m²", max: Infinity },
] as const;

const ownershipOf = (p: P47Place) => p.ownership || "Tidak diisi";
const registrationKind = (p: P47Place) => (p.registration ? p.registration.split(" ")[0] === "Gudang" ? "Gudang Berikat" : p.registration.split(" ")[0] : "Tidak diisi");
const conclusionOf = (p: P47Place) => p.fieldConclusion || "Belum disimpulkan";

export type FacilityRow = {
  applicationId: string; company: string; kantor: P47Place | null; gudang: P47Place[];
  area: number | null; plan: number; perArea: number | null;
};

export type Bab9 = {
  unit: string;
  rows: FacilityRow[];
  kantor: P47Place[];
  gudang: P47Place[];
  ownership: { kantor: { label: string; value: number }[]; gudang: { label: string; value: number }[] };
  kantorProvinces: { province: string; cities: string[]; count: number }[];
  gudangProvinces: { province: string; cities: string[]; count: number }[];
  registrations: { label: string; value: number }[];
  conclusions: { label: string; value: number }[];
  leaseEnding: { company: string; city: string; leaseEnd: string }[];
  areaBuckets: { label: string; value: number }[];
  table: (string | number)[][];
  highlights: string[];
  sub91: string[]; sub92: string[]; sub93: string[]; sub94: string[];
  limits: string[];
};

function countBy<T>(xs: T[], key: (x: T) => string, order: string[] = []) {
  const keys = uniq([...order.filter((k) => xs.some((x) => key(x) === k)), ...xs.map(key)]);
  return keys.map((label) => ({ label, value: xs.filter((x) => key(x) === label).length }));
}

function byProvince(places: P47Place[]) {
  const provinces = uniq(places.map((p) => titleCase(p.province.trim()) || "Tidak diisi"));
  return provinces.map((province) => {
    const ps = places.filter((p) => (titleCase(p.province.trim()) || "Tidak diisi") === province);
    return { province, cities: uniq(ps.map((p) => titleCase(p.city.trim())).filter(Boolean)), count: ps.length };
  }).sort((a, b) => b.count - a.count);
}

export function bab9(ds: P47Dataset): Bab9 {
  const unit = unitsOf(ds.lines)[0] ?? "PCS";
  const appIds = uniq(ds.lines.map((l) => l.applicationId));
  const byId = new Map(ds.applications.map((a) => [a.id, a]));
  const rows: FacilityRow[] = appIds.map((id) => {
    const a = byId.get(id);
    const gudang = a?.gudang ?? [];
    const areas = gudang.map((g) => g.area).filter((v): v is number => typeof v === "number" && v > 0);
    const area = areas.length ? sum(areas) : null;
    const plan = sum(ds.lines.filter((l) => l.applicationId === id && l.unit === unit).map((l) => l.quantity));
    return { applicationId: id, company: a?.company ?? ds.lines.find((l) => l.applicationId === id)?.company ?? "—", kantor: a?.kantor ?? null, gudang, area, plan, perArea: area ? plan / area : null };
  }).sort((a, b) => a.company.localeCompare(b.company));

  const kantor = rows.flatMap((r) => (r.kantor ? [r.kantor] : []));
  const gudang = rows.flatMap((r) => r.gudang);
  const ownership = {
    kantor: countBy(kantor, ownershipOf, ["Milik Sendiri", "Sewa", "Tidak diisi"]),
    gudang: countBy(gudang, ownershipOf, ["Milik Sendiri", "Sewa", "Tidak diisi"]),
  };
  const registrations = countBy(gudang, registrationKind, ["TDG", "Gudang Berikat", "TPS", "Tidak diisi"]);
  const conclusions = countBy([...kantor, ...gudang], conclusionOf, ["Sesuai", "Tidak Sesuai", "Belum disimpulkan"]);
  const end = ds.period.to.slice(0, 10);
  const horizon = new Date(`${end}T00:00:00Z`);
  horizon.setUTCMonth(horizon.getUTCMonth() + 6);
  const leaseEnding = rows.flatMap((r) => [...(r.kantor ? [r.kantor] : []), ...r.gudang].filter((p) => p.leaseEnd && p.leaseEnd <= horizon.toISOString().slice(0, 10)).map((p) => ({ company: r.company, city: titleCase(p.city), leaseEnd: p.leaseEnd ?? "" })))
    .sort((a, b) => a.leaseEnd.localeCompare(b.leaseEnd));
  const areas = gudang.map((g) => g.area).filter((v): v is number => typeof v === "number" && v > 0);
  const areaBuckets = [
    ...AREA_BUCKETS.map((b, i) => ({ label: b.label, value: areas.filter((v) => v < b.max && (i === 0 || v >= AREA_BUCKETS[i - 1].max)).length })),
    ...(gudang.length > areas.length ? [{ label: "Tidak tercatat", value: gudang.length - areas.length }] : []),
  ];

  const loc = (p: P47Place | null) => (p ? [titleCase(p.city), titleCase(p.province)].filter(Boolean).join(", ") || "—" : "—");
  const table = rows.map((r) => {
    const places = [...(r.kantor ? [r.kantor] : []), ...r.gudang];
    const lease = places.map((p) => p.leaseEnd).filter((x): x is string => !!x).sort()[0];
    return [
    r.company, loc(r.kantor), r.kantor ? ownershipOf(r.kantor) : "—",
    r.gudang.length ? uniq(r.gudang.map((g) => loc(g))).join("; ") : "—", r.gudang.length ? uniq(r.gudang.map(ownershipOf)).join(", ") : "—",
    r.area === null ? "—" : nf(Math.round(r.area)), r.gudang.length ? `${r.gudang.filter((g) => g.registration).length}/${r.gudang.length}` : "—",
    lease ? fdLong(lease) : "—",
    uniq(places.map(conclusionOf)).join(", ") || "—",
    Math.round(r.plan),
    ];
  });

  // Narrative -------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const limits = [
    "Lokasi, status kepemilikan, tanda daftar gudang, dan masa sewa mengikuti data lokasi perusahaan yang dipilih pada permohonan.",
    "Luas gudang adalah luas total yang diukur surveyor pada verifikasi lapangan; gudang yang belum diverifikasi atau belum diukur tidak memiliki luas.",
    `Rencana volume dalam satuan ${unit}; rencana dalam satuan lain tidak dibandingkan dengan luas gudang. Kapasitas gudang dalam m³ menurut Technical Analyst dibahas pada Bab 6.`,
    "Masa sewa yang berakhir dinilai sampai 6 (enam) bulan setelah akhir periode laporan.",
  ];
  const base = { unit, rows, kantor, gudang, ownership, kantorProvinces: byProvince(kantor), gudangProvinces: byProvince(gudang), registrations, conclusions, leaseEnding, areaBuckets, table };
  if (!rows.length) {
    return { ...base, highlights: [], sub91: [`Selama periode pelaporan ${period} belum terdapat Pemohon VIU dengan rencana impor.`], sub92: [], sub93: [], sub94: [], limits };
  }

  const own = (xs: { label: string; value: number }[], l: string) => xs.find((x) => x.label === l)?.value ?? 0;
  const kp = base.kantorProvinces;
  const gp = base.gudangProvinces;
  const withReg = gudang.filter((g) => g.registration).length;
  const notOk = [...kantor, ...gudang].filter((p) => p.fieldConclusion === "Tidak Sesuai").length;
  const avgArea = areas.length ? sum(areas) / areas.length : null;
  const dense = rows.filter((r) => r.perArea !== null).sort((a, b) => (b.perArea ?? 0) - (a.perArea ?? 0));
  const noGudang = rows.filter((r) => !r.gudang.length);

  const sub91 = [
    "Bab ini menganalisis fasilitas Pemohon VIU dengan alur Pemohon VIU → Kantor → Gudang → Status Kepemilikan → Legalitas → Lokasi → Luas → keterkaitan dengan rencana impor. Analisis menjawab di mana kantor dan gudang berada, apakah milik sendiri atau sewa, bagaimana legalitas gudang, berapa luasnya, dan apakah fasilitas tersebut sebanding dengan rencana impor.",
    `Selama periode pelaporan ${period}, ${withWords(rows.length)} Pemohon VIU mencatat ${kantor.length} kantor dan ${gudang.length} gudang${noGudang.length ? `; ${noGudang.length} pemohon tidak mencantumkan gudang` : ""}. ${own(ownership.gudang, "Milik Sendiri")} gudang (${pct1(own(ownership.gudang, "Milik Sendiri"), gudang.length)}) berstatus milik sendiri, ${withReg} dari ${gudang.length} gudang mencantumkan tanda daftar gudang, dan luas gudang terukur pada ${areas.length} gudang${avgArea !== null ? ` dengan rata-rata ${nf(Math.round(avgArea))} m²` : ""} (Gambar 9.1).`,
  ];
  const sub92 = [
    kantor.length
      ? `Sebanyak ${own(ownership.kantor, "Milik Sendiri")} kantor (${pct1(own(ownership.kantor, "Milik Sendiri"), kantor.length)}) berstatus milik sendiri dan ${own(ownership.kantor, "Sewa")} kantor berstatus sewa${own(ownership.kantor, "Tidak diisi") ? `; status ${own(ownership.kantor, "Tidak diisi")} kantor belum diisi` : ""} (Gambar 9.2). Kantor terbanyak berada di Provinsi ${kp[0].province} (${kp[0].count} kantor${kp[0].cities.length ? `, terutama ${andList(kp[0].cities.slice(0, 3))}` : ""})${kp[1] ? `, diikuti ${andList(kp.slice(1, 3).map((p) => `${p.province} (${p.count})`))}` : ""} (Gambar 9.3).`
      : "Data kantor belum dicantumkan pada permohonan periode ini.",
  ];
  const sub93 = [
    gudang.length
      ? `Sebanyak ${own(ownership.gudang, "Milik Sendiri")} gudang berstatus milik sendiri dan ${own(ownership.gudang, "Sewa")} gudang berstatus sewa (Gambar 9.4). Gudang terbanyak berada di Provinsi ${gp[0].province} (${gp[0].count} gudang${gp[0].cities.length ? `, terutama ${andList(gp[0].cities.slice(0, 3))}` : ""})${gp[1] ? `, diikuti ${andList(gp.slice(1, 3).map((p) => `${p.province} (${p.count})`))}` : ""} (Gambar 9.5).`
      : "Data gudang belum dicantumkan pada permohonan periode ini.",
    gudang.length
      ? `Dari sisi legalitas, ${registrations.filter((r) => r.label !== "Tidak diisi").map((r) => `${r.value} gudang memiliki ${r.label === "TDG" ? "Tanda Daftar Gudang (TDG)" : r.label === "TPS" ? "penetapan Tempat Penimbunan Sementara" : "penetapan Gudang Berikat"}`).join(", ") || "belum ada gudang yang mencantumkan tanda daftar"}${own(registrations, "Tidak diisi") ? `, dan ${own(registrations, "Tidak diisi")} gudang belum mencantumkan tanda daftar` : ""}. Verifikasi lapangan menyimpulkan ${own(conclusions, "Sesuai")} lokasi sesuai${notOk ? ` dan ${notOk} lokasi tidak sesuai` : ""}${own(conclusions, "Belum disimpulkan") ? `; ${own(conclusions, "Belum disimpulkan")} lokasi belum disimpulkan` : ""}${leaseEnding.length ? `. Masa sewa ${leaseEnding.length} lokasi berakhir paling lambat 6 bulan setelah akhir periode, paling awal ${fdLong(leaseEnding[0].leaseEnd)} (${leaseEnding[0].company})` : ""} (Gambar 9.6).`
      : "",
  ].filter(Boolean);
  const sub94 = [
    `Luas gudang dikelompokkan menjadi kurang dari 500 m², 500–1.000 m², 1.000–5.000 m², 5.000–10.000 m², dan lebih dari 10.000 m² (Gambar 9.7). ${areas.length ? `Luas terukur pada ${areas.length} dari ${gudang.length} gudang.` : "Luas gudang belum diukur pada verifikasi lapangan periode ini."}`,
    dense.length
      ? `Kewajaran fasilitas terhadap rencana impor digambarkan dengan rencana volume per m² luas gudang (Gambar 9.8). Rasio tertinggi tercatat pada ${dense[0].company} (${nf(Math.round(dense[0].perArea ?? 0))} ${unit}/m²)${dense[1] ? `, diikuti ${andList(dense.slice(1, 3).map((r) => `${r.company} (${nf(Math.round(r.perArea ?? 0))} ${unit}/m²)`))}` : ""}; pemohon dengan rencana volume besar tetapi luas gudang kecil memerlukan perhatian dalam verifikasi lapangan. Rincian fasilitas setiap pemohon disajikan pada Tabel 9.1.`
      : "Rincian fasilitas setiap pemohon disajikan pada Tabel 9.1.",
  ];
  const highlights = [
    `${withWords(rows.length)} Pemohon VIU mencatat ${kantor.length} kantor dan ${gudang.length} gudang; ${pct1(own(ownership.gudang, "Milik Sendiri"), gudang.length)} gudang berstatus milik sendiri.`,
    kp[0] ? `Kantor terbanyak berada di Provinsi ${kp[0].province} (${kp[0].count}), gudang terbanyak di Provinsi ${gp[0]?.province ?? "—"} (${gp[0]?.count ?? 0}).` : "",
    `${withReg} dari ${gudang.length} gudang mencantumkan tanda daftar gudang; verifikasi lapangan menyimpulkan ${notOk} lokasi tidak sesuai.`,
    avgArea !== null ? `Luas gudang terukur pada ${areas.length} gudang dengan rata-rata ${nf(Math.round(avgArea))} m².` : "Luas gudang belum diukur pada verifikasi lapangan periode ini.",
  ].filter(Boolean);

  return { ...base, highlights, sub91, sub92, sub93, sub94, limits };
}
