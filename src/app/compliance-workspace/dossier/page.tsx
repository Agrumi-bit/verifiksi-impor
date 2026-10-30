import type { Metadata } from "next";

import { DossierView } from "@/modules/compliance-workspace/components/dossier/dossier-view";
import { administrativeBlocker, buildDossier } from "@/modules/compliance-workspace/dossier";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";
import { loadComplianceCases } from "@/modules/compliance-workspace/server/load-cases";

// Reads the database on every request — never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Compliance Dossier — Compliance Workspace",
};

const NOT_DONE = { done: false, at: null, byName: null };

export default async function ComplianceDossierPage({ searchParams }: { searchParams: Promise<{ case?: string; q?: string }> }) {
  const { case: caseId, q = "" } = await searchParams;
  // Sequential on purpose: each loader already runs several queries.
  const detail = caseId ? await loadCaseDetail(caseId) : null;
  const rows = await loadComplianceCases();

  const query = q.trim().toLowerCase();
  const cases = rows
    .filter((row) => !query || `${row.applicationNumber} ${row.companyName}`.toLowerCase().includes(query))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((row) => ({
      applicationId: row.applicationId,
      applicationNumber: row.applicationNumber,
      companyName: row.companyName,
      category: row.category,
      ready: row.completedWorkspaces + (row.lhviuIssued ? 1 : 0),
    }));

  let selected = null;
  if (detail) {
    const sections = buildDossier(detail);
    selected = {
      row: detail.row,
      sections,
      records: {
        finalReviewDone: detail.administrative?.finalReview ?? NOT_DONE,
        dossierComplete: detail.administrative?.dossier ?? NOT_DONE,
      },
      blockers: {
        finalReviewDone: administrativeBlocker("finalReviewDone", detail, sections),
        dossierComplete: administrativeBlocker("dossierComplete", detail, sections),
      },
    };
  }

  return <DossierView cases={cases} q={q} selected={selected} />;
}
