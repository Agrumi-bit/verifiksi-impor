import type { Metadata } from "next";

import { DashboardView } from "@/modules/compliance-workspace/components/dashboard/dashboard-view";
import { casesNeedingAttention, summarizeDashboard } from "@/modules/compliance-workspace/dashboard";
import { loadFindings } from "@/modules/compliance-workspace/server/findings";
import { loadComplianceCases } from "@/modules/compliance-workspace/server/load-cases";
import { loadTrail } from "@/modules/compliance-workspace/server/load-traceability";

// Reads the database on every request — never prerendered at build time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Dashboard — Compliance Workspace",
};

const RECENT_ACTIVITY = 8;

export default async function ComplianceWorkspacePage() {
  // Sequential on purpose: each loader already runs several queries.
  const cases = await loadComplianceCases();
  const findings = await loadFindings();
  const activity = (await loadTrail()).slice(0, RECENT_ACTIVITY);

  return <DashboardView summary={summarizeDashboard(cases, findings)} attention={casesNeedingAttention(cases)} activity={activity} />;
}
