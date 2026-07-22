import type { Metadata } from "next";

import { CompanyApplicationTable } from "@/modules/company-workspace/components/application-table";

export const metadata: Metadata = {
  title: "Application List — Company Workspace",
};

export default function CompanyApplicationsPage() {
  return <CompanyApplicationTable />;
}
