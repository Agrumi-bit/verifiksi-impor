import { brandCertificateStatus, currenciesOf, hsRows, lhviuStatus, valueByHs } from "./derive";
import { countBy, fdLong, money, status, sum, topN, uniq } from "./format";
import type { Materiality, P47Brand, P47Dataset, P47Report, Status } from "./types";

export const MATERIALITY_LABEL: Record<Materiality, string> = { MATERIAL: "Material", NON_MATERIAL: "Non-Material", NEEDS_REVIEW: "Needs Review" };
export const materialityOf = (report: P47Report, key: string): Materiality => report.materiality[key] ?? "NEEDS_REVIEW";

export function kpis(ds: P47Dataset, report: P47Report) {
  return {
    companies: uniq(ds.applications.map((a) => a.companyId ?? a.company)).length,
    applications: ds.applications.length,
    lhviu: ds.applications.filter((a) => a.lhviu).length,
    hs: uniq(ds.lines.map((l) => l.hs)).length,
    brands: uniq(ds.lines.map((l) => l.brandId)).length,
    countries: uniq(ds.lines.flatMap((l) => l.countries)).length,
    lines: ds.lines.length,
    relations: sum(ds.lines.map((l) => l.countries.length)),
    findings: ds.findings.length,
    material: ds.findings.filter((f) => materialityOf(report, f.key) === "MATERIAL").length,
  };
}

export type Alert = { tone: "warn" | "bad" | "na"; text: string };

/** Data-quality warnings to settle before the report is final — each counted from the data itself. */
export function dataQualityAlerts(ds: P47Dataset): Alert[] {
  const alerts: Alert[] = [];
  const noLhviu = ds.applications.filter((a) => lhviuStatus(a).label === "Belum Diunggah").length;
  if (noLhviu) alerts.push({ tone: "warn", text: `${noLhviu} permohonan selesai belum memiliki file LHVIU.` });
  const multi = ds.lines.filter((l) => l.countries.length > 1).length;
  if (multi) alerts.push({ tone: "warn", text: `${multi} product line memiliki lebih dari satu negara asal tanpa alokasi kuantitas.` });
  const expired = ds.technical.filter((t) => t.status.label === "Kedaluwarsa").length;
  if (expired) alerts.push({ tone: "bad", text: `${expired} sertifikat hasil uji mutu telah kedaluwarsa pada akhir periode.` });
  const brandBad = ds.brands.filter((b) => brandCertificateStatus(b, ds.period.to).tone === "bad").length;
  if (brandBad) alerts.push({ tone: "bad", text: `${brandBad} merek dengan bukti merek tidak lengkap atau kedaluwarsa.` });
  const noCapacity = ds.warehouses.filter((w) => w.capacity === null).length;
  if (noCapacity) alerts.push({ tone: "warn", text: `${noCapacity} gudang belum memiliki data kapasitas dari analisis teknis.` });
  const noUnit = ds.lines.filter((l) => !l.unit).length;
  if (noUnit) alerts.push({ tone: "warn", text: `${noUnit} product line tanpa satuan; kuantitasnya tidak ikut dijumlahkan.` });
  alerts.push({ tone: "na", text: "Data realisasi impor aktual dan distribusi hilir belum tersedia pada sistem." });
  return alerts;
}

export type FlowNode = { title: string; status: Status; source: string; entity: string; note: string };

