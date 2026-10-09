import { unitsOf } from "./derive";
import { compact, fdLong, joinId, nf, sum, uniq, withWords } from "./format";
import { rupiahValuer } from "./report-value";
import type { P47Dataset, P47Line, P47Technical } from "./types";

/*
 * Bab 5 "Persyaratan Teknis" of the Laporan Pelaksanaan VIU: the Sertifikat Hasil Uji Mutu each applicant
 * attached per merek × sub kelompok komoditas, how many product lines each one covers, its status after
 * document verification, the laboratory, validity and the 6-month submission window, and the Surat
 * Pernyataan Label Berbahasa Indonesia per permohonan. Values in Rupiah (report-value.ts).
 */

const pct1 = (part: number, total: number) => (total > 0 ? (part > 0 && (part / total) * 100 < 0.05 ? "<0,1%" : `${((part / total) * 100).toFixed(1).replace(".", ",")}%`) : "0%");
const rp = (v: number) => `Rp ${compact(v)}`;
const norm = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, " ").trim();
const keyOf = (applicationId: string, brand: string, sub: string) => `${applicationId}|${norm(brand)}|${norm(sub)}`;

/** Status order after document verification (dataset.server.ts). */
export const TECH_STATUSES = ["Lengkap", "Perlu Review", "Lewat 6 Bulan", "Kedaluwarsa", "Ditolak", "Tidak Lengkap"] as const;
export const VALIDITY = ["Berlaku", "Berlaku – segera berakhir", "Kedaluwarsa", "Tidak dicatat"] as const;

/** Validity of a certificate at `asOf`: "segera berakhir" when 3 months or less are left. */
export function certificateValidity(validUntil: string, asOf: string): (typeof VALIDITY)[number] {
  const until = validUntil.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(until)) return "Tidak dicatat";
  const ref = asOf.slice(0, 10);
  if (until < ref) return "Kedaluwarsa";
  const limit = new Date(`${ref}T00:00:00Z`);
  limit.setUTCMonth(limit.getUTCMonth() + 3);
  return until <= limit.toISOString().slice(0, 10) ? "Berlaku – segera berakhir" : "Berlaku";
}

export type CertRow = P47Technical & { lines: P47Line[]; hs: string[]; value: number; qty: number; validity: (typeof VALIDITY)[number]; lab: string; number: string };

export type Bab5 = {
  unit: string;
  totalValue: number;
  certs: CertRow[];
  covered: P47Line[];
  uncovered: P47Line[];
  coveredValue: number;
  statusRows: { label: string; certs: number; lines: number; value: number }[];
  validityRows: { label: string; certs: number; lines: number }[];
  labs: { lab: string; certs: number; companies: string[]; lines: number }[];
  numbers: { number: string; certs: CertRow[]; companies: string[] }[];
  labels: { label: string; ok: boolean; apps: number; companies: string[] }[];
  companies: { company: string; lines: number; certs: number; covered: number; uncovered: number; complete: number; expiring: number; label: string; value: number }[];
  multiTable: (string | number)[][];
  companyTable: (string | number)[][];
  certTable: (string | number)[][];
  highlights: string[];
  sub51: string[]; sub52: string[]; sub53: string[]; sub54: string[]; sub55: string[]; sub56: string[]; sub57: string[];
  limits: string[];
};

