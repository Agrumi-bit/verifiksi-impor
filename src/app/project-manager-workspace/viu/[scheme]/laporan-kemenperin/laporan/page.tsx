import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Pasal47Report } from "@/modules/project-manager-workspace/pasal47/components/pasal47-report";
import { IndustriReport } from "@/modules/project-manager-workspace/pasal47/industri/components/industri-report";

export const metadata: Metadata = {
  title: "Laporan Pelaksanaan VIU — Project Manager Workspace",
};

/** Printable Laporan Pelaksanaan VIU (Pelaporan Pasal 47) — VIU Konsumsi and VIU Industri, one reporting period (?periode=YYYY-YYYY). */
export default async function Pasal47ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ scheme: string }>;
  searchParams: Promise<{ periode?: string }>;
}) {
  const { scheme } = await params;
  if (scheme !== "konsumsi" && scheme !== "industri") notFound();
  const { periode } = await searchParams;
  return scheme === "industri" ? <IndustriReport periodKey={periode ?? null} /> : <Pasal47Report periodKey={periode ?? null} />;
}
