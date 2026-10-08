import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pasal47Report } from "@/modules/project-manager-workspace/pasal47/components/pasal47-report";

export const metadata: Metadata = {
  title: "Laporan Pelaksanaan VIU Barang Konsumsi — Project Manager Workspace",
};

/** Printable Laporan Pelaksanaan VIU (Pelaporan Pasal 47) — VIU Konsumsi only, one reporting period (?periode=YYYY-YYYY). */
export default async function Pasal47ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheme: string }>;
  searchParams: Promise<{ periode?: string }>;
}) {
  const { scheme } = await params;
  if (scheme !== "konsumsi") notFound();
  const { periode } = await searchParams;
  return <Pasal47Report periodKey={periode ?? null} />;
}
