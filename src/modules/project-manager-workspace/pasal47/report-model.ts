import { VIU_KONSUMSI_KBLI } from "../../schemes/viu-konsumsi/terms";

import { kbliRows } from "./company-chapter";
import { brandCertificateStatus, hsRows, unitsOf } from "./derive";
import { compact, fdLong, joinId, nf, sum, sym, uniq, withWords } from "./format";
import { bab3 } from "./report-bab3";
import { bab5 } from "./report-bab5";
import { bab6 } from "./report-bab6";
import { bab7 } from "./report-bab7";
import { bab8 } from "./report-bab8";
import { bab9 } from "./report-bab9";
import { bab10 } from "./report-bab10";
import { rupiahValuer } from "./report-value";
import { dataQualityAlerts, kpis, materialityOf } from "./summary";
import type { P47Application, P47Dataset, P47Report } from "./types";

/*
 * Laporan Pelaksanaan VIU (Pasal 47) laid out like the approved reference report: front matter, ten
 * chapters each opened by a divider page, Kesimpulan dan Rekomendasi, Lampiran. Everything here is
 * counted from the period's dataset — pure functions, no rendering — so the print view and tests share it.
 */

/** The ten chapters, in order. `sources` are the export sections (export-sections.ts) whose tables a
 * chapter still prints until it gets its own figures and narrative. */
export const CHAPTERS: { no: string; title: string; sources: string[] }[] = [
  { no: "8.2", title: "Data Perusahaan API-U", sources: [] },
  { no: "8.3", title: "Komoditas & Pos Tarif/HS", sources: [] },
  { no: "8.4", title: "Negara Asal", sources: [] },
  { no: "8.5", title: "Analisis Struktur Merek", sources: [] },
  { no: "8.7", title: "Persyaratan Teknis", sources: [] },
  { no: "8.8", title: "Persediaan Produk Tekstil", sources: [] },
  { no: "8.9", title: "Modal Operasi & Rencana Nilai Impor", sources: [] },
  { no: "8.10", title: "Konsentrasi Rencana Impor", sources: [] },
  { no: "8.12f", title: "Analisis Fasilitas & Lokasi Pemohon VIU", sources: [] },
  { no: "8.13", title: "Temuan Analitis & Rekomendasi", sources: [] },
];

