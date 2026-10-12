"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

import { MUTED_2 } from "@/modules/verifikator-workspace/components/report/document-verification-report";
import { ChapterReportView, type ChapterReportMeta } from "../engine/report-view";
import { resolvePeriod, type ReportingPeriod } from "../../derive";
import type { P47Report } from "../../types";
import { vkiReport } from "../report";
import type { VkiDataset } from "../types";

export const VKI_REPORT_META = (period: ReportingPeriod): ChapterReportMeta => ({
  title: "Laporan Pelaksanaan Verifikasi Kemampuan Industri (VKI)",
  footer: "Laporan Pelaksanaan VKI — Pelaporan Pasal 47",
  approvalSubject: "Verifikasi Kemampuan Industri (VKI) terhadap Perusahaan API-P atau Perusahaan Industri",
  coverTitle: "Laporan Pelaksanaan VKI",
  coverSubject: ["Verifikasi Kemampuan", "Industri"],
  docNumber: `LP47/VKI/${period.key}`,
  topbarTitle: "Laporan Pelaksanaan VKI",
  introHeading: "Pendahuluan Laporan Pelaksanaan VKI",
  introSub: "Perusahaan API-P/Perusahaan Industri — Tekstil dan Produk Tekstil",
  pdfScheme: "vki",
  appendix: [
    "Permohonan dimasukkan ke periode laporan menurut Tanggal Terbit LHVKI yang dicatat Project Manager pada tab LHVKI, atau Tanggal Pengajuan bila belum dicatat; draf dan permohonan yang ditarik tidak dihitung.",
    "Data perusahaan, KBLI dan lokasi diambil dari profil perusahaan; produk, kapasitas terpasang, produksi, bahan baku, rencana impor, mesin, tenaga kerja, listrik dan penjualan dari data permohonan VKI.",
    "Kesimpulan lapangan dari laporan survei; keputusan energi listrik, kapasitas produksi dan kebutuhan bahan baku dari Analisis Teknis.",
    "Temuan berasal dari survei lapangan, verifikasi dokumen, verifikasi produk dan analisis teknis; materialitas ditetapkan Project Manager.",
    "Kuantitas tidak dijumlahkan lintas satuan. Negara asal impor dan negara tujuan ekspor ditulis bebas oleh perusahaan. Realisasi impor belum tersedia pada sistem.",
  ],
});

/** Printable Laporan Pelaksanaan VKI (Pelaporan Pasal 47). */
export function VkiReport({ periodKey }: { periodKey: string | null }) {
  const period: ReportingPeriod = resolvePeriod(periodKey, new Date());
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-manager-workspace", "pasal47", "vki", period.from, period.to],
    queryFn: async () => {
      const res = await fetch(`/api/project-manager-workspace/pelaporan-pasal-47/vki?from=${period.from}&to=${period.to}`);
      if (!res.ok) throw new Error("Gagal memuat laporan");
      return ((await res.json()) as { data: { dataset: VkiDataset; report: P47Report } }).data;
    },
  });
  const backHref = `/project-manager-workspace/vki/laporan-kemenperin?periode=${period.key}&halaman=kesimpulan`;

  if (isLoading) return <div style={{ padding: 32, textAlign: "center", color: MUTED_2 }}>Menyusun laporan…</div>;
  if (isError || !data) return <div style={{ padding: 32, textAlign: "center", color: "#7a1f14" }}>Laporan gagal dimuat. <Link href={backHref}>Kembali</Link></div>;
  return <ChapterReportView model={vkiReport(data.dataset, data.report)} report={data.report} period={period} backHref={backHref} generatedAt={data.dataset.generatedAt} meta={VKI_REPORT_META(period)} />;
}
