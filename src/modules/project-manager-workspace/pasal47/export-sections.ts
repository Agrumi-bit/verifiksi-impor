import { brandCertificateStatus, concentration, countryRows, currenciesOf, hsRows, lhviuStatus, trend, unitsOf, valueByHs, type Dimension } from "./derive";
import { fd, monthLabel, nf, sym } from "./format";
import { businessFlow, conclusionSections, MATERIALITY_LABEL, materialityOf } from "./summary";
import type { P47Dataset, P47Report } from "./types";

export type ExportTable = { title?: string; headers: string[]; rows: (string | number)[][] };
export type ExportSection = { no: string; title: string; tables: ExportTable[] };

export const EXPORT_PARTS: [string, string][] = [
  ["8.2", "API-U, KBLI & LHVIU"], ["8.3", "Komoditas & Pos Tarif/HS"], ["8.4", "Negara Asal"], ["8.5", "Merek & Importir"],
  ["8.6", "Pemilik Merek & Perwakilan Resmi"], ["8.7", "Persyaratan Teknis"], ["8.8", "Persediaan & Gudang"], ["8.9", "Nilai Impor & Modal Kerja"],
  ["8.10", "Konsentrasi Kebutuhan"], ["8.11", "Tren Rencana Kebutuhan Impor"], ["8.12", "Bisnis Proses"], ["8.13", "Temuan & Isu Material"], ["8.14", "Kesimpulan Pelaksanaan VIU"],
];

const DIMS: [Dimension, string][] = [["hs", "HS"], ["merek", "Merek"], ["negara", "Negara Asal"], ["perusahaan", "Perusahaan"]];

