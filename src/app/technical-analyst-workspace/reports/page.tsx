import type { Metadata } from "next";

import { ReportsTable } from "@/modules/technical-analyst-workspace/components/reports-table";

export const metadata: Metadata = {
  title: "Reports — Technical Analyst Workspace",
};

export default function TechnicalAnalystReportsPage() {
  return <ReportsTable />;
}
