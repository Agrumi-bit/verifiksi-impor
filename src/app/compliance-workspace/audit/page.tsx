import type { Metadata } from "next";

import { AUDIT_TABS, AuditView, type AuditTab } from "@/modules/compliance-workspace/components/audit/audit-view";
import { loadCaseDetail } from "@/modules/compliance-workspace/server/load-case-detail";
import { loadComplianceCases } from "@/modules/compliance-workspace/server/load-cases";
import { TRAIL_LIMIT, loadHistory, loadTrail } from "@/modules/compliance-workspace/server/load-traceability";
import { buildLineage } from "@/modules/compliance-workspace/traceability";

// Reads the database on every request — never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Audit & Traceability — Compliance Workspace",
};

export default async function ComplianceAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; case?: string; ws?: string }>;
}) {
  const params = await searchParams;
  const tab: AuditTab = (AUDIT_TABS as readonly string[]).includes(params.tab ?? "") ? (params.tab as AuditTab) : "trail";
  const caseId = params.case ?? "";

  // Sequential on purpose: only the selected tab's data is loaded, one loader at a time.
  const trail = tab === "trail" ? await loadTrail(caseId || undefined) : [];
  const history = tab === "history" ? await loadHistory(caseId || undefined) : [];
  const detail = tab === "lineage" && caseId ? await loadCaseDetail(caseId) : null;
  const cases = (await loadComplianceCases())
    .map(({ applicationId, applicationNumber, companyName }) => ({ applicationId, applicationNumber, companyName }))
    .sort((a, b) => a.applicationNumber.localeCompare(b.applicationNumber));

  return (
    <AuditView
      tab={tab}
      caseId={detail || tab !== "lineage" ? caseId : ""}
      ws={params.ws ?? ""}
      cases={cases}
      trail={trail}
      trailLimited={!caseId && trail.length >= TRAIL_LIMIT}
      lineage={detail ? buildLineage(detail) : []}
      history={history}
    />
  );
}