/** Pemilik Merek → … → Konsumen for one brand. Downstream steps are never shown as verified: the system holds no data for them. */
export function businessFlow(brand: P47Brand, ds: P47Dataset): FlowNode[] {
  const apps = ds.applications.filter((a) => brand.uses.some((u) => u.applicationId === a.id));
  const ware = ds.warehouses.filter((w) => apps.some((a) => a.id === w.applicationId));
  const cert = brandCertificateStatus(brand, ds.period.to);
  const usesOk = brand.uses.length > 0 && brand.uses.every((u) => u.docStatus.tone === "ok");
  const na: Status = status("Data Not Available", "na");
  return [
    { title: "Pemilik Merek", status: brand.owner && cert.tone !== "bad" ? status("Verified", "ok") : status("Partial Data", "warn"), source: "Merek Management, bukti merek", entity: brand.owner ? `${brand.owner}${brand.ownerCountry ? ` (${brand.ownerCountry})` : ""}` : "Belum diisi", note: `Bukti merek: ${cert.label}.` },
    { title: "Perwakilan Resmi", status: brand.representative ? (usesOk ? status("Verified", "ok") : status("Partial Data", "warn")) : status("Tidak Berlaku", "na"), source: "Kepemilikan & perwakilan merek", entity: brand.representative || "Tidak ada perwakilan resmi", note: brand.representative ? "Dokumen hubungan merek mengikuti status verifikasi dokumen." : "Merek tidak memakai perwakilan resmi." },
    { title: "Importir / API-U", status: apps.length && apps.every((a) => a.lhviu) ? status("Verified", "ok") : apps.length ? status("Partial Data", "warn") : na, source: "Permohonan VIU, LHVIU", entity: uniq(apps.map((a) => a.company)).join(", ") || "—", note: `${apps.filter((a) => a.lhviu).length} dari ${apps.length} permohonan sudah memiliki LHVIU.` },
    { title: "Gudang", status: ware.length && ware.every((w) => w.capacity !== null) ? status("Verified", "ok") : ware.length ? status("Partial Data", "warn") : na, source: "Lokasi gudang, analisis teknis", entity: ware.map((w) => w.place.city || w.place.address).filter(Boolean).join(", ") || "—", note: "Alamat dari permohonan; kapasitas dari modul Kapasitas Gudang analis." },
    { title: "Distribusi", status: na, source: "Belum ada sumber data", entity: "—", note: "Sistem tidak menyimpan data distribusi hilir." },
    { title: "Retail / Marketplace", status: na, source: "Belum ada sumber data", entity: "—", note: "Tidak ada data kanal penjualan." },
    { title: "Konsumen", status: na, source: "Belum ada sumber data", entity: "—", note: "Hilir rantai tidak diverifikasi oleh VIU." },
  ];
}

/** The draft conclusion — sentences built only from counted figures. */
export function conclusionSections(ds: P47Dataset, report: P47Report): { title: string; paragraphs: string[] }[] {
  const k = kpis(ds, report);
  const hs = hsRows(ds.lines).sort((a, b) => b.lines - a.lines).slice(0, 2);
  const techOk = ds.technical.filter((t) => t.status.tone === "ok").length;
  const sev = countBy(ds.findings, (f) => f.severity);
  const brandsOk = ds.brands.filter((b) => b.uses.length && b.uses.every((u) => u.docStatus.tone === "ok")).length;
  const values = currenciesOf(ds.lines).map((c) => `${money(c, sum(valueByHs(ds.lines, c).map((r) => r.value)))} (${c})`);
  const topArea = topN(countBy(ds.findings.filter((f) => materialityOf(report, f.key) === "MATERIAL"), (f) => f.area), 3).map(([a, n]) => `${a} (${n})`);
  return [
    { title: "1. Ringkasan Pelaksanaan", paragraphs: [`Pada periode ${fdLong(ds.period.from)} – ${fdLong(ds.period.to)} terdapat ${k.applications} permohonan VIU Barang Konsumsi dari ${k.companies} perusahaan API-U, dengan ${k.lhviu} LHVIU telah diterbitkan. Permohonan mencakup ${k.hs} pos tarif/HS, ${k.brands} merek, dan ${k.lines} product line dari ${k.countries} negara asal.`] },
    { title: "2. Isu Utama", paragraphs: [k.findings ? `Terdapat ${k.findings} temuan (Minor ${sev.get("Minor") ?? 0}, Major ${sev.get("Major") ?? 0}, Critical ${sev.get("Critical") ?? 0}); ${k.material} ditetapkan material oleh Project Manager${topArea.length ? `, terutama pada ${topArea.join(", ")}` : ""}.` : "Tidak ada temuan pada periode ini."] },
    { title: "3. Kondisi Kepatuhan Dokumen", paragraphs: [`${techOk} dari ${ds.technical.length} sertifikat hasil uji mutu lengkap. Dokumen hubungan merek valid untuk ${brandsOk} dari ${ds.brands.length} merek.`] },
    { title: "4. Gambaran Kebutuhan Impor", paragraphs: [hs.length ? `Kebutuhan terbanyak pada ${hs.map((h) => `${h.hs} (${h.komoditas || h.subKelompok || h.description})`).join(" dan ")}. Nilai rencana impor: ${values.join("; ") || "—"}. Nilai dan kuantitas dilaporkan per currency dan per satuan.` : "Belum ada product line pada periode ini."] },
    { title: "5. Catatan Keterbatasan Data", paragraphs: dataQualityAlerts(ds).map((a) => a.text) },
    { title: "6. Kesimpulan", paragraphs: [k.material ? `Pelaksanaan VIU periode ini memiliki ${k.material} isu material yang perlu ditindaklanjuti sebelum laporan disampaikan kepada Kementerian Perindustrian.` : "Belum ada temuan yang ditetapkan material; Project Manager perlu menelaah materialitas temuan sebelum laporan disetujui."] },
  ];
}
