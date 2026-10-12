"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MUTED_2 } from "@/modules/verifikator-workspace/components/report/document-verification-report";
import { ChapterReportView, type ChapterReportMeta } from "../engine/report-view";
import { resolvePeriod, type ReportingPeriod } from "../../derive";
import type { P47Report } from "../../types";
import { nonIndustriReport, SUBJECT } from "../report";
import type { NonIndustriDataset } from "../types";

export const NON_INDUSTRI_REPORT_META = (period: ReportingPeriod): ChapterReportMeta => ({
  title: "Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Non Industri",
  footer: "Laporan Pelaksanaan VIU Bahan Baku Non Industri — Pelaporan Pasal 47",
  approvalSubject: `Verifikasi Importir Umum (VIU) ${SUBJECT}`,
  coverTitle: "Laporan Pelaksanaan VIU",
  coverSubject: ["Bahan Baku/Penolong", "Perusahaan Non Industri"],
  docNumber: `LP47/VIU-NI/${period.key}`,
  topbarTitle: "Laporan Pelaksanaan VIU Non Industri",
  introHeading: "Pendahuluan Laporan Pelaksanaan VIU",
  introSub: SUBJECT,
  pdfScheme: "non-industri",
  appendix: [
    "Permohonan dimasukkan ke periode laporan menurut Tanggal Terbit LHVIU yang dicatat Project Manager, atau Tanggal Pengajuan bila belum dicatat; draf dan permohonan yang ditarik tidak dihitung.",
    "Data perusahaan, KBLI dan lokasi diambil dari profil perusahaan; bahan baku/penolong, pos tarif, rencana kebutuhan dan peruntukan dari Product Information permohonan.",
    "Luas, kapasitas gudang dan kesimpulan lapangan dari laporan survei; kebutuhan mitra, kapasitas gudang, nilai impor dan keputusan modul dari Analisis Teknis.",
    "Modal kerja dari Surat Pernyataan Kepemilikan Modal Kerja; bukti kemampuan finansial dari dokumen pendukung permohonan.",
    "Temuan berasal dari survei lapangan, verifikasi dokumen, verifikasi produk dan analisis teknis; materialitas ditetapkan Project Manager.",
    "Kuantitas tidak dijumlahkan lintas satuan. Harga, negara asal, identitas terstruktur mitra non industri dan realisasi impor belum tersedia pada sistem.",
  ],
});

/** Printable Laporan Pelaksanaan VIU – Bahan Baku/Penolong Perusahaan Non Industri (Pelaporan Pasal 47). */
export function NonIndustriReport({ periodKey }: { periodKey: string | null }) {
  const period: ReportingPeriod = resolvePeriod(periodKey, new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "pasal47", "non-industri", period.from, period.to],
    queryFn: async () => {
      const res = await fetch(`/api/project-manager-workspace/pelaporan-pasal-47/non-industri?from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      return ((await res.json()) as { data: { dataset: NonIndustriDataset; report: P47Report } }).data;
    },
  });
  const backHref = `/project-manager-workspace/viu/non-industri/laporan-kemenperin?periode=${period.key}&halaman=kesimpulan`;

  if (isLoading) return <div style={{ padding: 32, textAlign: "center", color: MUTED_2 }}>Menyusun laporan…</div>;
  if (isError || !data) return <div style={{ padding: 32, textAlign: "center", color: "#7a1f14" }}>Laporan gagal dimuat. <Link href={backHref}>Kembali</Link></div>;
  return <ChapterReportView model={nonIndustriReport(data.dataset, data.report)} report={data.report} period={period} backHref={backHref} generatedAt={data.dataset.generatedAt} meta={NON_INDUSTRI_REPORT_META(period)} />;
}
