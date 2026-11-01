import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildCaseSteps, buildSummary } from "@/modules/compliance-workspace/case-detail";
import { CaseDetailView } from "@/modules/compliance-workspace/components/case-detail/case-detail-view";
import { caseStepsOf } from "@/modules/compliance-workspace/requirements";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";
import { loadKonsumsiStage } from "@/modules/compliance-workspace/server/load-konsumsi";
import { loadLegalitasStage } from "@/modules/compliance-workspace/server/load-legalitas";
import { outputContent, outputDeadlines } from "@/modules/compliance-workspace/output-review";
import { loadLokasiStage } from "@/modules/compliance-workspace/server/load-lokasi";

// Reads the database on every request — never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Case Detail — Compliance Workspace",
};

/** Today's calendar day in Jakarta (YYYY-MM-DD). */
function todayInJakarta(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

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
  // Last stage (LHVKI / LHVIU): the output's minimum content and the time limits of Permenperin 27/2025.
  const outputReview =
    current === caseStepsOf(scheme).length
      ? await Promise.all([
          isVki ? loadLegalitasStage(id, "vki", ["Legalitas Perusahaan"]) : loadLegalitasStage(id),
          loadLokasiStage(id, scheme),
          isVki ? null : loadKonsumsiStage(id),
        ]).then(([company, locations, products]) => {
          const review = { detail, company: company?.company ?? null, lokasi: locations, vki: detail.vki ?? null, konsumsi: products, today: todayInJakarta() };
          return { content: outputContent(review), deadlines: outputDeadlines(review), scheme };
        })
      : null;
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
      outputReview={outputReview}
    />
  );
}
