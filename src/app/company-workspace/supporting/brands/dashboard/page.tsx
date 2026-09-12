import type { Metadata } from "next";

import { CompanyMerkDashboard } from "@/modules/merk/components/management/company-dashboard";

export const metadata: Metadata = {
  title: "Dashboard Merek — Company Workspace",
};

export default function CompanyMerkDashboardPage() {
  return <CompanyMerkDashboard />;
}