export const KBLI_REQUIRED: readonly string[] = VIU_KONSUMSI_KBLI;
const MONTHS_LONG = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
const pct1 = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "0%");
const monthKey = (iso: string) => iso.slice(0, 7);
const monthLong = (key: string) => `${MONTHS_LONG[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const monthShort = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;

/* ------------------------------------------------------------------ values */

/** Main currency of the plan (USD when present) and the plan total per company in it. */
export function planValues(ds: P47Dataset) {
  const valueOf = rupiahValuer(ds);
  const byCompany = new Map<string, number>();
  let total = 0;
  let unconverted = 0;
  for (const l of ds.lines) {
    const v = valueOf(l);
    if (v === null) {
      unconverted += 1;
      continue;
    }
    total += v;
    byCompany.set(l.company, (byCompany.get(l.company) ?? 0) + v);
  }
  const ranked = [...byCompany.entries()].sort((a, b) => b[1] - a[1]);
  return { currency: "IDR", total, ranked, unconverted };
}

/* ------------------------------------------------------------------ LHVIU */

export type LhviuMonth = { key: string; label: string; companies: string[] };

/** Months of the period (capped at 24) with the LHVIU issued in each — by the recorded Tanggal Terbit. */
export function lhviuByMonth(ds: P47Dataset): { months: LhviuMonth[]; undated: P47Application[] } {
  const months: LhviuMonth[] = [];
  const start = new Date(`${ds.period.from.slice(0, 7)}-01T00:00:00Z`);
  for (let d = start; monthKey(d.toISOString()) <= monthKey(ds.period.to) && months.length < 24; d.setUTCMonth(d.getUTCMonth() + 1)) {
    const key = monthKey(d.toISOString());
    months.push({ key, label: monthShort(key), companies: [] });
  }
  const undated: P47Application[] = [];
  for (const app of ds.applications) {
    if (!app.lhviu) continue;
    const issued = app.lhviu.issuedAt;
    const month = issued ? months.find((m) => m.key === monthKey(issued)) : undefined;
    if (month) month.companies.push(app.company);
    else undated.push(app);
  }
  return { months, undated };
}

/** LHVIU berlaku 1 tahun sejak terbit (Pasal 39 ayat (6)); months left counted from `asOf`. */
export function lhviuValidity(issuedAt: string, asOf: string) {
  const end = new Date(`${issuedAt}T00:00:00Z`);
  end.setUTCFullYear(end.getUTCFullYear() + 1);
  const until = end.toISOString().slice(0, 10);
  const ref = new Date(`${asOf.slice(0, 10)}T00:00:00Z`);
  const monthsLeft = (end.getUTCFullYear() - ref.getUTCFullYear()) * 12 + (end.getUTCMonth() - ref.getUTCMonth()) - (end.getUTCDate() < ref.getUTCDate() ? 1 : 0);
  const status = until < asOf.slice(0, 10) ? "Tidak berlaku" : monthsLeft <= 3 ? "Berlaku – segera berakhir" : "Berlaku";
  return { until, monthsLeft: Math.max(monthsLeft, 0), status };
}

/* ------------------------------------------------------------------ KBLI */

/** Companies holding none of the KBLI required by Pasal 37 ayat (2). */
export const kbliNonCompliant = (ds: P47Dataset) => {
  const k = kbliCompliance(ds);
  return k.companies.filter((c) => !k.compliant.includes(c));
};

export function kbliCompliance(ds: P47Dataset) {
  const apps = ds.applications;
  const companies = uniq(apps.map((a) => a.company));
  const perCompany = new Map<string, Set<string>>();
  for (const a of apps) {
    const set = perCompany.get(a.company) ?? new Set<string>();
    for (const k of a.kbli) if (k.code) set.add(k.code);
    perCompany.set(a.company, set);
  }
  const pairs = [...perCompany.values()].reduce((n, set) => n + set.size, 0);
  const requiredPairs = [...perCompany.values()].reduce((n, set) => n + [...set].filter((c) => KBLI_REQUIRED.includes(c)).length, 0);
  const compliant = [...perCompany.entries()].filter(([, set]) => [...set].some((c) => KBLI_REQUIRED.includes(c))).map(([c]) => c);
  const all = kbliRows(apps);
  const descriptions = new Map(all.map((r) => [r.code, r.description]));
  const required = KBLI_REQUIRED.map((code) => ({
    code,
    description: descriptions.get(code) ?? "",
    companies: [...perCompany.entries()].filter(([, set]) => set.has(code)).map(([c]) => c),
  })).sort((a, b) => b.companies.length - a.companies.length || a.code.localeCompare(b.code));
  return { companies, compliant, pairs, requiredPairs, distinct: all.length, required };
}

/* ------------------------------------------------------------------ Bab 1 */

export type Bab1 = {
  highlights: string[];
  sub11: string[];
  sub12: string[];
  sub13: string[];
  limits: string[];
  months: LhviuMonth[];
  kbli: ReturnType<typeof kbliCompliance>;
  companyRows: (string | number)[][];
};

export function bab1(ds: P47Dataset): Bab1 {
  const apps = ds.applications;
  const asOf = ds.generatedAt ? ds.generatedAt.slice(0, 10) : ds.period.to;
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const companies = uniq(apps.map((a) => a.companyId ?? a.company));
  const withLhviu = apps.filter((a) => a.lhviu);
  const { months, undated } = lhviuByMonth(ds);
  const active = months.filter((m) => m.companies.length);
  const dated = sum(months.map((m) => m.companies.length));
  const peak = active.reduce<LhviuMonth | null>((a, m) => (!a || m.companies.length > a.companies.length ? m : a), null);
  const empty = months.filter((m) => !m.companies.length && m.key <= monthKey(asOf));
  const noNumber = withLhviu.filter((a) => !a.lhviu?.number);
  const kbli = kbliCompliance(ds);
  const held = kbli.required.filter((r) => r.companies.length);
  const notHeld = kbli.required.filter((r) => !r.companies.length).map((r) => r.code);

  const sub11: string[] = [];
  if (!apps.length) {
    sub11.push(`Selama periode pelaporan ${period}, belum terdapat Perusahaan API-U yang mengajukan VIU Produk Tekstil sebagai Barang Konsumsi.`);
  } else {
    sub11.push(
      `Selama periode pelaporan ${period}, tercatat ${withWords(companies.length)} Perusahaan API-U dengan ${withWords(apps.length)} permohonan VIU Produk Tekstil sebagai Barang Konsumsi, dan ${withWords(withLhviu.length)} LHVIU telah diterbitkan.${companies.length === apps.length ? " Setiap Perusahaan API-U mengajukan satu permohonan." : ` Sebanyak ${apps.length - companies.length} perusahaan mengajukan lebih dari satu permohonan.`}`,
    );
    if (dated && peak) {
      const emptyText = empty.length ? `, sedangkan pada ${joinId(empty.map((m) => monthLong(m.key)))} tidak terdapat penerbitan LHVIU` : "";
      sub11.push(
        `Penerbitan LHVIU tercatat dalam ${withWords(active.length)} bulan, dengan rata-rata ${(dated / active.length).toFixed(1).replace(".", ",")} LHVIU per bulan aktif. Penerbitan tertinggi terjadi pada ${monthLong(peak.key)} sebanyak ${peak.companies.length} LHVIU (${pct1(peak.companies.length, dated)})${emptyText} (Gambar 1.1 dan Tabel 1.1).`,
      );
    }
    if (undated.length) {
      sub11.push(`Tanggal terbit ${undated.length} LHVIU belum dicatat pada sistem sehingga belum masuk dalam sebaran per bulan; tanggal tersebut perlu diisi pada tab LHVIU permohonan yang bersangkutan.`);
    }
  }

  const sub12: string[] = [
    `Berdasarkan Pasal 37 ayat (2) huruf c angka 2 Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, Perusahaan API-U yang mengimpor Produk Tekstil sebagai barang konsumsi wajib memiliki Perizinan Berusaha di bidang perdagangan besar dengan KBLI ${joinId([...KBLI_REQUIRED])}.`,
  ];
  if (kbli.companies.length) {
    sub12.push(
      `Hasil penelaahan menunjukkan bahwa ${kbli.compliant.length} dari ${kbli.companies.length} Perusahaan API-U (${pct1(kbli.compliant.length, kbli.companies.length)}) memiliki sedikitnya satu KBLI yang dipersyaratkan. Secara keseluruhan tercatat ${kbli.pairs} KBLI pada ${kbli.companies.length} perusahaan (rata-rata ${(kbli.pairs / kbli.companies.length).toFixed(1).replace(".", ",")} KBLI per perusahaan) yang terdiri atas ${withWords(kbli.distinct)} kode KBLI berbeda. Sebanyak ${kbli.requiredPairs} KBLI (${pct1(kbli.requiredPairs, kbli.pairs)}) termasuk dalam daftar KBLI yang dipersyaratkan, sedangkan ${kbli.pairs - kbli.requiredPairs} KBLI (${pct1(kbli.pairs - kbli.requiredPairs, kbli.pairs)}) merupakan kegiatan usaha lain di luar ruang lingkup persyaratan.`,
    );
    if (held.length) {
      const top = held.slice(0, 3).map((r) => `${r.code}${r.description ? ` (${r.description})` : ""} pada ${r.companies.length} perusahaan (${pct1(r.companies.length, kbli.companies.length)})`);
      sub12.push(`KBLI yang dipersyaratkan dan paling banyak dimiliki adalah ${joinId(top)}.${notHeld.length ? ` KBLI ${joinId(notHeld)} tidak dimiliki oleh Perusahaan API-U mana pun` : ""}${notHeld.length ? " (Gambar 1.2)." : ""}`);
    }
    const missing = kbli.companies.filter((c) => !kbli.compliant.includes(c));
    if (missing.length) sub12.push(`Perusahaan yang belum memiliki KBLI yang dipersyaratkan dan perlu dikonfirmasi: ${joinId(missing)}.`);
  }

  const validity = withLhviu.filter((a) => a.lhviu?.issuedAt).map((a) => ({ app: a, ...lhviuValidity(a.lhviu!.issuedAt!, asOf) }));
  const valid = validity.filter((v) => v.status !== "Tidak berlaku");
  const expiring = validity.filter((v) => v.status === "Berlaku – segera berakhir");
  const ends = validity.map((v) => v.until).sort();
  const sub13: string[] = [
    "Sesuai Pasal 39 ayat (6) Peraturan Menteri Perindustrian Nomor 27 Tahun 2025, LHVIU berlaku untuk jangka waktu 1 (satu) tahun sejak diterbitkan dan tidak dapat diperpanjang. Perubahan data perusahaan atau penambahan komoditas sebelum masa berlaku berakhir dilakukan melalui pengajuan VIU baru, dan LHVIU sebelumnya dinyatakan tidak berlaku setelah LHVIU baru diterbitkan (Pasal 40).",
  ];
  if (validity.length) {
    sub13.push(
      `Per tanggal penyusunan laporan, ${fdLong(asOf)}, ${valid.length} dari ${validity.length} LHVIU yang tanggal terbitnya tercatat masih berlaku. Masa berlaku paling awal berakhir pada ${fdLong(ends[0])}, sedangkan paling akhir pada ${fdLong(ends[ends.length - 1])}. ${expiring.length ? `Sebanyak ${expiring.length} LHVIU akan berakhir dalam 3 (tiga) bulan ke depan.` : "Tidak terdapat LHVIU yang akan berakhir dalam 3 (tiga) bulan ke depan."}`,
    );
  } else if (withLhviu.length) {
    sub13.push("Masa berlaku LHVIU belum dapat dihitung karena tanggal terbit LHVIU belum dicatat pada sistem.");
  }
  sub13.push(
    "Tabel 1.2 pada halaman berikut menyajikan daftar seluruh Perusahaan API-U beserta status LHVIU masing-masing, meliputi nomor dan tanggal terbit LHVIU, akhir masa berlaku, sisa masa berlaku, Nomor Induk Berusaha (NIB), jumlah KBLI, jumlah product line, serta merek yang diajukan.",
  );

  const brandsOf = (appId: string) => uniq(ds.lines.filter((l) => l.applicationId === appId).map((l) => l.brandName).filter(Boolean));
  const companyRows = [...apps]
    .sort((a, b) => (a.lhviu?.issuedAt ?? "9999").localeCompare(b.lhviu?.issuedAt ?? "9999") || a.company.localeCompare(b.company, "id"))
    .map((a) => {
      const v = a.lhviu?.issuedAt ? lhviuValidity(a.lhviu.issuedAt, asOf) : null;
      const brands = brandsOf(a.id);
      return [
        a.company,
        a.lhviu?.number ?? (a.lhviu ? "Belum dicatat" : "—"),
        a.lhviu ? (v ? v.status : "Terbit (tanggal belum dicatat)") : a.status === "COMPLETED" ? "Belum diunggah" : "Dalam proses",
        a.lhviu?.issuedAt ? fdLong(a.lhviu.issuedAt) : "—",
        v ? fdLong(v.until) : "—",
        v ? (v.status === "Tidak berlaku" ? "—" : `± ${v.monthsLeft} bln`) : "—",
        a.nib || "—",
        a.kbli.length,
        ds.lines.filter((l) => l.applicationId === a.id).length,
        brands.length > 3 ? `${brands.slice(0, 2).join(", ")} +${brands.length - 2} merek lainnya` : brands.join(", ") || "—",
      ];
    });

  const highlights = apps.length
    ? [
        `${withWords(companies.length)} Perusahaan API-U mengajukan ${apps.length} permohonan; ${withLhviu.length} LHVIU telah diterbitkan${peak ? `, terbanyak pada ${monthLong(peak.key)} (${peak.companies.length} LHVIU)` : ""}.`,
        `${kbli.compliant.length} dari ${kbli.companies.length} perusahaan memiliki KBLI yang dipersyaratkan Pasal 37${held[0] ? `; KBLI ${held[0].code} paling banyak dimiliki (${held[0].companies.length} perusahaan)` : ""}.`,
        validity.length ? `${valid.length} dari ${validity.length} LHVIU masih berlaku per ${fdLong(asOf)}; ${expiring.length} akan berakhir dalam 3 bulan.` : "Masa berlaku LHVIU belum dapat dihitung karena tanggal terbit belum dicatat.",
        noNumber.length || undated.length ? `${noNumber.length} LHVIU belum dicatat nomornya dan ${undated.length} belum dicatat tanggal terbitnya.` : "Nomor dan tanggal terbit seluruh LHVIU telah dicatat.",
      ]
    : [];

  const limits = [
    "KBLI yang dinilai adalah KBLI Utama pada profil perusahaan di sistem; KBLI pada dokumen perizinan yang tidak dicatat di profil tidak ikut dihitung.",
    "Bulan terbit dan masa berlaku LHVIU dihitung dari Nomor dan Tanggal Terbit yang dicatat Project Manager pada tab LHVIU, bukan dari tanggal unggah file.",
    "Masa berlaku dihitung 1 (satu) tahun sejak tanggal terbit tanpa memperhitungkan LHVIU yang dinyatakan tidak berlaku karena terbitnya LHVIU baru.",
    "Permohonan dihitung bila Tanggal Pengajuan berada dalam periode laporan; draf dan permohonan yang ditarik tidak dihitung.",
  ];

  return { highlights, sub11, sub12, sub13, limits, months, kbli, companyRows };
}

/* ------------------------------------------------------------------ dividers */

export type Divider = { lead: string; scope: string[]; stats: [string, string][] };

export function chapterDivider(no: string, ds: P47Dataset, report: P47Report): Divider {
  const k = kpis(ds, report);
  const apps = ds.applications;
  const period = `${fdLong(ds.period.from)} – ${fdLong(ds.period.to)}`;
  const n = (v: number) => String(v);
  switch (no) {
    case "8.2":
      return {
        lead: `Profil Perusahaan pemegang Angka Pengenal Importir Umum (API-U) yang mengajukan VIU Produk Tekstil sebagai Barang Konsumsi pada periode ${period}: periode penerbitan LHVIU, kesesuaian KBLI, dan status LHVIU.`,
        scope: ["Profil dan periode penerbitan LHVIU", "Kesesuaian KBLI terhadap persyaratan", "Daftar Perusahaan API-U dan status LHVIU"],
        stats: [[n(k.companies), "PERUSAHAAN API-U"], [n(k.applications), "PERMOHONAN"], [`${kbliCompliance(ds).compliant.length}/${uniq(apps.map((a) => a.company)).length}`, "KBLI SESUAI"], [`${k.lhviu}/${k.applications}`, "LHVIU TERBIT"]],
      };
    case "8.3": {
      const r = hsRows(ds.lines);
      return {
        lead: "Pos tarif/Harmonized System (HS) dan kelompok komoditas Produk Tekstil yang diajukan dalam permohonan VIU, beserta rencana kebutuhan impor per satuan dan menurut periode.",
        scope: ["Kelompok komoditas", "Sebaran pos tarif/HS", "Rencana kebutuhan per pos tarif/HS", "Rencana impor menurut periode", "Ragam komoditas per perusahaan"],
        stats: [[n(k.hs), "POS TARIF/HS"], [n(k.lines), "PRODUCT LINE"], [n(uniq(r.map((x) => x.subKelompok).filter(Boolean)).length), "SUB KELOMPOK"], [n(unitsOf(ds.lines).length), "SATUAN"]],
      };
    }
    case "8.4": {
      const b = bab3(ds);
      const top = b.countries[0];
      return {
        lead: "Negara asal Produk Tekstil yang direncanakan untuk diimpor: rencana volume, nilai, dan share per negara (estimasi), tren menurut periode pelaksanaan VIU, produk, importir, dan pola pencantuman negara asal.",
        scope: ["Negara asal produk", "Rencana volume, nilai, dan share", "Tren rencana impor per negara", "Produk/bab HS per negara", "Profil negara asal utama", "Pola pencantuman negara asal", "Negara asal menurut perusahaan"],
        stats: [[n(b.countries.length), "NEGARA ASAL"], [nf(b.relations), "RELASI PRODUCT LINE"], [top?.name ?? "—", "NEGARA DOMINAN"], [top && b.totalValue ? pct1(top.value, b.totalValue) : "—", "SHARE NILAI (ESTIMASI)"]],
      };
    }
    case "8.5": {
      const uses = ds.brands.flatMap((b) => b.uses);
      const active = ds.brands.filter((b) => brandCertificateStatus(b, ds.period.to).tone === "ok").length;
      return {
        lead: "Struktur merek dalam rencana impor: merek yang diajukan, pemilik dan perwakilannya, bukti kepemilikan merek, serta hubungan Pemohon VIU dengan pemilik merek.",
        scope: ["Merek dan pemilik merek", "Asal merek: lokal dan luar negeri", "Status pendaftaran merek", "Hubungan Pemohon VIU dengan pemilik merek", "Kelas merek", "Rencana impor per merek", "Tren jumlah merek", "Merek dengan lebih dari satu importir", "Bukti kepemilikan merek"],
        stats: [[n(ds.brands.length), "MEREK"], [n(uniq(uses.map((u) => u.company)).length), "PEMOHON VIU"], [`${uses.filter((u) => u.docStatus.tone === "ok").length}/${uses.length}`, "DOKUMEN VALID"], [`${active}/${ds.brands.length}`, "BUKTI MEREK AKTIF"]],
      };
    }
    case "8.7": {
      const b = bab5(ds);
      return {
        lead: `Bukti pemenuhan persyaratan teknis yang dilampirkan ${b.companies.length} Perusahaan API-U: Sertifikat Hasil Uji Mutu per merek dan sub kelompok komoditas beserta cakupannya terhadap ${nf(ds.lines.length)} product line, status, laboratorium, masa berlaku, dan Surat Pernyataan Label Berbahasa Indonesia.`,
        scope: ["Ketentuan dan cakupan bukti pemenuhan", "Status sertifikat uji mutu", "Laboratorium penguji", "Masa berlaku dan batas pengajuan", "Satu sertifikat untuk beberapa product line", "Label Berbahasa Indonesia", "Rincian per perusahaan"],
        stats: [[`${nf(b.covered.length)}/${nf(ds.lines.length)}`, "PRODUCT LINE TERCAKUP"], [n(b.certs.length), "SERTIFIKAT UJI MUTU"], [`${b.certs.filter((c) => c.status.tone === "ok").length}/${b.certs.length}`, "SERTIFIKAT LENGKAP"], [n(b.certs.filter((c) => c.validity === "Kedaluwarsa").length), "KEDALUWARSA"]],
      };
    }
    case "8.8": {
      const b = bab6(ds);
      return {
        lead: `Persediaan Produk Tekstil yang dilaporkan ${b.companies.length} Perusahaan API-U per product line dan perbandingannya dengan rencana impor, serta analisis kapasitas gudang oleh Technical Analyst.`,
        scope: ["Ringkasan persediaan", "Persediaan per perusahaan", "Persediaan menurut kelompok komoditas", "Kapasitas gudang", "Rincian per perusahaan"],
        stats: [[nf(ds.lines.length), "PRODUCT LINE"], [ds.lines.length ? pct1(b.zero.length, ds.lines.length) : "—", "LINE STOK NOL"], [nf(Math.round(b.stockByUnit[0] ?? 0)), `PERSEDIAAN ${b.unit.toUpperCase()}`], [n(b.companies.filter((c) => c.stocked === 0).length), "API-U TANPA STOK"]],
      };
    }
    case "8.9": {
      const b = bab7(ds);
      return {
        lead: "Perbandingan modal operasi Pemohon VIU dengan rencana nilai impor yang diajukan, serta rasio rencana impor terhadap modal operasi dan penilaian modal oleh Technical Analyst.",
        scope: ["Ringkasan modal operasi dan rencana nilai impor", "Distribusi modal operasi", "Rencana nilai impor per pemohon", "Modal operasi dan rencana nilai impor", "Rasio rencana impor terhadap modal operasi", "Penilaian modal dan rincian per pemohon"],
        stats: [[n(b.rows.length), "PERMOHONAN VIU"], [`Rp ${compact(b.totalPlan)}`, "RENCANA NILAI IMPOR"], [`${b.withModal.length}/${b.rows.length}`, "MODAL TERCATAT"], [n(b.withModal.filter((r) => (r.ratio ?? 0) > 1).length), "RASIO > 100%"]],
      };
    }
    case "8.10": {
      const b = bab8(ds);
      const [company, owner] = b.dims;
      return {
        lead: "Tingkat konsentrasi rencana nilai impor menurut enam dimensi, diukur dengan rasio konsentrasi (CR1, CR3, CR5) dan Herfindahl-Hirschman Index (HHI).",
        scope: ["Metode pengukuran konsentrasi", "Indeks konsentrasi per dimensi", "Entitas dengan pangsa terbesar"],
        stats: [[nf(company.hhi), "HHI PEMOHON"], [company.total ? pct1(company.cr3, 1) : "—", "CR3 PEMOHON"], [nf(owner.hhi), "HHI PEMILIK MEREK"], [n(b.dims.filter((d) => d.level === "Tinggi").length), "DIMENSI KONSENTRASI TINGGI"]],
      };
    }
    case "8.12f": {
      const b = bab9(ds);
      const areas = b.gudang.map((g) => g.area).filter((v): v is number => typeof v === "number" && v > 0);
      return {
        lead: "Fasilitas kantor dan gudang Pemohon VIU: lokasi, status kepemilikan, legalitas, luas, dan keterkaitannya dengan rencana impor.",
        scope: ["Ringkasan fasilitas", "Kantor: kepemilikan dan lokasi", "Gudang: kepemilikan, lokasi, dan legalitas", "Luas gudang dan rencana impor"],
        stats: [[n(b.rows.length), "PEMOHON VIU"], [n(b.gudang.length), "GUDANG"], [`${b.gudang.filter((g) => g.registration).length}/${b.gudang.length}`, "GUDANG BERTANDA DAFTAR"], [areas.length ? `${nf(Math.round(sum(areas) / areas.length))} m²` : "—", "RATA-RATA LUAS GUDANG"]],
      };
    }
    case "8.13": {
      const b = bab10(ds, report, kbliNonCompliant(ds));
      return {
        lead: "Temuan analitis hasil penelaahan data Bab 1 sampai dengan Bab 9, temuan pelaksanaan verifikasi beserta materialitasnya, rekomendasi tindak lanjut, dan kebutuhan data untuk melengkapi analisis.",
        scope: ["Dasar penetapan temuan dan prioritas", "Temuan analitis dan rekomendasi", "Temuan pelaksanaan verifikasi", "Kebutuhan data"],
        stats: [[n(b.analytic.length), "TEMUAN ANALITIS"], [n(b.analytic.filter((x) => x.priority === "Tinggi").length), "PRIORITAS TINGGI"], [n(ds.findings.length), "TEMUAN VERIFIKASI"], [n(k.material), "ISU MATERIAL"]],
      };
    }
  }
  return { lead: "", scope: [], stats: [] };
}

/* ------------------------------------------------------------------ front & back matter */

export const GLOSSARY: [string, string][] = [
  ["API-U", "Angka Pengenal Importir Umum; perusahaan pemegang API-U disebut Perusahaan API-U."],
  ["Bukti merek", "Sertifikat merek atau tanda pendaftaran merek yang dilampirkan pada data merek."],
  ["HS / Pos tarif", "Kode Harmonized System sesuai Buku Tarif Kepabeanan Indonesia (BTKI) untuk barang yang diimpor."],
  ["KBLI", "Klasifikasi Baku Lapangan Usaha Indonesia; KBLI yang dinilai adalah KBLI Utama pada profil perusahaan."],
  ["LHVIU", "Laporan Hasil Verifikasi Importir Umum; berlaku 1 (satu) tahun sejak diterbitkan (Pasal 39 ayat (6))."],
  ["NIB", "Nomor Induk Berusaha."],
  ["Pemohon VIU", "Perusahaan API-U yang mengajukan permohonan VIU pada periode laporan."],
  ["Product line", "Satu baris produk pada Product Information permohonan: produk, merek, pos tarif/HS, negara asal, kuantitas, dan harga."],
  ["Relasi produk-negara", "Pasangan product line dengan negara asalnya; satu product line dapat mencantumkan lebih dari satu negara asal."],
  ["Rencana nilai impor", "Kuantitas dikalikan harga satuan rata-rata per product line, dijumlahkan per mata uang."],
  ["Satuan", "Satuan kuantitas (mis. PCS, KG, M2); kuantitas tidak dijumlahkan lintas satuan."],
  ["Temuan material", "Temuan yang ditetapkan Project Manager berpengaruh terhadap kesimpulan pelaporan."],
  ["VIU", "Verifikasi Importir Umum sebagaimana diatur dalam Peraturan Menteri Perindustrian Nomor 27 Tahun 2025."],
];

export type Executive = { lead: string; findings: string[]; recs: string[]; concl: string; limits: string[] };

/** Ringkasan Eksekutif and the Kesimpulan dan Rekomendasi page — findings and recommendations counted from the data. */
export function executiveSummary(ds: P47Dataset, report: P47Report): Executive {
  const k = kpis(ds, report);
  const apps = ds.applications;
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const v = planValues(ds);
  const valueText = v.total ? `, dengan rencana nilai ${sym(v.currency)} ${compact(v.total)}${v.unconverted ? ` (di luar ${v.unconverted} product line dalam mata uang asing yang belum memiliki kurs)` : ""}` : "";
  const lead = apps.length
    ? `Pada periode ${period}, PT Tribhakti Inspektama melaksanakan VIU Produk Tekstil sebagai Barang Konsumsi terhadap ${k.companies} Perusahaan API-U atas ${k.applications} permohonan dan menerbitkan ${k.lhviu} LHVIU. Rencana impor mencakup ${k.lines} product line, ${k.hs} pos tarif/HS, ${k.brands} merek, dan ${k.countries} negara asal${valueText}.`
    : `Pada periode ${period} belum terdapat permohonan VIU Produk Tekstil sebagai Barang Konsumsi.`;

  const findings: string[] = [];
  const recs: string[] = [];
  if (apps.length) {
    if (v.ranked.length >= 3 && v.total) {
      const top3 = sum(v.ranked.slice(0, 3).map(([, x]) => x));
      findings.push(`Rencana nilai impor terkonsentrasi: tiga Pemohon VIU mencakup ${pct1(top3, v.total)} dan ${v.ranked[0][0]} sendiri mencakup ${pct1(v.ranked[0][1], v.total)} dari total rencana nilai (Bab 8).`);
    }
    const uses = ds.brands.flatMap((b) => b.uses);
    const notValid = uses.filter((u) => u.docStatus.tone !== "ok");
    if (uses.length) {
      findings.push(`${uses.length - notValid.length} dari ${uses.length} hubungan merek–pemohon memiliki dokumen hubungan merek yang valid (Bab 4).`);
      if (notValid.length) recs.push(`Melengkapi atau menelaah dokumen hubungan merek untuk ${notValid.length} hubungan merek–pemohon yang belum valid.`);
    }
    if (ds.technical.length) {
      const ok = ds.technical.filter((t) => t.status.tone === "ok").length;
      findings.push(`${ok} dari ${ds.technical.length} Sertifikat Hasil Uji Mutu berstatus lengkap (Bab 5).`);
      if (ok < ds.technical.length) recs.push(`Menindaklanjuti ${ds.technical.length - ok} Sertifikat Hasil Uji Mutu yang belum lengkap, ditolak, atau kedaluwarsa.`);
    }
    const kb = kbliCompliance(ds);
    findings.push(`${kb.compliant.length} dari ${kb.companies.length} Perusahaan API-U memiliki KBLI yang dipersyaratkan Pasal 37; ${k.lhviu} dari ${k.applications} permohonan telah memperoleh LHVIU (Bab 1).`);
    if (kb.compliant.length < kb.companies.length) recs.push(`Mengonfirmasi KBLI ${kb.companies.length - kb.compliant.length} Perusahaan API-U yang belum memiliki KBLI yang dipersyaratkan.`);
    const c = bab3(ds).countries[0];
    const auto = ds.lines.filter((l) => l.countryAutoFilled).length;
    if (c) {
      findings.push(`${c.name} tercantum sebagai negara asal pada ${c.lines} dari ${k.lines} product line${auto ? `; negara asal ${auto} product line diisi sistem karena kosong saat diajukan` : ""} (Bab 3).`);
      if (auto) recs.push(`Mengonfirmasi negara asal ${auto} product line yang diisi sistem (REP. RAKYAT CINA) kepada Pemohon VIU.`);
    }
    if (k.findings) findings.push(`Terdapat ${k.findings} temuan pelaksanaan verifikasi; ${k.material} ditetapkan material oleh Project Manager (Bab 10).`);
    if (k.material) recs.push(`Menindaklanjuti ${k.material} temuan material sebelum laporan disampaikan kepada Kementerian Perindustrian.`);
    const lhviuGap = apps.filter((a) => a.lhviu && (!a.lhviu.number || !a.lhviu.issuedAt)).length;
    if (lhviuGap) recs.push(`Mencatat nomor dan tanggal terbit ${lhviuGap} LHVIU pada tab LHVIU agar masa berlaku dapat dipantau.`);
    const noCap = ds.warehouses.filter((w) => w.capacity === null).length;
    const noModal = ds.values.filter((x) => x.modalKerja === null).length;
    if (noCap || noModal) recs.push(`Melengkapi data ${[noCap ? `kapasitas ${noCap} gudang` : "", noModal ? `modal kerja ${noModal} pemohon` : ""].filter(Boolean).join(" dan ")} pada analisis teknis agar Bab 6, Bab 7, dan Bab 9 dapat diselesaikan.`);
  }
  const concl = !apps.length
    ? "Belum terdapat pelaksanaan VIU pada periode ini."
    : k.material
      ? `Pelaksanaan VIU pada periode pelaporan menghasilkan ${k.lhviu} LHVIU. Terdapat ${k.material} isu material yang perlu ditindaklanjuti sebelum laporan disampaikan kepada Kementerian Perindustrian.`
      : `Pelaksanaan VIU pada periode pelaporan menghasilkan ${k.lhviu} LHVIU dari ${k.applications} permohonan. Belum terdapat temuan yang ditetapkan material; Project Manager perlu menelaah materialitas temuan sebelum laporan disetujui.`;
  const limits = dataQualityAlerts(ds).map((a) => a.text);
  return { lead, findings: findings.slice(0, 6), recs: recs.slice(0, 6), concl, limits };
}

/** Materiality of a finding as the PM set it — re-exported for the chapter pages. */
export { materialityOf };
