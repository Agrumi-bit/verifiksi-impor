import type { Metadata } from "next";

import { TechnicalAnalystDashboard } from "@/modules/technical-analyst-workspace/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Technical Analyst Workspace",
};

export default function TechnicalAnalystDashboardPage() {
  return <TechnicalAnalystDashboard />;
}
