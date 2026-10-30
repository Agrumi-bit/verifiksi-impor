import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildCaseSteps } from "@/modules/compliance-workspace/case-detail";
import { CaseDetailView } from "@/modules/compliance-workspace/components/case-detail/case-detail-view";
import { CASE_STEP_COUNT } from "@/modules/compliance-workspace/requirements";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";

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

  const requested = Number(step);
  const current = Number.isInteger(requested) && requested >= 1 && requested <= CASE_STEP_COUNT ? requested : 1;
  return <CaseDetailView row={detail.row} steps={buildCaseSteps(detail)} current={current} />;
}
