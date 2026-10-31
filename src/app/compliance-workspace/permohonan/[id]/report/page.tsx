import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ComplianceReportView } from "@/modules/compliance-workspace/components/report/compliance-report";
import { buildComplianceReport } from "@/modules/compliance-workspace/report";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";
import { loadKonsumsiStage } from "@/modules/compliance-workspace/server/load-konsumsi";
import { loadLegalitasStage } from "@/modules/compliance-workspace/server/load-legalitas";
import { loadLokasiStage } from "@/modules/compliance-workspace/server/load-lokasi";

// Reads the database on every request — never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Laporan Hasil Compliance — Compliance Workspace",
};

export default async function ComplianceReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await loadCaseDetail(id);
  if (!detail) notFound();
  const [legalitas, lokasi, konsumsi] = await Promise.all([loadLegalitasStage(id), loadLokasiStage(id), loadKonsumsiStage(id)]);
  const report = buildComplianceReport({ detail, legalitas, lokasi, konsumsi, generatedAt: new Date().toISOString() });
  return <ComplianceReportView report={report} />;
}
