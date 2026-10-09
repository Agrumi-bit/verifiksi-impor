import { brandCertificateStatus, unitsOf } from "./derive";
import { compact, fdLong, joinId, nf, sum, uniq, withWords } from "./format";
import { countryInfo } from "./report-bab3";
import { rupiahValuer } from "./report-value";
import type { P47Brand, P47BrandUse, P47Dataset } from "./types";

/*
 * Bab 4 "Analisis Struktur Merek" of the Laporan Pelaksanaan VIU: merek and pemilik, asal merek (domisili
 * pemilik), status pendaftaran, the relationship between each Pemohon VIU and the brand owner with its
 * document basis, Nice classes, rencana impor per merek, the trend per bulan terbit LHVIU, brands shared
 * by several importers, and the validity of the brand evidence. Counted from Merek Management and the
 * application's brand use; values in Rupiah (report-value.ts).
 */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pct1 = (part: number, total: number) => (total > 0 ? (part > 0 && (part / total) * 100 < 0.05 ? "<0,1%" : `${((part / total) * 100).toFixed(1).replace(".", ",")}%`) : "0%");
const rp = (v: number) => `Rp ${compact(v)}`;

const COUNTRY_CODE: Record<string, string> = {
  ID: "Indonesia", US: "Amerika Serikat", CN: "Republik Rakyat Cina", JP: "Jepang", KR: "Korea Selatan", HK: "Hongkong", SG: "Singapura",
  MY: "Malaysia", TH: "Thailand", VN: "Vietnam", IN: "India", IT: "Italia", FR: "Perancis", GB: "Inggris", DE: "Jerman", ES: "Spanyol",
  TR: "Turki", AU: "Australia", NL: "Belanda", TW: "Taiwan", BD: "Bangladesh", PK: "Pakistan", CH: "Swiss", SE: "Swedia", BE: "Belgia",
};
export const brandDomicile = (b: Pick<P47Brand, "ownerCountry">) => {
  const c = b.ownerCountry.trim();
  if (!c) return "Tidak diisi";
  // ISO code or a free-text name in any spelling ("INDONESIA", "China"), normalised like Bab 3.
  return countryInfo(COUNTRY_CODE[c.toUpperCase()] ?? c).name;
};
export const brandOrigin = (b: Pick<P47Brand, "ownerCountry">) => {
  const d = brandDomicile(b);
  return d === "Tidak diisi" ? "Tidak diisi" : d === "Indonesia" ? "Lokal" : "Luar negeri";
};

/** Pemilik merek type from its name and domicile. */
export function ownerType(b: Pick<P47Brand, "owner" | "ownerCountry">): string {
  if (!b.owner.trim()) return "Tidak diisi";
  if (brandOrigin(b) === "Luar negeri") return "Badan usaha/perorangan luar negeri";
  return /^(PT|CV|UD|FA|PD|KOPERASI|YAYASAN)\b|\bTBK\b|\b(LTD|LLC|INC|CORP|CO\.)\b/i.test(b.owner.trim()) ? "Badan usaha dalam negeri" : "Perorangan";
}

/** Relationship of the Pemohon VIU with the brand owner, from the role chosen on the application. */
export const RELATIONSHIPS = [
  { key: "OWNER", label: "Pemilik Merek Langsung", basis: "Sertifikat atau tanda pendaftaran merek atas nama pemohon" },
  { key: "REP", label: "Perwakilan Resmi", basis: "Surat penunjukan sebagai perwakilan resmi dari pemilik merek" },
  { key: "IMPORTER", label: "Importir yang Ditunjuk", basis: "Surat penunjukan dari pemilik merek atau perwakilan resmi" },
  { key: "UNKNOWN", label: "Belum dipilih", basis: "—" },
] as const;
export function relationshipOf(use: Pick<P47BrandUse, "role">): (typeof RELATIONSHIPS)[number] {
  // Importir and Perwakilan first: an importer label may mention the Pemilik Merek that appointed it.
  if (/Importir/i.test(use.role)) return RELATIONSHIPS[2];
  if (/Perwakilan Resmi/i.test(use.role)) return RELATIONSHIPS[1];
  if (/Pemilik Merek/i.test(use.role)) return RELATIONSHIPS[0];
  return RELATIONSHIPS[3];
}

