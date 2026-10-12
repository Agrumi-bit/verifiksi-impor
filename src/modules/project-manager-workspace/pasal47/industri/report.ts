import { companyChapterNarrative, kbliRows, locationRows } from "./company-chapter";
import { lhviuStatus } from "../derive";
import type { ExportSection } from "./sections";
import { countBy, fd, fdLong, joinId, sum, topN, uniq, withWords } from "../format";
import { MATERIALITY_LABEL, materialityOf } from "../summary";
import type { P47Report } from "../types";
import type { IndustriDataset, IndustriLine } from "./types";

/** The sections of the Laporan Pelaksanaan VIU – Bahan Baku Industri; numbering follows the Konsumsi report. */
export const INDUSTRI_PARTS: [string, string][] = [
  ["8.2", "Data Perusahaan API-U"], ["8.3", "Bahan Baku & Pos Tarif/HS"], ["8.4", "Partner Industri & LHVKI"], ["8.5", "Persediaan & Gudang"],
  ["8.6", "Analisis Teknis"], ["8.7", "Modal Kerja & Nilai Impor"], ["8.8", "Temuan & Isu Material"], ["8.9", "Kesimpulan Pelaksanaan VIU"],
];

export const INDUSTRI_SECTION_INTRO: Record<string, string> = {
  "8.2": "Daftar Perusahaan API-U yang melaksanakan Verifikasi Importir Umum (VIU) Bahan Baku/Penolong Perusahaan Industri pada periode laporan, beserta KBLI Utama, lokasi kantor dan gudang, serta status Laporan Hasil Verifikasi Importir Umum (LHVIU).",
  "8.3": "Bahan baku/penolong dan pos tarif/HS yang diajukan. Rencana kebutuhan dijumlahkan hanya di dalam satu HS dengan satuan yang sama.",
  "8.4": "Partner Industri yang menjadi tujuan penggunaan bahan baku, nomor LHVKI yang dilampirkan, dan jumlah bahan baku yang dikaitkan dengan setiap partner.",
  "8.5": "Gudang yang digunakan Perusahaan API-U, status kepemilikannya, serta kapasitas dan stok sebagaimana dinilai Technical Analyst.",
  "8.6": "Hasil Analisis Teknis: kesesuaian HS Code dan volume terhadap LHVKI Partner Industri, kapasitas gudang, dan kepemilikan modal.",
  "8.7": "Nilai impor yang dianalisis Technical Analyst dibandingkan dengan modal kerja yang dinyatakan perusahaan, dalam Rupiah.",
  "8.8": "Temuan pelaksanaan verifikasi dengan tingkat keparahan operasional dan materialitas pelaporan yang ditetapkan Project Manager.",
};

export type HsRow = { hs: string; description: string; companies: number; lines: number; quantity: number; unit: string };

/** One row per HS; the quantity is summed only within one unit, otherwise NaN ("satuan berbeda"). */
export function industriHsRows(lines: IndustriLine[]): HsRow[] {
  const byHs = new Map<string, IndustriLine[]>();
  for (const l of lines) byHs.set(l.hs || "—", [...(byHs.get(l.hs || "—") ?? []), l]);
  return [...byHs.entries()]
    .map(([hs, ls]) => {
      const units = uniq(ls.map((l) => l.unit || "—"));
      return {
        hs, description: ls.find((l) => l.hsDescription)?.hsDescription ?? "", companies: uniq(ls.map((l) => l.applicationId)).length, lines: ls.length,
        quantity: units.length === 1 ? sum(ls.map((l) => l.quantity)) : Number.NaN, unit: units.length === 1 ? (units[0] === "—" ? "" : units[0]) : units.join(" / "),
      };
    })
    .sort((a, b) => b.lines - a.lines || a.hs.localeCompare(b.hs));
}

export function industriKpis(ds: IndustriDataset, report: P47Report) {
  return {
    companies: uniq(ds.applications.map((a) => a.companyId ?? a.company)).length,
    applications: ds.applications.length,
    lhviu: ds.applications.filter((a) => a.lhviu).length,
    hs: uniq(ds.lines.map((l) => l.hs).filter(Boolean)).length,
    lines: ds.lines.length,
    partners: ds.partners.length,
    findings: ds.findings.length,
    material: ds.findings.filter((f) => materialityOf(report, f.key) === "MATERIAL").length,
  };
}

