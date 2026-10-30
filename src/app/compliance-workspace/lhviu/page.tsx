import type { Metadata } from "next";

import { LhviuView } from "@/modules/compliance-workspace/components/lhviu/lhviu-view";
import { lhviuValidity } from "@/modules/compliance-workspace/dossier";
import { loadIssuedLhviu } from "@/modules/compliance-workspace/server/load-lhviu";

export const metadata: Metadata = {
  title: "LHVIU & Final Output — Compliance Workspace",
};

/** Today's calendar day in Jakarta (YYYY-MM-DD). */
function todayInJakarta(): string {
  return new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10);
}

export default async function ComplianceLhviuPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim().toLowerCase();
  const today = todayInJakarta();
  const rows = (await loadIssuedLhviu())
    .filter((item) => !query || `${item.number} ${item.applicationNumber} ${item.companyName} ${item.nib}`.toLowerCase().includes(query))
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .map((item) => ({ ...item, ...lhviuValidity(item.issuedAt, today) }));

  return <LhviuView rows={rows} q={q} />;
}