const NICE: Record<string, string> = {
  "5": "Sediaan farmasi, popok", "9": "Peralatan ilmiah, aksesori elektronik", "18": "Barang kulit, tas", "22": "Tali, jaring, bahan isian",
  "23": "Benang", "24": "Tekstil dan barang tekstil rumah tangga", "25": "Pakaian, alas kaki, tutup kepala", "26": "Renda, kancing, aksesori jahit",
  "27": "Karpet, permadani, penutup lantai", "35": "Periklanan dan perdagangan",
};
export const niceLabel = (c: string) => NICE[c.replace(/^0+/, "")] ?? "Kelas lainnya";

export type BrandRow = {
  id: string; name: string; owner: string; origin: string; domicile: string; ownerType: string; evidence: string; certificate: string;
  classes: string[]; importers: string[]; viu: number; lines: number; qty: number; value: number; months: string[];
};

export type Bab4 = {
  unit: string;
  totalValue: number;
  brands: BrandRow[];
  owners: { owner: string; brands: string[]; value: number }[];
  pairs: { brand: string; owner: string; ownerType: string; company: string; rel: string; basis: string; doc: string; missing: string[]; evidence: string; qty: number; value: number }[];
  relRows: { label: string; basis: string; pairs: number; value: number; valid: number }[];
  originRows: { origin: string; brands: number; value: number; qty: number }[];
  domiciles: { country: string; brands: string[] }[];
  evidenceRows: { evidence: string; brands: number; value: number }[];
  evidenceByOrigin: { label: string; parts: number[]; total: number }[];
  evidenceKinds: string[];
  classRows: { cls: string; label: string; brands: string[]; value: number }[];
  months: { key: string; label: string; count: number; cumulative: number }[];
  shared: (string | number)[][];
  validityRows: (string | number)[][];
  brandTable: (string | number)[][];
  pairTable: (string | number)[][];
  highlights: string[];
  sub41: string[]; sub42: string[]; sub43: string[]; sub44: string[]; sub45: string[]; sub46: string[]; sub47: string[]; sub48: string[]; sub49: string[];
  limits: string[];
};