export type IndustriAlert = { tone: "warn" | "bad" | "na"; text: string };

/** Data-quality warnings to settle before the report is final — each counted from the data itself. */
export function industriAlerts(ds: IndustriDataset): IndustriAlert[] {
  const alerts: IndustriAlert[] = [];
  const noLhviu = ds.applications.filter((a) => lhviuStatus(a).label === "Belum Diunggah").length;
  if (noLhviu) alerts.push({ tone: "warn", text: `${noLhviu} permohonan selesai belum memiliki file LHVIU.` });
  const noPartner = ds.applications.filter((a) => !ds.partners.some((p) => p.uses.some((u) => u.applicationId === a.id))).length;
  if (noPartner) alerts.push({ tone: "bad", text: `${noPartner} permohonan belum memiliki Partner Industri yang terdaftar pada sistem.` });
  const noLhvki = ds.partners.flatMap((p) => p.uses).filter((u) => !u.lhvkiPath).length;
  if (noLhvki) alerts.push({ tone: "warn", text: `${noLhvki} relasi Partner Industri tanpa dokumen LHVKI.` });
  const unlinked = ds.lines.filter((l) => !l.partnerId).length;
  if (unlinked) alerts.push({ tone: "warn", text: `${unlinked} bahan baku belum dikaitkan dengan Partner Industri.` });
  const noHs = ds.lines.filter((l) => !l.hs).length;
  if (noHs) alerts.push({ tone: "warn", text: `${noHs} bahan baku tanpa HS Code.` });
  const noUnit = ds.lines.filter((l) => !l.unit).length;
  if (noUnit) alerts.push({ tone: "warn", text: `${noUnit} bahan baku tanpa satuan; kuantitasnya tidak ikut dijumlahkan.` });
  const noCapacity = ds.warehouses.filter((w) => w.capacity === null).length;
  if (noCapacity) alerts.push({ tone: "warn", text: `${noCapacity} gudang belum memiliki data kapasitas dari analisis teknis.` });
  alerts.push({ tone: "na", text: "Harga, negara asal, dan data realisasi impor bahan baku belum tersedia pada sistem." });
  return alerts;
}

/** Pendahuluan — fixed regulatory text, with the counted figures of the period. */
export function industriIntroduction(ds: IndustriDataset, report: P47Report): string[] {
  const k = industriKpis(ds, report);
  const period = `${fdLong(ds.period.from)} sampai dengan ${fdLong(ds.period.to)}`;
  const paragraphs = [
    "Dalam rangka pelaksanaan fungsi sebagai Lembaga Pelaksana Verifikasi, PT Tribhakti Inspektama telah melaksanakan Verifikasi Importir Umum (VIU) untuk Bahan Baku/Penolong Perusahaan Industri terhadap perusahaan pemegang Angka Pengenal Importir Umum (API-U), sesuai dengan ketentuan Peraturan Menteri Perindustrian Nomor 27 Tahun 2025 tentang Tata Cara Penerbitan Pertimbangan Teknis Impor Tekstil dan Produk Tekstil.",
    "Untuk impor bahan baku/penolong bagi perusahaan industri, VIU memeriksa kelengkapan dan kesesuaian data dan dokumen Perusahaan API-U, kesesuaian KBLI dengan pos tarif/Harmonized System (HS) yang diajukan, serta kesesuaian HS Code dan volume yang diajukan dengan kebutuhan Partner Industri sebagaimana tercantum dalam Laporan Hasil Verifikasi Kemampuan Industri (LHVKI). Verifikasi lapangan dilakukan untuk memastikan kesesuaian informasi perusahaan dengan kondisi aktual lokasi kantor dan gudang.",
  ];
  paragraphs.push(
    k.applications === 0
      ? `Selama periode pelaporan ${period}, belum terdapat permohonan VIU Bahan Baku/Penolong Perusahaan Industri yang diajukan kepada PT Tribhakti Inspektama.`
      : `Selama periode pelaporan ${period}, PT Tribhakti Inspektama telah melaksanakan VIU terhadap ${withWords(k.companies)} Perusahaan API-U atas ${withWords(k.applications)} permohonan, dengan ${withWords(k.partners)} Partner Industri, dan menerbitkan ${withWords(k.lhviu)} Laporan Hasil Verifikasi Importir Umum (LHVIU).`,
    "LHVIU diterbitkan setelah data dan dokumen dinyatakan lengkap dan sesuai serta telah memenuhi kesesuaian dengan kondisi di lapangan, kemudian disampaikan kepada Perusahaan API-U dan ditembuskan kepada Direktur Jenderal melalui Sistem Informasi Industri Nasional (SIINas).",
  );
  return paragraphs;
}