export function bab5(ds: P47Dataset): Bab5 {
  const unit = unitsOf(ds.lines)[0] ?? "PCS";
  const toRp = rupiahValuer(ds);
  const valueOf = (ls: P47Line[]) => sum(ls.map((l) => toRp(l) ?? 0));
  const totalValue = valueOf(ds.lines);
  const asOf = ds.period.to;

  // A product line is covered by the certificate of its own application, merek and sub kelompok.
  const linesByKey = new Map<string, P47Line[]>();
  for (const l of ds.lines) {
    const k = keyOf(l.applicationId, l.brandName, l.subKelompok);
    linesByKey.set(k, [...(linesByKey.get(k) ?? []), l]);
  }
  const certs: CertRow[] = ds.technical.map((t) => {
    const ls = linesByKey.get(keyOf(t.applicationId, t.brandName, t.subKelompok)) ?? [];
    return {
      ...t, lines: ls, hs: uniq(ls.map((l) => l.hs)), value: valueOf(ls), qty: sum(ls.filter((l) => l.unit === unit).map((l) => l.quantity)),
      validity: certificateValidity(t.validUntil, asOf), lab: t.laboratory.trim() || "Tidak dicatat", number: t.reportNumber.trim(),
    };
  }).sort((a, b) => b.lines.length - a.lines.length || b.value - a.value);
  const certKeys = new Set(ds.technical.map((t) => keyOf(t.applicationId, t.brandName, t.subKelompok)));
  const covered = ds.lines.filter((l) => certKeys.has(keyOf(l.applicationId, l.brandName, l.subKelompok)));
  const uncovered = ds.lines.filter((l) => !certKeys.has(keyOf(l.applicationId, l.brandName, l.subKelompok)));
  const coveredValue = valueOf(covered);

  const statusRows = uniq([...TECH_STATUSES, ...certs.map((c) => c.status.label)]).map((label) => {
    const cs = certs.filter((c) => c.status.label === label);
    return { label, certs: cs.length, lines: sum(cs.map((c) => c.lines.length)), value: sum(cs.map((c) => c.value)) };
  }).filter((r) => r.certs > 0);
  const validityRows = VALIDITY.map((label) => {
    const cs = certs.filter((c) => c.validity === label);
    return { label, certs: cs.length, lines: sum(cs.map((c) => c.lines.length)) };
  }).filter((r) => r.certs > 0);

  const labMap = new Map<string, { lab: string; certs: number; companies: string[]; lines: number }>();
  for (const c of certs) {
    const k = c.lab === "Tidak dicatat" ? c.lab : norm(c.lab);
    const row = labMap.get(k) ?? { lab: c.lab, certs: 0, companies: [], lines: 0 };
    row.certs += 1;
    row.lines += c.lines.length;
    if (!row.companies.includes(c.company)) row.companies.push(c.company);
    labMap.set(k, row);
  }
  const labs = [...labMap.values()].sort((a, b) => (a.lab === "Tidak dicatat" ? 1 : 0) - (b.lab === "Tidak dicatat" ? 1 : 0) || b.certs - a.certs);

  // The same certificate number attached to several merek × sub kelompok groups (or companies).
  const numMap = new Map<string, CertRow[]>();
  for (const c of certs) if (c.number) numMap.set(norm(c.number), [...(numMap.get(norm(c.number)) ?? []), c]);
  const numbers = [...numMap.values()].map((cs) => ({ number: cs[0].number, certs: cs, companies: uniq(cs.map((c) => c.company)) })).sort((a, b) => b.certs.length - a.certs.length);
  const reused = numbers.filter((n) => n.certs.length > 1);
  const crossCompany = numbers.filter((n) => n.companies.length > 1);
  const noNumber = certs.filter((c) => !c.number);

  const labelByApp = new Map(ds.technical.map((t) => [t.applicationId, t.labelStatement]));
  const appCompany = new Map(ds.applications.map((a) => [a.id, a.company]));
  const appsWithLines = uniq(ds.lines.map((l) => l.applicationId));
  // Applications without any certificate carry no label status in the dataset.
  const labelOf = (appId: string) => labelByApp.get(appId)?.label ?? "Tidak tercatat";
  const labels = uniq(appsWithLines.map(labelOf)).map((label) => {
    const apps = appsWithLines.filter((a) => labelOf(a) === label);
    return { label, ok: labelByApp.get(apps[0])?.tone === "ok", apps: apps.length, companies: uniq(apps.map((a) => appCompany.get(a) ?? "")) };
  }).sort((a, b) => Number(b.ok) - Number(a.ok) || b.apps - a.apps);

  const companies = uniq(ds.lines.map((l) => l.company)).map((company) => {
    const ls = ds.lines.filter((l) => l.company === company);
    const cs = certs.filter((c) => c.company === company);
    const cov = covered.filter((l) => l.company === company).length;
    const apps = uniq(ls.map((l) => l.applicationId));
    return {
      company, lines: ls.length, certs: cs.length, covered: cov, uncovered: ls.length - cov, complete: cs.filter((c) => c.status.tone === "ok").length,
      expiring: cs.filter((c) => c.validity === "Kedaluwarsa" || c.validity === "Berlaku – segera berakhir").length, label: uniq(apps.map(labelOf)).join(", "), value: valueOf(ls),
    };
  }).sort((a, b) => b.lines - a.lines || b.value - a.value);

  const multi = certs.filter((c) => c.lines.length >= 5);
  const multiTable = multi.map((c) => [c.number || "Tidak dicatat", c.company, c.brandName, c.subKelompok || "—", c.lines.length, c.hs.length, Math.round(c.value)]);
  const companyTable = companies.map((c) => [c.company, c.lines, c.certs, c.covered, c.uncovered, c.certs ? (c.covered / c.certs).toFixed(1).replace(".", ",") : "—", `${c.complete}/${c.certs}`, c.expiring, c.label, Math.round(c.value)]);
  const certTable = certs.map((c) => [c.company, c.brandName, c.subKelompok || "—", c.lab, c.number || "—", c.issueDate ? fdLong(c.issueDate) : "—", c.validUntil ? fdLong(c.validUntil) : "—", c.lines.length, c.verification || "—", c.status.label]);

  // Narrative -------------------------------------------------------------------------------
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const nCompanies = companies.length;
  const limits = [
    "Sertifikat dikaitkan ke product line menurut permohonan, merek, dan sub kelompok komoditas yang sama; product line yang nama merek atau sub kelompoknya berbeda penulisan dapat tercatat tanpa sertifikat.",
    "Status sertifikat mengikuti hasil verifikasi dokumen dan pemeriksaan sistem (kelengkapan berkas, masa berlaku, batas pengajuan 6 bulan sejak terbit, dan Surat Pernyataan Label); isi laporan uji dan parameter uji tidak dinilai dalam bab ini.",
    `Masa berlaku dinilai pada akhir periode laporan (${fdLong(asOf)}); "segera berakhir" berarti tersisa 3 bulan atau kurang.`,
    "Nilai dihitung dalam Rupiah; product line dalam mata uang asing tanpa kurs tidak termasuk dalam nilai.",
  ];
  if (!ds.lines.length) {
    const none = [`Selama periode pelaporan ${period} belum terdapat product line rencana impor.`];
    return { unit, totalValue, certs, covered, uncovered, coveredValue, statusRows, validityRows, labs, numbers, labels, companies, multiTable, companyTable, certTable, highlights: [], sub51: none, sub52: [], sub53: [], sub54: [], sub55: [], sub56: [], sub57: [], limits };
  }

  const complete = statusRows.find((r) => r.label === "Lengkap");
  const notOk = certs.filter((c) => c.status.tone !== "ok");
  const expired = certs.filter((c) => c.validity === "Kedaluwarsa");
  const expiring = certs.filter((c) => c.validity === "Berlaku – segera berakhir");
  const late = certs.filter((c) => c.status.label === "Lewat 6 Bulan");
  const noLab = certs.filter((c) => c.lab === "Tidak dicatat");
  const namedLabs = labs.filter((l) => l.lab !== "Tidak dicatat");
  const perCert = certs.length ? covered.length / certs.length : 0;
  const top = certs[0];
  const oneToOne = companies.filter((c) => c.certs > 0 && c.certs === c.covered);
  const noCert = companies.filter((c) => c.certs === 0);
  const labelOk = labels.find((l) => l.ok);
  const labelMissing = labels.filter((l) => !l.ok);

  const sub51 = [
    "Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 mensyaratkan Perusahaan API-U yang mengimpor Produk Tekstil sebagai barang konsumsi untuk menyampaikan bukti pemenuhan persyaratan teknis, berupa Sertifikat Hasil Uji Mutu per merek dan sub kelompok komoditas serta Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia. Bab ini menilai cakupan, status, dan masa berlaku bukti pemenuhan tersebut terhadap product line rencana impor.",
    `Selama periode pelaporan ${period}, ${withWords(nCompanies)} Perusahaan API-U melampirkan ${withWords(certs.length)} Sertifikat Hasil Uji Mutu. Sebanyak ${nf(covered.length)} dari ${nf(ds.lines.length)} product line (${pct1(covered.length, ds.lines.length)}) tercakup sertifikat sesuai merek dan sub kelompoknya, dengan rencana nilai ${rp(coveredValue)} atau ${pct1(coveredValue, totalValue)} dari total${uncovered.length ? `; ${nf(uncovered.length)} product line belum dapat dikaitkan dengan sertifikat` : ""} (Gambar 5.1).`,
  ];
  const sub52 = [
    `Status sertifikat ditetapkan dari hasil verifikasi dokumen dan pemeriksaan sistem. ${complete ? `${complete.certs} sertifikat (${pct1(complete.certs, certs.length)}) berstatus lengkap` : "Belum ada sertifikat yang berstatus lengkap"}${notOk.length ? `, sedangkan ${notOk.length} sertifikat belum lengkap: ${statusRows.filter((r) => r.label !== "Lengkap").map((r) => `${r.certs} ${r.label.toLowerCase()}`).join(", ")}` : ""} (Gambar 5.2).`,
    notOk.length ? `Product line yang tercakup sertifikat belum lengkap berjumlah ${nf(sum(notOk.map((c) => c.lines.length)))} dengan rencana nilai ${rp(sum(notOk.map((c) => c.value)))} atau ${pct1(sum(notOk.map((c) => c.value)), totalValue)} dari total rencana nilai.` : "",
  ].filter(Boolean);
  const sub53 = [
    namedLabs.length
      ? `Sertifikat diterbitkan oleh ${withWords(namedLabs.length)} laboratorium penguji. ${namedLabs[0].lab} menerbitkan sertifikat terbanyak (${namedLabs[0].certs} sertifikat untuk ${namedLabs[0].companies.length} perusahaan)${namedLabs[1] ? `, diikuti ${namedLabs.slice(1, 3).map((l) => `${l.lab} (${l.certs} sertifikat)`).join(" dan ")}` : ""}${noLab.length ? `; nama laboratorium ${noLab.length} sertifikat belum dicatat` : ""} (Gambar 5.3).`
      : "Nama laboratorium penguji belum dicatat pada sertifikat.",
  ];
  const sub54 = [
    `Per ${fdLong(asOf)}, ${certs.filter((c) => c.validity === "Berlaku").length} sertifikat masih berlaku lebih dari 3 bulan${expiring.length ? `, ${expiring.length} sertifikat akan berakhir dalam 3 bulan` : ""}${expired.length ? `, ${expired.length} sertifikat telah kedaluwarsa` : ""}${certs.some((c) => c.validity === "Tidak dicatat") ? `, dan masa berlaku ${certs.filter((c) => c.validity === "Tidak dicatat").length} sertifikat belum dicatat` : ""} (Gambar 5.4).`,
    late.length
      ? `Sertifikat harus diajukan paling lama 6 (enam) bulan sejak diterbitkan; ${late.length} sertifikat dari ${joinId(uniq(late.map((c) => c.company)))} diajukan melewati batas tersebut.`
      : "Seluruh sertifikat yang tanggal terbitnya tercatat diajukan dalam batas 6 (enam) bulan sejak diterbitkan.",
  ];
  const sub55 = [
    `Persyaratan teknis ditetapkan per merek dan sub kelompok komoditas, sehingga satu sertifikat sah mencakup beberapa product line dan pos tarif/HS dalam sub kelompok yang sama. Rata-rata satu sertifikat mencakup ${perCert.toFixed(1).replace(".", ",")} product line${top && top.lines.length > 1 ? `; cakupan terbesar adalah sertifikat ${top.number || "tanpa nomor"} milik ${top.company} untuk merek ${top.brandName} (${top.lines.length} product line, ${top.hs.length} pos tarif/HS)` : ""}. ${multi.length ? `${withWords(multi.length)} sertifikat mencakup lima product line atau lebih (Tabel 5.1).` : "Tidak ada sertifikat yang mencakup lima product line atau lebih."}`,
    `${oneToOne.length ? `${withWords(oneToOne.length)} perusahaan melampirkan satu sertifikat untuk setiap product line, antara lain ${joinId(oneToOne.slice(0, 3).map((c) => c.company))}. ` : ""}${reused.length ? `Nomor sertifikat yang sama dipakai untuk ${reused.length} kelompok merek × sub kelompok yang berbeda${crossCompany.length ? `, termasuk ${crossCompany.length} nomor yang dipakai oleh lebih dari satu perusahaan (${joinId(crossCompany.slice(0, 3).map((n) => n.number))})` : ""}. ` : ""}${noNumber.length ? `${noNumber.length} sertifikat belum mencatat nomor. ` : ""}Sebaran per perusahaan disajikan pada Gambar 5.5.`,
  ];
  const sub56 = [
    `Surat Pernyataan Pemenuhan Ketentuan Label Berbahasa Indonesia dilampirkan per permohonan. ${labelOk ? `Surat pernyataan ${labelOk.apps} dari ${appsWithLines.length} permohonan (${pct1(labelOk.apps, appsWithLines.length)}) berstatus terverifikasi` : "Belum ada surat pernyataan yang berstatus terverifikasi"}${labelMissing.length ? `; ${labelMissing.map((l) => `${l.apps} permohonan ${l.label.toLowerCase()}`).join(", ")}` : ""} (Gambar 5.6).`,
  ];
  const sub57 = [
    `Tabel 5.2 menyajikan bukti pemenuhan setiap Perusahaan API-U: jumlah product line, sertifikat, product line yang tercakup dan belum tercakup, rata-rata product line per sertifikat, sertifikat lengkap, sertifikat yang kedaluwarsa atau segera berakhir, status surat pernyataan label, dan rencana nilai. Tabel 5.3 merinci setiap sertifikat.${noCert.length ? ` ${withWords(noCert.length)} perusahaan belum melampirkan sertifikat: ${joinId(noCert.map((c) => c.company))}.` : ""}`,
  ];

  const highlights = [
    `${nf(covered.length)} dari ${nf(ds.lines.length)} product line (${pct1(covered.length, ds.lines.length)}) tercakup Sertifikat Hasil Uji Mutu sesuai merek dan sub kelompoknya; tercatat ${certs.length} sertifikat dari ${namedLabs.length} laboratorium.`,
    `${complete?.certs ?? 0} sertifikat (${pct1(complete?.certs ?? 0, certs.length)}) berstatus lengkap${notOk.length ? `; ${notOk.length} sertifikat belum lengkap dengan rencana nilai ${rp(sum(notOk.map((c) => c.value)))}` : ""}.`,
    expired.length || expiring.length ? `${expired.length} sertifikat kedaluwarsa dan ${expiring.length} sertifikat akan berakhir dalam 3 bulan per akhir periode.` : "Seluruh sertifikat yang masa berlakunya tercatat masih berlaku lebih dari 3 bulan per akhir periode.",
    `Rata-rata satu sertifikat mencakup ${perCert.toFixed(1).replace(".", ",")} product line; ${multi.length} sertifikat mencakup lima product line atau lebih.`,
    labelOk ? `Surat pernyataan label ${labelOk.apps} dari ${appsWithLines.length} permohonan berstatus terverifikasi.` : "",
  ].filter(Boolean);

  return { unit, totalValue, certs, covered, uncovered, coveredValue, statusRows, validityRows, labs, numbers, labels, companies, multiTable, companyTable, certTable, highlights, sub51, sub52, sub53, sub54, sub55, sub56, sub57, limits };
}