export function bab4(ds: P47Dataset): Bab4 {
  const unit = unitsOf(ds.lines)[0] ?? "PCS";
  const toRp = rupiahValuer(ds);
  const totalValue = sum(ds.lines.map((l) => toRp(l) ?? 0));
  const issued = new Map(ds.applications.map((a) => [a.id, a.lhviu?.issuedAt?.slice(0, 7) ?? null]));
  const lhviuNo = new Map(ds.applications.map((a) => [a.id, a.lhviu?.number ?? "—"]));
  const byId = new Map(ds.brands.map((b) => [b.id, b]));

  // Brands used in the period: from Merek Management plus any brand only named on a product line.
  const ids = uniq([...ds.brands.filter((b) => b.uses.length).map((b) => b.id), ...ds.lines.map((l) => l.brandId)]).filter(Boolean);
  const brands: BrandRow[] = ids.map((id) => {
    const b = byId.get(id);
    const ls = ds.lines.filter((l) => l.brandId === id);
    const apps = uniq([...(b?.uses.map((u) => u.applicationId) ?? []), ...ls.map((l) => l.applicationId)]);
    const companies = uniq([...(b?.uses.map((u) => u.company) ?? []), ...ls.map((l) => l.company)]);
    return {
      id, name: b?.name || ls[0]?.brandName || "—", owner: b?.owner || "Tidak diisi", origin: b ? brandOrigin(b) : "Tidak diisi", domicile: b ? brandDomicile(b) : "Tidak diisi",
      ownerType: b ? ownerType(b) : "Tidak diisi", evidence: b?.evidenceType || "Tidak diisi", certificate: b ? brandCertificateStatus(b, ds.period.to).label : "Tidak Lengkap",
      classes: b?.classes ?? [], importers: companies, viu: apps.length, lines: ls.length,
      qty: sum(ls.filter((l) => l.unit === unit).map((l) => l.quantity)), value: sum(ls.map((l) => toRp(l) ?? 0)),
      months: uniq(apps.map((a) => issued.get(a)).filter((m): m is string => Boolean(m))),
    };
  }).sort((a, b) => b.value - a.value || b.lines - a.lines);

  const ownerMap = new Map<string, { owner: string; brands: string[]; value: number }>();
  for (const b of brands) {
    const o = ownerMap.get(b.owner) ?? { owner: b.owner, brands: [], value: 0 };
    o.brands.push(b.name);
    o.value += b.value;
    ownerMap.set(b.owner, o);
  }
  const owners = [...ownerMap.values()].sort((a, b) => b.brands.length - a.brands.length || b.value - a.value);

  const pairs = ds.brands.flatMap((b) =>
    b.uses.map((u) => {
      const ls = ds.lines.filter((l) => l.brandId === b.id && l.applicationId === u.applicationId);
      const rel = relationshipOf(u);
      return {
        brand: b.name, owner: b.owner || "Tidak diisi", ownerType: ownerType(b), company: u.company, rel: rel.label, basis: /^Ditunjuk/i.test(u.basis) ? `${rel.basis} (${u.basis.toLowerCase()})` : rel.basis,
        doc: u.docStatus.label, missing: u.missingDocuments, evidence: b.evidenceType || "Tidak diisi",
        qty: sum(ls.filter((l) => l.unit === unit).map((l) => l.quantity)), value: sum(ls.map((l) => toRp(l) ?? 0)),
      };
    }),
  ).sort((a, b) => b.value - a.value);
  const relRows = RELATIONSHIPS.map((r) => {
    const ps = pairs.filter((p) => p.rel === r.label);
    return { label: r.label, basis: r.basis, pairs: ps.length, value: sum(ps.map((p) => p.value)), valid: ps.filter((p) => p.doc === "Valid").length };
  });

  const originRows = ["Lokal", "Luar negeri", "Tidak diisi"].map((origin) => {
    const bs = brands.filter((b) => b.origin === origin);
    return { origin, brands: bs.length, value: sum(bs.map((b) => b.value)), qty: sum(bs.map((b) => b.qty)) };
  }).filter((r) => r.brands > 0);
  const domMap = new Map<string, string[]>();
  for (const b of brands) domMap.set(b.domicile, [...(domMap.get(b.domicile) ?? []), b.name]);
  const domiciles = [...domMap.entries()].map(([country, bs]) => ({ country, brands: bs })).sort((a, b) => b.brands.length - a.brands.length);

  const evidenceKinds = uniq(brands.map((b) => b.evidence)).sort((a, b) => brands.filter((x) => x.evidence === b).length - brands.filter((x) => x.evidence === a).length);
  const evidenceRows = evidenceKinds.map((e) => {
    const bs = brands.filter((b) => b.evidence === e);
    return { evidence: e, brands: bs.length, value: sum(bs.map((b) => b.value)) };
  });
  const evidenceByOrigin = originRows.map((o) => ({
    label: o.origin, parts: evidenceKinds.map((e) => brands.filter((b) => b.origin === o.origin && b.evidence === e).length), total: o.brands,
  }));

  const classMap = new Map<string, { cls: string; label: string; brands: string[]; value: number }>();
  for (const b of brands) {
    for (const c of b.classes.length ? b.classes : ["—"]) {
      const key = c === "—" ? "Tidak diisi" : `Kelas ${c.replace(/^0+/, "")}`;
      const row = classMap.get(key) ?? { cls: key, label: c === "—" ? "Kelas belum dicatat" : niceLabel(c), brands: [], value: 0 };
      row.brands.push(b.name);
      row.value += b.value;
      classMap.set(key, row);
    }
  }
  const classRows = [...classMap.values()].sort((a, b) => b.brands.length - a.brands.length);

  const months: { key: string; label: string; count: number; cumulative: number }[] = [];
  const seen = new Set<string>();
  for (let d = new Date(`${ds.period.from.slice(0, 7)}-01T00:00:00Z`); d.toISOString().slice(0, 7) <= ds.period.to.slice(0, 7) && months.length < 24; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const key = d.toISOString().slice(0, 7);
    const inMonth = brands.filter((b) => b.months.includes(key));
    inMonth.forEach((b) => seen.add(b.id));
    months.push({ key, label: `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(2, 4)}`, count: inMonth.length, cumulative: seen.size });
  }

  const sharedBrands = brands.filter((b) => b.importers.length > 1);
  const shared = sharedBrands.flatMap((b) =>
    ds.applications.filter((a) => ds.lines.some((l) => l.brandId === b.id && l.applicationId === a.id) || byId.get(b.id)?.uses.some((u) => u.applicationId === a.id)).map((a) => {
      const ls = ds.lines.filter((l) => l.brandId === b.id && l.applicationId === a.id);
      return [b.name, b.owner, a.company, lhviuNo.get(a.id) ?? "—", ls.length, Math.round(sum(ls.map((l) => toRp(l) ?? 0)))];
    }),
  );
  const sharedValue = sum(sharedBrands.map((b) => b.value));

  const validityRows = brands.map((b) => {
    const src = byId.get(b.id);
    return [b.name, b.evidence, src?.registrationNumber || "—", src?.registrationDate ? fdLong(src.registrationDate) : "—", src?.expiryDate ? fdLong(src.expiryDate) : "—", b.certificate];
  });
  const brandTable = brands.map((b) => [b.name, b.owner, b.origin, b.evidence, b.classes.length ? b.classes.map((c) => c.replace(/^0+/, "")).join(", ") : "—", b.importers.join("; "), b.viu, Math.round(b.qty), Math.round(b.value), pct1(b.value, totalValue)]);
  const pairTable = pairs.map((p) => [p.brand, p.owner, p.ownerType, p.company, p.rel, p.basis, p.doc, p.evidence, Math.round(p.qty), Math.round(p.value)]);

  // Narrative --------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  if (!brands.length) {
    const none = [`Selama periode pelaporan ${period} belum terdapat merek pada rencana impor.`];
    return { unit, totalValue, brands, owners, pairs, relRows, originRows, domiciles, evidenceRows, evidenceByOrigin, evidenceKinds, classRows, months, shared, validityRows, brandTable, pairTable, highlights: [], sub41: none, sub42: [], sub43: [], sub44: [], sub45: [], sub46: [], sub47: [], sub48: [], sub49: [], limits: [] };
  }
  const companies = uniq(pairs.map((p) => p.company));
  const owner1 = owners[0];
  const valueOwner = [...owners].sort((a, b) => b.value - a.value)[0];
  const local = originRows.find((o) => o.origin === "Lokal");
  const foreign = originRows.find((o) => o.origin === "Luar negeri");
  const unknownOrigin = originRows.find((o) => o.origin === "Tidak diisi");
  const direct = relRows[0];
  const nonDirect = pairs.filter((p) => p.rel !== RELATIONSHIPS[0].label);
  const nonDirectValue = sum(nonDirect.map((p) => p.value));
  const notValid = pairs.filter((p) => p.doc !== "Valid");
  const certified = brands.filter((b) => /^Sertifikat/i.test(b.evidence)).length;
  const active = brands.filter((b) => b.certificate === "Aktif").length;
  const expired = brands.filter((b) => b.certificate === "Kedaluwarsa").length;
  const incomplete = brands.filter((b) => b.certificate === "Tidak Lengkap").length;
  const topB = brands[0];
  const topQty = [...brands].sort((a, b) => b.qty - a.qty)[0];
  const multiViu = brands.filter((b) => b.viu > 1);
  const peak = months.reduce<(typeof months)[number] | null>((a, m) => (!a || m.count > a.count ? m : a), null);
  const persons = nonDirect.filter((p) => p.ownerType === "Perorangan");

  const sub41 = [
    `Rencana impor ${withWords(companies.length || uniq(ds.lines.map((l) => l.applicationId)).length)} Perusahaan API-U mencatat ${withWords(brands.length)} merek dengan ${withWords(owners.filter((o) => o.owner !== "Tidak diisi").length)} pemilik merek, yang membentuk ${withWords(pairs.length)} pasangan merek–pemohon VIU (Gambar 4.1).`,
    owner1
      ? `Pemilik dengan jumlah merek terbanyak adalah ${owner1.owner} (${owner1.brands.length} merek)${owners[1] && owners[1].brands.length > 1 ? ` dan ${owners[1].owner} (${owners[1].brands.length} merek)` : ""}.${valueOwner && valueOwner.value ? ` Dari sisi rencana nilai, ${valueOwner.owner} mencakup ${rp(valueOwner.value)} (${pct1(valueOwner.value, totalValue)} dari total) melalui merek ${joinId(valueOwner.brands.slice(0, 3))}` : ""} (Gambar 4.2).`
      : "",
  ].filter(Boolean);
  const sub42 = [
    `Asal merek ditentukan berdasarkan domisili pemilik merek yang tercatat pada Merek Management. Sebanyak ${local?.brands ?? 0} dari ${brands.length} merek (${pct1(local?.brands ?? 0, brands.length)}) tercatat atas nama pemilik di Indonesia (merek lokal)${foreign ? `, sedangkan ${foreign.brands} merek tercatat atas nama pemilik di luar negeri (${joinId(domiciles.filter((d) => d.country !== "Indonesia" && d.country !== "Tidak diisi").map((d) => d.country))}). Merek luar negeri mencakup ${pct1(foreign.value, totalValue)} dari total rencana nilai dan ${pct1(foreign.qty, sum(originRows.map((o) => o.qty)))} dari total rencana volume` : ""}${unknownOrigin ? `; domisili pemilik ${unknownOrigin.brands} merek belum dicatat` : ""} (Gambar 4.3 dan Gambar 4.4).`,
    "Klasifikasi lokal atau luar negeri mengikuti domisili pemilik yang tercatat, bukan asal merek secara global; merek global yang tercatat atas nama badan usaha di Indonesia diklasifikasikan sebagai merek lokal dan perlu dikonfirmasi dengan dokumen kepemilikan atau penunjukan merek.",
  ];
  const sub43 = [
    `Status pendaftaran ditentukan dari jenis bukti merek pada Merek Management: ${evidenceRows.map((e) => `${e.brands} merek (${pct1(e.brands, brands.length)}) ${/^Tidak/i.test(e.evidence) ? e.evidence.toLowerCase() : `didukung ${e.evidence}`}`).join("; ")} (Gambar 4.5).`,
    `Per akhir periode laporan, bukti merek ${active} merek masih berlaku${expired ? `, ${expired} merek telah kedaluwarsa` : ""}${incomplete ? `, dan ${incomplete} merek belum memiliki nomor pendaftaran yang tercatat` : ""}. Berdasarkan rencana nilai, merek bersertifikat mencakup ${pct1(sum(brands.filter((b) => /^Sertifikat/i.test(b.evidence)).map((b) => b.value)), totalValue)} dari total nilai (Gambar 4.6 dan Tabel 4.5).`,
  ];
  const sub44 = [
    "Hubungan antara Pemohon VIU dan pemilik merek menentukan dasar hak perusahaan untuk mengimpor produk dengan merek tertentu. Pada permohonan VIU Barang Konsumsi, setiap pemohon memilih perannya terhadap merek, yaitu sebagai pemilik merek, perwakilan resmi, atau hanya bertindak sebagai importir yang ditunjuk; setiap peran selain pemilik merek harus didukung dokumen penunjukan (Gambar 4.7).",
    `Dari ${pairs.length} pasangan merek–pemohon VIU, ${direct.pairs} pasangan (${pct1(direct.pairs, pairs.length)}) merupakan pemilik merek langsung, ${relRows[1].pairs} pasangan sebagai perwakilan resmi, dan ${relRows[2].pairs} pasangan sebagai importir yang ditunjuk${relRows[3].pairs ? `; ${relRows[3].pairs} pasangan belum memilih peran` : ""}. Pasangan selain pemilik merek langsung mencakup ${rp(nonDirectValue)} atau ${pct1(nonDirectValue, totalValue)} dari total rencana nilai (Gambar 4.8 dan Tabel 4.1).`,
    notValid.length
      ? `Dokumen hubungan merek ${notValid.length} pasangan belum berstatus valid (${joinId(uniq(notValid.map((p) => p.doc)).map((d) => `${notValid.filter((p) => p.doc === d).length} ${d.toLowerCase()}`))})${persons.length ? `. Pemilik merek perorangan tercatat pada ${persons.length} pasangan dengan pemohon pihak lain` : ""}. Rincian setiap pasangan disajikan pada Tabel 4.2.`
      : `Seluruh dokumen hubungan merek berstatus valid. Rincian setiap pasangan disajikan pada Tabel 4.2.`,
  ];
  const sub45 = [
    classRows.length
      ? `Menurut kelas merek (Klasifikasi Nice) yang tercatat, ${classRows[0].cls} (${classRows[0].label.toLowerCase()}) mencakup merek terbanyak (${classRows[0].brands.length} merek)${classRows[1] ? `, diikuti ${joinId(classRows.slice(1, 3).map((c) => `${c.cls} (${c.brands.length} merek)`))}` : ""}. Satu merek dapat terdaftar pada lebih dari satu kelas (Gambar 4.9).`
      : "",
  ].filter(Boolean);
  const sub46 = [
    topB
      ? `Berdasarkan rencana nilai, ${topB.name} merupakan merek terbesar dengan ${rp(topB.value)} (${pct1(topB.value, totalValue)} dari total)${brands[1] ? `, diikuti ${brands.slice(1, 3).map((b) => `${b.name} (${rp(b.value)})`).join(" dan ")}` : ""}. Berdasarkan rencana volume, ${topQty.name} merupakan merek terbesar dengan ${nf(Math.round(topQty.qty))} ${unit}.${multiViu.length ? ` Merek yang tercantum pada lebih dari satu VIU adalah ${joinId(multiViu.map((b) => b.name))}` : " Setiap merek hanya tercantum pada satu VIU"} (Gambar 4.10; rincian seluruh merek pada Tabel 4.3 di halaman berikut).`
      : "",
  ].filter(Boolean);
  const sub47 = [
    peak && peak.count
      ? `Gambar 4.11 menyajikan jumlah merek dalam VIU yang diselesaikan per bulan terbit LHVIU beserta akumulasinya. Jumlah merek tertinggi tercakup dalam VIU ${peak.label} (${peak.count} merek). Secara kumulatif, jumlah merek mencapai ${months[months.length - 1].cumulative} merek pada akhir periode pelaporan.`
      : "Tanggal terbit LHVIU belum dicatat pada sistem, sehingga tren jumlah merek menurut periode pelaksanaan VIU belum dapat disajikan.",
  ];
  const sub48 = [
    sharedBrands.length
      ? `Sebanyak ${withWords(sharedBrands.length)} merek digunakan oleh lebih dari satu Perusahaan API-U, yaitu ${joinId(sharedBrands.map((b) => `${b.name} (${joinId(b.importers)})`))} (Tabel 4.4).`
      : "Tidak terdapat merek yang digunakan oleh lebih dari satu Perusahaan API-U pada periode pelaporan.",
    sharedBrands.length ? `Nilai rencana impor gabungan atas merek yang digunakan bersama mencapai ${rp(sharedValue)} atau ${pct1(sharedValue, totalValue)} dari total nilai rencana impor. Konsentrasi nilai pada merek yang digunakan oleh lebih dari satu importir perlu menjadi perhatian dalam pengawasan, khususnya terkait kesesuaian kapasitas usaha masing-masing importir dengan rencana impor yang diajukan.` : "",
  ].filter(Boolean);
  const sub49 = [
    `Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 mensyaratkan sertifikat merek sebagai salah satu dokumen persyaratan VIU untuk impor Produk Tekstil sebagai barang konsumsi. Dari ${brands.length} merek, ${certified} didukung sertifikat merek; bukti ${active} merek masih berlaku per ${fdLong(ds.period.to)}${expired ? `, ${expired} merek kedaluwarsa` : ""}${incomplete ? `, dan ${incomplete} merek belum mencatat nomor pendaftaran` : ""} (Tabel 4.5).`,
  ];

  const highlights = [
    `${direct.pairs} dari ${pairs.length} pasangan merek–pemohon VIU (${pct1(direct.pairs, pairs.length)}) merupakan pemilik merek langsung; ${nonDirect.length} pasangan menggunakan merek milik pihak lain sebagai perwakilan resmi atau importir yang ditunjuk.`,
    nonDirect.length ? `Pasangan selain pemilik merek langsung mencakup ${rp(nonDirectValue)} atau ${pct1(nonDirectValue, totalValue)} dari total rencana nilai.` : "",
    `Rencana impor mencatat ${brands.length} merek dari ${owners.filter((o) => o.owner !== "Tidak diisi").length} pemilik merek; ${local?.brands ?? 0} merek (${pct1(local?.brands ?? 0, brands.length)}) merupakan merek lokal${foreign ? ` dan ${foreign.brands} merek luar negeri` : ""}.`,
    `${certified} merek (${pct1(certified, brands.length)}) didukung sertifikat merek; bukti ${active} merek masih berlaku per akhir periode.`,
    notValid.length ? `Dokumen hubungan merek ${notValid.length} pasangan belum berstatus valid.` : "Seluruh dokumen hubungan merek berstatus valid.",
  ].filter(Boolean);

  const limits = [
    "Peran pemohon terhadap merek (pemilik, perwakilan resmi, importir yang ditunjuk) mengikuti pilihan pemohon pada permohonan; status dokumen hubungan merek mengikuti hasil verifikasi dokumen.",
    "Asal merek ditentukan dari domisili pemilik merek yang tercatat pada Merek Management, bukan dari asal merek secara global.",
    "Kelas merek mengikuti kelas yang dicatat pada Merek Management; merek tanpa kelas tercatat dikelompokkan sebagai belum dicatat.",
    "Nilai dihitung dalam Rupiah; product line dalam mata uang asing tanpa kurs tidak termasuk dalam nilai.",
    "Masa berlaku bukti merek dinilai pada akhir periode laporan.",
  ];

  return { unit, totalValue, brands, owners, pairs, relRows, originRows, domiciles, evidenceRows, evidenceByOrigin, evidenceKinds, classRows, months, shared, validityRows, brandTable, pairTable, highlights, sub41, sub42, sub43, sub44, sub45, sub46, sub47, sub48, sub49, limits };
}