/** The draft conclusion — sentences built only from counted figures. */
export function industriConclusion(ds: IndustriDataset, report: P47Report): { title: string; paragraphs: string[] }[] {
  const k = industriKpis(ds, report);
  const hs = industriHsRows(ds.lines).slice(0, 2);
  const sev = countBy(ds.findings, (f) => f.severity);
  const decided = (key: string) => ds.analysis.filter((a) => a.moduleKey === key);
  const sesuai = (key: string) => decided(key).filter((a) => a.status.tone === "ok").length;
  const topArea = topN(countBy(ds.findings.filter((f) => materialityOf(report, f.key) === "MATERIAL"), (f) => f.area), 3).map(([a, n]) => `${a} (${n})`);
  return [
    { title: "1. Ringkasan Pelaksanaan", paragraphs: [`Pada periode ${fdLong(ds.period.from)} – ${fdLong(ds.period.to)} terdapat ${k.applications} permohonan VIU Bahan Baku Industri dari ${k.companies} perusahaan API-U, dengan ${k.lhviu} LHVIU telah diterbitkan. Permohonan mencakup ${k.hs} pos tarif/HS, ${k.lines} bahan baku/penolong, dan ${k.partners} Partner Industri.`] },
    { title: "2. Isu Utama", paragraphs: [k.findings ? `Terdapat ${k.findings} temuan (Minor ${sev.get("Minor") ?? 0}, Major ${sev.get("Major") ?? 0}, Critical ${sev.get("Critical") ?? 0}); ${k.material} ditetapkan material oleh Project Manager${topArea.length ? `, terutama pada ${topArea.join(", ")}` : ""}.` : "Tidak ada temuan pada periode ini."] },
    { title: "3. Hasil Analisis Teknis", paragraphs: [`Kesesuaian HS Code dan volume terhadap LHVKI dinyatakan sesuai pada ${sesuai("rencana")} dari ${decided("rencana").length} permohonan; kapasitas gudang sesuai pada ${sesuai("penyimpanan")} dari ${decided("penyimpanan").length}; kepemilikan modal sesuai pada ${sesuai("modal")} dari ${decided("modal").length}.`] },
    { title: "4. Gambaran Kebutuhan Bahan Baku", paragraphs: [hs.length ? `Kebutuhan terbanyak pada ${joinId(hs.map((h) => `${h.hs}${h.description ? ` (${h.description})` : ""}`))}. Kuantitas dilaporkan per satuan dan tidak dijumlahkan lintas satuan.` : "Belum ada bahan baku pada periode ini."] },
    { title: "5. Catatan Keterbatasan Data", paragraphs: industriAlerts(ds).map((a) => a.text) },
    { title: "6. Kesimpulan", paragraphs: [k.material ? `Pelaksanaan VIU periode ini memiliki ${k.material} isu material yang perlu ditindaklanjuti sebelum laporan disampaikan kepada Kementerian Perindustrian.` : "Belum ada temuan yang ditetapkan material; Project Manager perlu menelaah materialitas temuan sebelum laporan disetujui."] },
  ];
}

