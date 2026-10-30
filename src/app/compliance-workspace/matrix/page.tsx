import type { Metadata } from "next";

import { MatrixView } from "@/modules/compliance-workspace/components/matrix/matrix-view";
import { buildMatrix, matrixSummary } from "@/modules/compliance-workspace/matrix";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";
import { loadComplianceCases } from "@/modules/compliance-workspace/server/load-cases";

export const metadata: Metadata = {
  title: "Compliance Matrix — Compliance Workspace",
};

export default async function ComplianceMatrixPage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: caseId } = await searchParams;
  // Sequential on purpose: each loader already runs several queries.
  const detail = caseId ? await loadCaseDetail(caseId) : null;
  const cases = await loadComplianceCases();
  const options = cases
    .map(({ applicationId, applicationNumber, companyName }) => ({ applicationId, applicationNumber, companyName }))
    .sort((a, b) => a.applicationNumber.localeCompare(b.applicationNumber));
  const matrix = detail ? buildMatrix(detail, detail.assignees ?? {}) : [];

  return <MatrixView cases={options} row={detail?.row ?? null} matrix={matrix} summary={matrixSummary(matrix)} />;
}
