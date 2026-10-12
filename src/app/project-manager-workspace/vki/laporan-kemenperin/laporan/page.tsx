import type { Metadata } from "next";

import { VkiReport } from "@/modules/project-manager-workspace/pasal47/vki/components/vki-report";

export const metadata: Metadata = {
  title: "Laporan Pelaksanaan VKI — Project Manager Workspace",
};

/** Printable Laporan Pelaksanaan VKI (Pelaporan Pasal 47), one reporting period (?periode=YYYY-YYYY). */
export default async function VkiReportPage({ searchParams }: { searchParams: Promise<{ periode?: string }> }) {
  const { periode } = await searchParams;
  return <VkiReport periodKey={periode ?? null} />;
}
