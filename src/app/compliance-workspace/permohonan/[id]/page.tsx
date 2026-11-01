import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildCaseSteps, buildSummary } from "@/modules/compliance-workspace/case-detail";
import { CaseDetailView } from "@/modules/compliance-workspace/components/case-detail/case-detail-view";
import { caseStepsOf } from "@/modules/compliance-workspace/requirements";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";
import { loadKonsumsiStage } from "@/modules/compliance-workspace/server/load-konsumsi";
import { loadLegalitasStage } from "@/modules/compliance-workspace/server/load-legalitas";
import { loadLokasiStage } from "@/modules/compliance-workspace/server/load-lokasi";

// Reads the database on every request — never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Case Detail — Compliance Workspace",
};

export default async function ComplianceCaseDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
}) {
  const { id } = await params;
  const { step } = await searchParams;
  const detail = await loadCaseDetail(id);
  if (!detail) notFound();

  const scheme = detail.row.scheme;
  const requested = Number(step);
  const current = Number.isInteger(requested) && requested >= 1 && requested <= caseStepsOf(scheme).length ? requested : 1;
  // Stage-specific data only for the stage on screen. VKI: 2 Legalitas, 3 Perpajakan, 4 Lokasi, 5–14 from detail.vki.
  const isVki = scheme === "vki";
  const legalitas = !isVki
    ? current === 2 ? await loadLegalitasStage(id) : null
    : current === 2 ? await loadLegalitasStage(id, "vki", ["Legalitas Perusahaan"]) : current === 3 ? await loadLegalitasStage(id, "vki", ["Perpajakan"]) : null;
  const lokasi = current === (isVki ? 4 : 3) ? await loadLokasiStage(id, scheme) : null;
  const konsumsi = !isVki && current >= 4 && current <= 8 ? await loadKonsumsiStage(id) : null;
  return (
    <CaseDetailView
      row={detail.row}
      steps={buildCaseSteps(detail)}
      current={current}
      summary={buildSummary(detail)}
      legalitas={legalitas}
      lokasi={lokasi}
      konsumsi={konsumsi}
      vki={isVki ? (detail.vki ?? null) : null}
    />
  );
}
