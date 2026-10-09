import { compact, fdLong, nf, sum, uniq } from "./format";
import { btkiBab } from "./report-bab2";
import { countryInfo } from "./report-bab3";
import { bab4 } from "./report-bab4";
import { bab5 } from "./report-bab5";
import { bab6 } from "./report-bab6";
import { bab7 } from "./report-bab7";
import { bab8 } from "./report-bab8";
import { bab9 } from "./report-bab9";
import { rupiahValuer } from "./report-value";
import { MATERIALITY_LABEL, materialityOf } from "./summary";
import type { P47Dataset, P47Report } from "./types";

/*
 * Bab 10 "Temuan Analitis & Rekomendasi" of the Laporan Pelaksanaan VIU: analytical findings derived from
 * Bab 1–9 with a priority and a recommendation, the findings recorded during verification (survei
 * lapangan, verifikasi dokumen and produk, analisis teknis) with their severity and the Project Manager's
 * materiality, and the data still missing to complete the analysis.
 */

export type Priority = "Tinggi" | "Sedang" | "Rendah";
export const PRIORITIES: Priority[] = ["Tinggi", "Sedang", "Rendah"];
export type AnalyticFinding = { area: string; text: string; ref: string; priority: Priority; rec: string; value: number };
export type DataNeed = { data: string; use: string; ref: string; have: number; of: number };

const pct1 = (part: number, total: number) => (total > 0 ? `${((part / total) * 100).toFixed(1).replace(".", ",")}%` : "0%");
const rp = (v: number) => `Rp ${compact(v)}`;
const andList = (xs: string[]) => (xs.length <= 1 ? xs[0] ?? "" : `${xs.slice(0, -1).join(", ")} dan ${xs[xs.length - 1]}`);
const some = (xs: string[], n = 3) => (xs.length > n ? `${xs.slice(0, n).join(", ")}, dan ${xs.length - n} lainnya` : andList(xs));
export const needStatus = (d: Pick<DataNeed, "have" | "of">) => (d.of === 0 ? "Tidak relevan" : d.have >= d.of ? "Lengkap" : d.have === 0 ? "Belum tersedia" : `Sebagian (${d.have}/${d.of})`);

export type Bab10 = {
  analytic: AnalyticFinding[];
  analyticTable: (string | number)[][];
  recorded: { source: string; counts: number[]; total: number }[];
  severities: string[];
  materiality: { label: string; value: number }[];
  recordedTable: (string | number)[][];
  needs: DataNeed[];
  needsTable: (string | number)[][];
  highlights: string[];
  sub101: string[]; sub102: string[]; sub103: string[]; sub104: string[];
  limits: string[];
};

