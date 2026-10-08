import { notFound } from "next/navigation";

import { LhviuCombinedReport } from "@/modules/project-manager-workspace/components/lhviu/lhviu-combined-report";

export default async function LhviuReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ type: string; applicationNumber: string; mode: string }>;
  searchParams: Promise<{ items?: string; order?: string }>;
}) {
  const { type, applicationNumber, mode } = await params;
  const { items, order } = await searchParams;
  if (mode !== "laporan-verifikasi" && mode !== "laporan-lengkap") notFound();
  return (
    <LhviuCombinedReport
      type={type}
      applicationNumber={applicationNumber}
      mode={mode}
      itemsParam={items ?? null}
      order={order === "verifikasi-first" ? "verifikasi-first" : "lhviu-first"}
    />
  );
}
