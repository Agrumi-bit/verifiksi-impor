import type { Metadata } from "next";

import { CompanyDashboard } from "@/modules/company-workspace/components/dashboard";

export const metadata: Metadata = {
  title: "Dashboard — Company Workspace",
};

export default function CompanyWorkspaceDashboardPage() {
  return <CompanyDashboard />;
}