export function bab10(ds: P47Dataset, report: P47Report, kbliNonCompliant: string[] = []): Bab10 {
  const toRp = rupiahValuer(ds);
  const total = sum(ds.lines.map((l) => toRp(l) ?? 0));
  const b4 = bab4(ds);
  const b5 = bab5(ds);
  const b6 = bab6(ds);
  const b7 = bab7(ds);
  const b8 = bab8(ds);
  const b9 = bab9(ds);
  const f: AnalyticFinding[] = [];
  const add = (x: AnalyticFinding) => f.push(x);
  const valueShare = (v: number) => (total ? v / total : 0);

  // Bab 1 — KBLI and LHVIU.
  if (kbliNonCompliant.length) add({ area: "KBLI", text: `${kbliNonCompliant.length} Perusahaan API-U tidak memiliki KBLI yang dipersyaratkan Pasal 37 ayat (2) huruf c angka 2: ${some(kbliNonCompliant)}.`, ref: "Bab 1", priority: "Tinggi", rec: "Mengonfirmasi Perizinan Berusaha perusahaan dan meminta pembaruan KBLI sebelum laporan disetujui.", value: 0 });
  const undated = ds.applications.filter((a) => a.lhviu && !a.lhviu.issuedAt);
  if (undated.length) add({ area: "Data LHVIU", text: `Nomor dan Tanggal Terbit ${undated.length} LHVIU belum dicatat pada tab LHVIU, sehingga bulan terbit dan masa berlakunya tidak dapat dihitung.`, ref: "Bab 1", priority: "Rendah", rec: "Project Manager melengkapi Nomor dan Tanggal Terbit LHVIU pada tab LHVIU.", value: 0 });

  // Bab 2 — pos tarif outside BTKI chapters 50–63.
  const outside = ds.lines.filter((l) => { const b = Number(btkiBab(l.hs)); return Number.isFinite(b) && b > 0 && (b < 50 || b > 63); });
  if (outside.length) add({ area: "Pos tarif/HS", text: `${outside.length} product line dengan pos tarif ${some(uniq(outside.map((l) => l.hs)))} berada di luar Bab 50–63 BTKI.`, ref: "Bab 2", priority: "Sedang", rec: "Mengonfirmasi cakupan pos tarif tersebut terhadap lampiran Peraturan Menteri Perindustrian Nomor 27 Tahun 2025.", value: sum(outside.map((l) => toRp(l) ?? 0)) });

  // Bab 3 — Indonesia as negara asal; country filled by the system.
  const domestic = ds.lines.filter((l) => l.countries.some((c) => countryInfo(c).key === "INDONESIA"));
  if (domestic.length) add({ area: "Negara asal", text: `Indonesia tercantum sebagai negara asal pada ${domestic.length} dari ${ds.lines.length} product line (${pct1(domestic.length, ds.lines.length)}).`, ref: "Bab 3", priority: "Sedang", rec: "Mengklarifikasi kepada Pemohon VIU dan memperbaiki data negara asal apabila terdapat kesalahan pengisian.", value: 0 });
  const auto = ds.lines.filter((l) => l.countryAutoFilled);
  if (auto.length) add({ area: "Negara asal", text: `Negara asal ${auto.length} product line diisi oleh sistem (migrasi data), bukan oleh pemohon.`, ref: "Bab 3", priority: "Rendah", rec: "Meminta pemohon mengonfirmasi negara asal product line tersebut pada pengajuan berikutnya.", value: 0 });

  // Bab 4 — brand relationship documents and brand evidence.
  const notValid = b4.pairs.filter((p) => p.doc !== "Valid");
  if (notValid.length) {
    const v = sum(notValid.map((p) => p.value));
    add({ area: "Hubungan merek", text: `Dokumen hubungan merek ${notValid.length} dari ${b4.pairs.length} pasangan merek–Pemohon VIU belum berstatus valid; pasangan tersebut mencakup ${rp(v)} (${pct1(v, total)}) dari total rencana nilai.`, ref: "Bab 4", priority: valueShare(v) >= 0.1 ? "Tinggi" : "Sedang", rec: "Meminta dan memverifikasi dokumen dasar hubungan Pemohon VIU dengan pemilik merek untuk setiap pasangan sebelum laporan disetujui.", value: v });
  }
  const weakBrands = b4.brands.filter((b) => b.certificate !== "Aktif");
  if (weakBrands.length) add({ area: "Bukti merek", text: `Bukti ${weakBrands.length} merek tidak aktif per ${fdLong(ds.period.to)} (${andList(uniq(weakBrands.map((b) => b.certificate.toLowerCase())))}), antara lain ${some(weakBrands.map((b) => b.name))}.`, ref: "Bab 4", priority: "Sedang", rec: "Mengonfirmasi status pendaftaran merek pada Pangkalan Data Kekayaan Intelektual dan mencatat nomor serta masa berlaku sertifikat.", value: sum(weakBrands.map((b) => b.value)) });

  // Bab 5 — technical requirement.
  if (b5.uncovered.length) {
    const v = sum(b5.uncovered.map((l) => toRp(l) ?? 0));
    add({ area: "Persyaratan teknis", text: `${b5.uncovered.length} product line dari ${some(uniq(b5.uncovered.map((l) => l.company)))} belum dapat dikaitkan dengan Sertifikat Hasil Uji Mutu sesuai merek dan sub kelompoknya, mencakup ${rp(v)} (${pct1(v, total)}) dari total rencana nilai.`, ref: "Bab 5", priority: valueShare(v) >= 0.1 ? "Tinggi" : "Sedang", rec: "Melengkapi sertifikat uji mutu untuk setiap merek dan sub kelompok komoditas, atau mengoreksi penulisan merek/sub kelompok yang berbeda.", value: v });
  }
  const badCerts = b5.certs.filter((c) => c.status.tone === "bad");
  if (badCerts.length) add({ area: "Persyaratan teknis", text: `${badCerts.length} sertifikat uji mutu berstatus ${andList(uniq(badCerts.map((c) => c.status.label.toLowerCase())))} (${some(uniq(badCerts.map((c) => c.company)))}).`, ref: "Bab 5", priority: "Tinggi", rec: "Meminta sertifikat pengganti yang masih berlaku dan memverifikasinya sebelum laporan disetujui.", value: sum(badCerts.map((c) => c.value)) });
  const late = b5.certs.filter((c) => c.status.label === "Lewat 6 Bulan");
  if (late.length) add({ area: "Persyaratan teknis", text: `${late.length} sertifikat uji mutu diajukan lebih dari 6 (enam) bulan sejak diterbitkan.`, ref: "Bab 5", priority: "Sedang", rec: "Meminta sertifikat uji mutu terbaru yang diterbitkan paling lama 6 bulan sebelum pengajuan.", value: sum(late.map((c) => c.value)) });
  const labelBad = b5.labels.filter((l) => !l.ok);
  if (labelBad.length) add({ area: "Label Bahasa Indonesia", text: `Surat Pernyataan Label Berbahasa Indonesia ${sum(labelBad.map((l) => l.apps))} permohonan belum terverifikasi (${andList(labelBad.map((l) => l.label.toLowerCase()))}).`, ref: "Bab 5", priority: "Sedang", rec: "Menyelesaikan verifikasi surat pernyataan label pada permohonan terkait.", value: 0 });

  // Bab 6 — warehouse capacity.
  const overCap = b6.storage.filter((s) => (s.used ?? 0) > 1);
  if (overCap.length) add({ area: "Kapasitas gudang", text: `Kapasitas gudang terpakai (stok + volume pengajuan) melebihi 100% pada ${overCap.length} permohonan: ${some(overCap.map((s) => `${s.company} (${Math.round((s.used ?? 0) * 100)}%)`))}.`, ref: "Bab 6", priority: "Sedang", rec: "Meminta penjelasan rencana penyimpanan atau gudang tambahan sebelum realisasi impor.", value: 0 });

  // Bab 7 — capital.
  const overModal = b7.withModal.filter((r) => (r.ratio ?? 0) > 1);
  if (overModal.length) {
    const v = sum(overModal.map((r) => r.plan));
    add({ area: "Modal operasi", text: `Rencana nilai impor ${overModal.length} permohonan melebihi modal operasinya (rasio > 100%), mencakup ${rp(v)} (${pct1(v, total)}) dari total rencana nilai.`, ref: "Bab 7", priority: overModal.some((r) => r.decisionTone === "bad") || valueShare(v) >= 0.25 ? "Tinggi" : "Sedang", rec: "Menelaah kewajaran rencana nilai impor terhadap kemampuan keuangan pemohon dan meminta bukti pendanaan tambahan bila diperlukan.", value: v });
  }
  const noModal = b7.rows.filter((r) => r.modal === null);
  if (noModal.length) add({ area: "Modal operasi", text: `Modal operasi ${noModal.length} permohonan belum tercatat sehingga rasio rencana impor terhadap modal belum dapat dihitung.`, ref: "Bab 7", priority: "Rendah", rec: "Melengkapi Jumlah Modal Kerja pada Surat Pernyataan Kepemilikan Modal Kerja.", value: 0 });
  const unconverted = sum(b7.rows.map((r) => r.unconverted));
  if (unconverted) add({ area: "Kurs", text: `${unconverted} product line dalam mata uang asing belum memiliki kurs dari Technical Analyst sehingga tidak termasuk dalam nilai.`, ref: "Bab 7", priority: "Sedang", rec: "Technical Analyst melengkapi kurs pada analisis Modal.", value: 0 });

  // Bab 8 — concentration.
  const [company, owner] = b8.dims;
  if (owner?.items[0] && owner.cr1 >= 0.25) add({ area: "Konsentrasi pemilik merek", text: `Pemilik merek ${owner.items[0].label} mencakup ${pct1(owner.cr1, 1)} dari total rencana nilai (HHI pemilik merek ${nf(owner.hhi)}).`, ref: "Bab 4, Bab 8", priority: owner.cr1 >= 0.5 ? "Tinggi" : "Sedang", rec: "Melakukan penelaahan lanjutan atas hubungan pemohon dengan pemilik merek serta kewajaran rencana nilai impor.", value: owner.items[0].value });
  if (company?.items.length && company.cr3 >= 0.5) add({ area: "Konsentrasi pemohon", text: `Tiga Pemohon VIU terbesar mencakup ${pct1(company.cr3, 1)} dari total rencana nilai (HHI ${nf(company.hhi)}).`, ref: "Bab 7, Bab 8", priority: "Sedang", rec: "Memprioritaskan pemantauan realisasi impor pemohon dengan rencana nilai terbesar.", value: sum(company.items.slice(0, 3).map((i) => i.value)) });

  // Bab 9 — facilities.
  const noReg = b9.gudang.filter((g) => !g.registration);
  if (noReg.length) add({ area: "Legalitas gudang", text: `${noReg.length} dari ${b9.gudang.length} gudang belum mencantumkan tanda daftar gudang.`, ref: "Bab 9", priority: "Sedang", rec: "Meminta Tanda Daftar Gudang atau dokumen penetapan gudang yang berlaku.", value: 0 });
  const fieldBad = b9.rows.filter((r) => [...(r.kantor ? [r.kantor] : []), ...r.gudang].some((p) => p.fieldConclusion === "Tidak Sesuai"));
  if (fieldBad.length) add({ area: "Verifikasi lapangan", text: `Verifikasi lapangan menyimpulkan lokasi tidak sesuai pada ${fieldBad.length} pemohon: ${some(fieldBad.map((r) => r.company))}.`, ref: "Bab 9", priority: "Tinggi", rec: "Memastikan tindak lanjut temuan lapangan selesai dan terdokumentasi sebelum laporan disetujui.", value: 0 });
  if (b9.leaseEnding.length) add({ area: "Masa sewa", text: `Masa sewa ${b9.leaseEnding.length} lokasi berakhir paling lambat 6 bulan setelah akhir periode, paling awal ${fdLong(b9.leaseEnding[0].leaseEnd)} (${b9.leaseEnding[0].company}).`, ref: "Bab 9", priority: "Rendah", rec: "Meminta bukti perpanjangan sewa pada pengajuan VIU berikutnya.", value: 0 });

  const analytic = f.sort((a, b) => PRIORITIES.indexOf(a.priority) - PRIORITIES.indexOf(b.priority) || b.value - a.value);
  const analyticTable = analytic.map((x) => [x.area, x.text, x.ref, x.priority, x.rec]);

  // Recorded findings and materiality.
  const severities = ["Critical", "Major", "Minor"].filter((s) => ds.findings.some((x) => x.severity === s));
  const recorded = uniq(ds.findings.map((x) => x.source)).map((source) => {
    const fs = ds.findings.filter((x) => x.source === source);
    return { source, counts: severities.map((s) => fs.filter((x) => x.severity === s).length), total: fs.length };
  }).sort((a, b) => b.total - a.total);
  const materiality = (["MATERIAL", "NEEDS_REVIEW", "NON_MATERIAL"] as const).map((m) => ({ label: MATERIALITY_LABEL[m], value: ds.findings.filter((x) => materialityOf(report, x.key) === m).length })).filter((x) => x.value > 0);
  const sevOrder = ["Critical", "Major", "Minor"];
  const recordedTable = [...ds.findings]
    .sort((a, b) => sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity) || a.company.localeCompare(b.company))
    .map((x) => [x.company, x.source, x.area, x.text, x.severity, MATERIALITY_LABEL[materialityOf(report, x.key)], x.status.label, x.followUp || "—"]);

  // Data needs.
  const apps = ds.applications;
  const linesApps = uniq(ds.lines.map((l) => l.applicationId));
  const foreignLines = ds.lines.filter((l) => l.currency !== "IDR");
  const needs: DataNeed[] = [
    { data: "Nomor dan Tanggal Terbit LHVIU", use: "Bulan terbit dan masa berlaku LHVIU", ref: "Bab 1, Bab 4, Bab 7", have: apps.filter((a) => a.lhviu?.issuedAt).length, of: apps.filter((a) => a.lhviu).length },
    { data: "Kurs mata uang asing (analisis Modal)", use: "Konversi rencana nilai ke Rupiah", ref: "Bab 2–8", have: foreignLines.length - unconverted, of: foreignLines.length },
    { data: "Jumlah Modal Kerja", use: "Rasio rencana nilai impor terhadap modal operasi", ref: "Bab 7", have: b7.withModal.length, of: b7.rows.length },
    { data: "Kapasitas gudang, stok, dan volume pengajuan (m³)", use: "Kapasitas gudang terpakai", ref: "Bab 6", have: b6.storage.filter((s) => s.capacity !== null).length, of: b6.storage.length },
    { data: "Sertifikat Hasil Uji Mutu per merek × sub kelompok", use: "Cakupan persyaratan teknis", ref: "Bab 5", have: b5.covered.length, of: ds.lines.length },
    { data: "Nomor pendaftaran merek", use: "Keberlakuan bukti merek", ref: "Bab 4", have: b4.brands.filter((b) => b.certificate !== "Tidak Lengkap").length, of: b4.brands.length },
    { data: "Tanda daftar gudang", use: "Legalitas gudang", ref: "Bab 9", have: b9.gudang.length - noReg.length, of: b9.gudang.length },
    { data: "Luas gudang hasil verifikasi lapangan", use: "Kewajaran luas gudang terhadap rencana volume", ref: "Bab 9", have: b9.gudang.filter((g) => typeof g.area === "number" && g.area > 0).length, of: b9.gudang.length },
    { data: "Kesimpulan verifikasi lapangan", use: "Temuan lapangan dan tindak lanjutnya", ref: "Bab 9, Bab 10", have: [...b9.kantor, ...b9.gudang].filter((p) => p.fieldConclusion).length, of: b9.kantor.length + b9.gudang.length },
  ].filter((d) => d.of > 0 || d.data.startsWith("Nomor dan Tanggal"));
  const needsTable = needs.map((d) => [d.data, d.use, d.ref, needStatus(d)]);
  const openNeeds = needs.filter((d) => needStatus(d) !== "Lengkap" && needStatus(d) !== "Tidak relevan");

  // Narrative.
  const count = (p: Priority) => analytic.filter((x) => x.priority === p).length;
  const material = ds.findings.filter((x) => materialityOf(report, x.key) === "MATERIAL");
  const highAreas = uniq(analytic.filter((x) => x.priority === "Tinggi").map((x) => x.area.replace(/^[A-Z](?=[a-z])/, (c) => c.toLowerCase())));
  const sub101 = [
    `Temuan dalam bab ini terdiri atas dua jenis: (a) temuan analitis, yaitu hasil penelaahan atas data yang disajikan pada Bab 1 sampai dengan Bab 9; dan (b) temuan pelaksanaan verifikasi yang dicatat surveyor, verifikator, dan Technical Analyst, beserta materialitas pelaporan yang ditetapkan Project Manager. Selama periode pelaporan ${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}, penelaahan menghasilkan ${analytic.length} temuan analitis dan tercatat ${ds.findings.length} temuan pelaksanaan verifikasi pada ${linesApps.length} permohonan.`,
    "Prioritas temuan analitis ditetapkan berdasarkan besaran rencana nilai yang terdampak dan pengaruhnya terhadap kesimpulan verifikasi: prioritas tinggi untuk temuan yang mencakup porsi material dari rencana nilai atau menyangkut dokumen persyaratan; prioritas sedang untuk temuan yang memerlukan klarifikasi data; dan prioritas rendah untuk perbaikan administrasi data (Gambar 10.1).",
  ];
  const sub102 = [
    analytic.length
      ? `Tabel 10.1 menyajikan setiap temuan analitis beserta area, bab rujukan, tingkat prioritas, dan rekomendasi tindak lanjut, diurutkan menurut prioritas. ${count("Tinggi") ? `Temuan prioritas tinggi berkaitan dengan ${andList(highAreas)}.` : "Tidak terdapat temuan prioritas tinggi."}`
      : "Penelaahan data tidak menghasilkan temuan analitis pada periode ini.",
  ];
  const sub103 = [
    ds.findings.length
      ? `Temuan pelaksanaan verifikasi tercatat dari ${andList(recorded.map((r) => `${r.source.toLowerCase()} (${r.total})`))}${severities.length ? `, terdiri atas ${andList(severities.map((s, si) => `${sum(recorded.map((r) => r.counts[si]))} ${s.toLowerCase()}`))}` : ""}. Project Manager menetapkan ${material.length} temuan sebagai isu material${materiality.find((m) => m.label === MATERIALITY_LABEL.NEEDS_REVIEW) ? ` dan ${materiality.find((m) => m.label === MATERIALITY_LABEL.NEEDS_REVIEW)!.value} temuan masih perlu ditinjau` : ""} (Gambar 10.2 dan Tabel 10.2).`
      : "Belum terdapat temuan pelaksanaan verifikasi yang tercatat pada permohonan periode ini.",
  ];
  const sub104 = [
    openNeeds.length
      ? `Sejumlah analisis belum dapat diselesaikan sepenuhnya karena data belum lengkap. Tabel 10.3 menyajikan data yang perlu dilengkapi beserta kegunaan, bab terkait, dan statusnya; ${openNeeds.length} dari ${needs.length} jenis data belum lengkap. Bab terkait akan terisi otomatis setelah data dilengkapi pada sistem.`
      : "Seluruh data yang diperlukan untuk analisis dalam laporan ini telah tersedia pada sistem (Tabel 10.3).",
  ];
  const highlights = [
    `Penelaahan data menghasilkan ${analytic.length} temuan analitis: ${count("Tinggi")} prioritas tinggi, ${count("Sedang")} prioritas sedang, dan ${count("Rendah")} prioritas rendah.`,
    highAreas.length ? `Temuan prioritas tinggi berkaitan dengan ${andList(highAreas)}.` : "",
    `Tercatat ${ds.findings.length} temuan pelaksanaan verifikasi; ${material.length} ditetapkan Project Manager sebagai isu material.`,
    openNeeds.length ? `${openNeeds.length} jenis data perlu dilengkapi agar seluruh analisis dalam laporan ini dapat diselesaikan.` : "",
  ].filter(Boolean);
  const limits = [
    "Temuan analitis disusun otomatis dari data sistem pada saat laporan dibuat dan belum mencakup klarifikasi Pemohon VIU.",
    "Tingkat prioritas temuan analitis merupakan penilaian analitis Lembaga Pelaksana Verifikasi dan dapat disesuaikan oleh Project Manager melalui Catatan PM.",
    "Materialitas temuan pelaksanaan verifikasi mengikuti penetapan Project Manager pada Laporan Kemenperin; temuan yang belum ditetapkan dihitung perlu ditinjau.",
  ];

  return { analytic, analyticTable, recorded, severities, materiality, recordedTable, needs, needsTable, highlights, sub101, sub102, sub103, sub104, limits };
}