/** Every report section as plain tables — the one model behind both the Excel file and the print view. */
export function buildIndustriSections(ds: IndustriDataset, report: P47Report, parts: string[]): ExportSection[] {
  const sum2 = (xs: (number | null)[]) => (xs.some((x) => x !== null) ? sum(xs.map((x) => x ?? 0)) : "");
  const build: Record<string, () => ExportSection["tables"]> = {
    "8.2": () => [
      { title: "Sebaran KBLI Utama", headers: ["KBLI", "Uraian", "Jumlah API-U", "Perusahaan"], rows: kbliRows(ds.applications, "industri").map((r) => [r.code, r.description, r.companies.length, r.companies.join("; ")]) },
      { title: "Sebaran lokasi kantor dan gudang", headers: ["Provinsi", "Kota/Kabupaten", "Kantor", "Gudang", "Perusahaan"], rows: locationRows(ds.applications).map((r) => [r.province, r.city, r.kantor, r.gudang, r.companies.join("; ")]) },
      { title: "Daftar Perusahaan API-U", headers: ["Perusahaan", "NIB", "KBLI Utama", "Nomor Permohonan", "Tanggal Pengajuan", "Kota Kantor", "Kepemilikan Kantor", "Kota Gudang", "LHVIU"],
        rows: ds.applications.map((a) => [a.company, a.nib, a.kbli.map((k) => k.code).join(", "), a.applicationNumber, fd(a.submittedAt), a.kantor?.city ?? "", a.kantor?.ownership ?? "", a.gudang.map((g) => g.city).join(", "), lhviuStatus(a).label]) },
    ],
    "8.3": () => [
      { title: "Per pos tarif/HS", headers: ["HS", "Uraian Barang", "Jumlah API-U", "Bahan Baku", "Rencana Kebutuhan", "Satuan"], rows: industriHsRows(ds.lines).map((r) => [r.hs, r.description, r.companies, r.lines, Number.isNaN(r.quantity) ? "Satuan berbeda" : r.quantity, r.unit]) },
      { title: "Per bahan baku", headers: ["Perusahaan", "Bahan Baku/Penolong", "HS", "Volume", "Satuan", "Peruntukan", "Partner Industri"], rows: ds.lines.map((l) => [l.company, l.material, l.hs, l.quantity || "", l.unit, l.intendedUse, l.partnerName]) },
    ],
    "8.4": () => [{ headers: ["Partner Industri", "NIB", "Jenis", "Kontrak", "Berlaku s.d.", "Perusahaan API-U", "No. LHVKI", "Dokumen LHVKI", "Bahan Baku"],
      rows: ds.partners.flatMap((p) => p.uses.map((u) => [p.name, p.nib, p.type, p.contractNumber, fd(p.contractEnd), u.company, u.lhvki, u.lhvkiPath ? "Ada" : "Belum ada", u.lines])) }],
    "8.5": () => [{ headers: ["API-U", "Alamat Gudang", "Kota", "Kepemilikan", "Kapasitas (analis)", "Stok (analis)", "Rencana Impor (analis)", "Keputusan Analis"],
      rows: ds.warehouses.map((w) => [w.company, w.place.address, w.place.city, w.place.ownership, w.capacity ?? "", w.analystStock ?? "", w.analystPlan ?? "", w.analystDecision]) }],
    "8.6": () => [{ headers: ["Perusahaan", "Modul Analisis", "Keputusan", "Kesimpulan"], rows: ds.analysis.map((a) => [a.company, a.module, a.status.label, a.conclusion]) }],
    "8.7": () => [{ headers: ["Perusahaan", "Nilai Impor (Rp)", "Modal Kerja (Rp)", "Keputusan Analis"],
      rows: [...ds.values.map((v) => [v.company, v.nilaiImpor ?? "", v.modalKerja ?? "", v.decision.label]), ...(ds.values.length > 1 ? [["Total", sum2(ds.values.map((v) => v.nilaiImpor)), sum2(ds.values.map((v) => v.modalKerja)), ""]] : [])] }],
    "8.8": () => [{ headers: ["API-U", "Sumber", "Area", "Temuan", "Severity", "Reporting Materiality", "Status", "PIC"], rows: ds.findings.map((f) => [f.company, f.source, f.area, f.text, f.severity, MATERIALITY_LABEL[materialityOf(report, f.key)], f.status.label, f.pic]) }],
    "8.9": () => [{ headers: ["Bagian", "Isi"], rows: [...industriConclusion(ds, report).flatMap((s) => s.paragraphs.map((p) => [s.title, p])), ["7. Catatan Project Manager", report.pmNote || "—"], ["Status laporan", report.status]] }],
  };
  return INDUSTRI_PARTS.filter(([no]) => parts.includes(no)).map(([no, title]) => ({
    no, title, ...(no === "8.2" ? { narrative: companyChapterNarrative(ds, "industri") } : {}), tables: build[no](),
  }));
}