/** Every report section as plain tables — the one model behind both the Excel file and the print view. */
export function buildExportSections(ds: P47Dataset, report: P47Report, parts: string[]): ExportSection[] {
  const build: Record<string, () => ExportTable[]> = {
    "8.2": () => [{ headers: ["Perusahaan", "NIB", "KBLI Utama", "Nomor Permohonan", "Tanggal Pengajuan", "Kota Kantor", "Kepemilikan Kantor", "Kota Gudang", "LHVIU"],
      rows: ds.applications.map((a) => [a.company, a.nib, a.kbli.map((k) => k.code).join(", "), a.applicationNumber, fd(a.submittedAt), a.kantor?.city ?? "", a.kantor?.ownership ?? "", a.gudang.map((g) => g.city).join(", "), lhviuStatus(a).label]) }],
    "8.3": () => [{ headers: ["HS", "Uraian Barang", "Sub Kelompok", "Komoditas", "Jumlah API-U", "Product Line", "Rencana Kebutuhan", "Satuan"],
      rows: hsRows(ds.lines).map((r) => [r.hs, r.description, r.subKelompok, r.komoditas, r.companies, r.lines, Number.isNaN(r.quantity) ? "Satuan berbeda" : r.quantity, r.unit || r.units.join(" / ")]) }],
    "8.4": () => [{ headers: ["Negara", "Jumlah API-U", "Jumlah HS", "Jumlah Merek", "Relasi Product Line"], rows: countryRows(ds.lines).map((r) => [r.country, r.companies, r.hs, r.brands, r.lines]) }],
    "8.5": () => [{ headers: ["Merek", "Pemilik Merek", "Perusahaan API-U", "Peran", "Status Dokumen"], rows: ds.brands.flatMap((b) => b.uses.map((u) => [b.name, b.owner, u.company, u.role, u.docStatus.label])) }],
    "8.6": () => [{ headers: ["Merek", "Pemilik", "Negara Pemilik", "Perwakilan Resmi", "Jenis Bukti Merek", "No. Sertifikat", "Tanggal Terbit", "Tanggal Kedaluwarsa", "Status"],
      rows: ds.brands.map((b) => [b.name, b.owner, b.ownerCountry, b.representative, b.evidenceType, b.registrationNumber, fd(b.registrationDate), fd(b.expiryDate), brandCertificateStatus(b, ds.period.to).label]) }],
    "8.7": () => [{ headers: ["Perusahaan", "Merek", "Sub Kelompok", "Laboratorium", "No. Test Report", "Tanggal Terbit", "Berlaku Sampai", "Label Bahasa Indonesia", "Status"],
      rows: ds.technical.map((t) => [t.company, t.brandName, t.subKelompok, t.laboratory, t.reportNumber, fd(t.issueDate), fd(t.validUntil), t.labelStatement.label, t.status.label]) }],
    "8.8": () => [{ headers: ["API-U", "Alamat Gudang", "Kota", "Kepemilikan", "Kapasitas (analis)", "Stok (analis)", "Stok Dilaporkan", "Keputusan Analis"],
      rows: ds.warehouses.map((w) => [w.company, w.place.address, w.place.city, w.place.ownership, w.capacity ?? "", w.analystStock ?? "", Object.entries(w.declaredStock).map(([u, q]) => `${nf(q)} ${u}`).join("; "), w.analystDecision]) }],
    "8.9": () => [
      { title: "Per perusahaan", headers: ["Perusahaan", "Currency", "Nilai Rencana Impor", "Modal Kerja (Rp)", "Kurs (Rp)", "Keputusan Analis"], rows: ds.values.map((v) => [v.company, v.currency, Math.round(v.plan), v.modalKerja ?? "", v.rate ?? "", v.decision.label]) },
      ...currenciesOf(ds.lines).map((c) => ({ title: `Per HS (${c})`, headers: ["HS", "Uraian", "Nilai", "Share", "Kuantitas", "Satuan", `Harga Satuan (${sym(c)})`], rows: valueByHs(ds.lines, c).map((r) => [r.hs, r.description, Math.round(r.value), `${(r.share * 100).toFixed(1)}%`, Number.isNaN(r.quantity) ? "" : r.quantity, r.unit, r.price === null ? "" : Number(r.price.toFixed(2))]) })),
    ],
    "8.10": () => DIMS.map(([d, l]) => { const c = concentration(ds.lines, d, 10); return { title: l, headers: ["Peringkat", l, "Jumlah", "Share"], rows: c.items.map((i, n) => [n + 1, i.label, i.v, `${((i.v / (c.total || 1)) * 100).toFixed(1)}%`]) }; }),
    "8.11": () => unitsOf(ds.lines).map((u) => { const t = trend(ds.lines, ds.applications, ds.period, u, "bulanan"); return { title: `Satuan ${u}`, headers: ["Bulan", `Rencana Kebutuhan (${u})`], rows: t.months.map((m, i) => [monthLabel(m), t.series[0].values[i]]) }; }),
    "8.12": () => [{ headers: ["Merek", "Pemilik Merek", "Perwakilan Resmi", "Importir / API-U", "Gudang", "Distribusi", "Retail / Marketplace", "Konsumen"], rows: ds.brands.map((b) => [b.name, ...businessFlow(b, ds).map((n) => n.status.label)]) }],
    "8.13": () => [{ headers: ["API-U", "Sumber", "Area", "Temuan", "Severity", "Reporting Materiality", "Status", "PIC"], rows: ds.findings.map((f) => [f.company, f.source, f.area, f.text, f.severity, MATERIALITY_LABEL[materialityOf(report, f.key)], f.status.label, f.pic]) }],
    "8.14": () => [{ headers: ["Bagian", "Isi"], rows: [...conclusionSections(ds, report).flatMap((s) => s.paragraphs.map((p) => [s.title, p])), ["7. Catatan Project Manager", report.pmNote || "—"], ["Status laporan", report.status]] }],
  };
  return EXPORT_PARTS.filter(([no]) => parts.includes(no)).map(([no, title]) => ({ no, title, tables: build[no]() }));
}
